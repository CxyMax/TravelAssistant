"""旅行规划服务:持有编译好的图、各节点回调、MCP 工具与交互式会话存储。

- plan_trip:跑整张图,生成初始计划,并把候选池 + 计划缓存为一个 TripSession。
- refine:基于 session 的候选池做"重新规划"(默认),仅当 router 判定需要新候选时
  才重跑对应专家(escalate),最后只跑 planner。复用昂贵的搜索,几十秒内返回。
"""

from typing import Tuple

from backend.agents.graph import build_graph
from backend.agents.planner import make_planner_node
from backend.agents.router import make_refine_router
from backend.agents.specialists import (
    make_attraction_node,
    make_hotel_node,
    make_meal_node,
    make_weather_node,
)
from backend.agents.session import SessionStore, TripSession, new_session_id
from backend.agents.state import TripState
from backend.config import make_llm
from backend.services.mcp_tools import AmapToolProvider
from backend.schemas import RouterDecision, SplitterOutput, TripPlan, TripRequest


class TripPlannerService:
    """封装 LLM、MCP 工具、LangGraph 图与交互式会话的生命周期。"""

    def __init__(self) -> None:
        self._provider = AmapToolProvider()
        self._llm = None
        self._graph = None
        # 交互式微调需要单独持有各节点回调(在图之外按需调用)
        self._planner_node = None
        self._specialist_nodes = {}
        self._router = None
        self._sessions = SessionStore()

    @classmethod # 异步初始化？
    async def create(cls) -> "TripPlannerService":
        """异步初始化(启动 MCP server、编译图、构建可单独调用的节点)。"""
        service = cls()
        service._llm = make_llm(temperature=0.3)
        await service._provider.startup()
        service._graph = build_graph(service._llm, service._provider)
        # 同一 llm+provider 复用:供 refine 时按需单独调用
        service._planner_node = make_planner_node(service._llm)
        service._specialist_nodes = {
            "attraction": make_attraction_node(service._llm, service._provider),
            "hotel": make_hotel_node(service._llm, service._provider),
            "meal": make_meal_node(service._llm, service._provider),
            "weather": make_weather_node(service._llm, service._provider),
        }
        service._router = make_refine_router(service._llm)
        print("✅ TripPlannerService 初始化完成")
        return service

    async def plan_trip(self, request: TripRequest) -> Tuple[str, TripPlan]:
        """运行多智能体图,生成旅行计划,并缓存为会话。返回 (session_id, plan)。"""
        if self._graph is None:
            raise RuntimeError("服务尚未初始化,请先调用 create()")

        initial: TripState = {"request": request}
        final_state = await self._graph.ainvoke(initial)
        plan = final_state.get("trip_plan")
        if plan is None:
            raise RuntimeError("规划图未产出 trip_plan")

        session = TripSession(
            id=new_session_id(),
            request=request,
            plan_brief=final_state.get("plan_brief"),
            attractions=final_state.get("attractions") or [],
            hotels=final_state.get("hotels") or [],
            meals=final_state.get("meals") or [],
            weather_info=final_state.get("weather_info") or [],
            plan=plan,
        )
        self._sessions.create(session)
        return session.id, plan

    async def refine(self, session_id: str, feedback: str) -> TripPlan:
        """基于会话候选池微调行程。返回新的 plan;会话不存在时抛 KeyError。"""
        session = self._sessions.get(session_id)
        if session is None:
            raise KeyError(session_id)

        pool_sizes = {
            "attraction": len(session.attractions),
            "hotel": len(session.hotels),
            "meal": len(session.meals),
        }
        decision: RouterDecision = await self._router(
            feedback, session.plan, session.constraints, pool_sizes
        )
        session.add_constraints(decision.constraints)
        print(
            f"🔀 refine 决策: 重搜={decision.research or '无(仅重排)'} "
            f"约束+={decision.constraints}"
        )

        # 按需重搜:只跑被点名的专家,替换候选池对应切片
        if decision.research:
            await self._research(session, decision)

        # 只跑 planner:候选池 + 累积约束 + 本轮反馈(不污染原始 request)
        refine_request = self._request_with_feedback(session.request, feedback)
        planner_state: TripState = {
            "request": refine_request,
            "attractions": session.attractions,
            "hotels": session.hotels,
            "meals": session.meals,
            "weather_info": session.weather_info,
            "constraints": session.constraints,
        }
        result = await self._planner_node(planner_state)
        plan = result.get("trip_plan")
        if plan is None:
            raise RuntimeError("规划器未产出 trip_plan")
        session.plan = plan
        return plan

    async def _research(self, session: TripSession, decision: RouterDecision) -> None:
        """按 router 决策重跑指定专家,用新关键词,替换会话候选池对应切片。"""
        base_brief = session.plan_brief or SplitterOutput()
        # 用新关键词覆盖对应专家的搜索词(没给则沿用原 brief)
        brief = SplitterOutput(
            attraction_keywords=decision.attraction_keywords or base_brief.attraction_keywords,
            hotel_keywords=decision.hotel_keywords or base_brief.hotel_keywords,
            meal_keywords=decision.meal_keywords or base_brief.meal_keywords,
        )
        node_state: TripState = {"request": session.request, "plan_brief": brief}
        for which in decision.research:
            node = self._specialist_nodes.get(which)
            if node is None:
                continue
            out = await node(node_state)
            if which == "attraction":
                session.attractions = out.get("attractions") or session.attractions
            elif which == "hotel":
                session.hotels = out.get("hotels") or session.hotels
            elif which == "meal":
                session.meals = out.get("meals") or session.meals
            elif which == "weather":
                session.weather_info = out.get("weather_info") or session.weather_info

    @staticmethod
    def _request_with_feedback(request: TripRequest, feedback: str) -> TripRequest:
        """拷贝一份 request,把本轮反馈拼进 free_text_input,不改动会话里保存的原始 request。"""
        clone = request.model_copy(deep=True)
        base = (clone.free_text_input or "").strip()
        clone.free_text_input = (base + "\n[本次修改] " + feedback).strip() if base else feedback
        return clone

    async def search_pois(self, keywords: str, city: str = "", limit: int = 10):
        """供前端地图搜索 POI(必去/必住/必吃选择器)。复用服务端高德 key。"""
        return await self._provider.search_pois(keywords, city=city, limit=limit)

    async def close(self) -> None:
        await self._provider.shutdown()
