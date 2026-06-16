"""LangGraph 图构建:splitter -> 四专家并行 -> 规划组装(v3)。

      START
        |
     splitter            (拆分 free_text_input -> 各专家关键词 + 必去项)
        |
   +----+----+-----+-----+
   |    |     |     |
attract weather hotel meal   (并行 fan-out, 全异步, 各自带 amap 工具)
   |    |     |     |
   +----+----+-----+-----+
        |
     planner             (四者都完成后才执行 —— 多入边天然形成 barrier)
        |
       END
"""

import asyncio
import json

from langchain_core.language_models import BaseChatModel
from langgraph.graph import END, START, StateGraph

from backend.agents.planner import make_planner_node
from backend.agents.splitter import make_splitter_node
from backend.agents.specialists import (
    make_attraction_node,
    make_hotel_node,
    make_meal_node,
    make_weather_node,
)
from backend.agents.state import TripState
from backend.config import make_llm
from backend.schemas import SelectedPOI, TripRequest
from backend.services.mcp_tools import AmapToolProvider


def build_graph(llm: BaseChatModel, provider: AmapToolProvider):
    """构建并编译旅行规划图。"""
    graph = StateGraph(TripState)

    graph.add_node("splitter", make_splitter_node(llm))
    graph.add_node("attraction", make_attraction_node(llm, provider))
    graph.add_node("weather", make_weather_node(llm, provider))
    graph.add_node("hotel", make_hotel_node(llm, provider))
    graph.add_node("meal", make_meal_node(llm, provider))
    graph.add_node("planner", make_planner_node(llm))

    # START -> splitter,splitter 完成后并行进入四个专家
    graph.add_edge(START, "splitter")
    for specialist in ("attraction", "weather", "hotel", "meal"):
        graph.add_edge("splitter", specialist)
        graph.add_edge(specialist, "planner")

    # planner 有四条入边,LangGraph 会等四者都完成后再执行(barrier)
    graph.add_edge("planner", END)

    return graph.compile()


def _json_dump(payload) -> str:
    return json.dumps(payload, ensure_ascii=False, indent=2, default=str)


async def _demo() -> None:
    """本地直接运行 graph.py 时的简单测试入口。"""
    llm = make_llm(temperature=0.2)
    provider = AmapToolProvider()
    await provider.startup()
    try:
        graph = build_graph(llm, provider)
        state: TripState = {
            "request": TripRequest(
                city="青岛",
                start_date="2026-06-11",
                end_date="2026-06-13",
                travel_days=3,
                transportation="公共交通",
                accommodation="舒适型",
                free_text_input="想逛青岛市区特色咖啡店,最好在海边;想吃海鲜",
                must_go=[
                    SelectedPOI(
                        name="栈桥",
                        kind="attraction",
                        address="青岛市市南区太平路12号",
                        longitude=120.314,
                        latitude=36.058,
                    )
                ],
            ),
        }
        final = await graph.ainvoke(state)
        plan = final.get("trip_plan")
        print(_json_dump(plan.model_dump() if plan else final))
    finally:
        await provider.shutdown()


if __name__ == "__main__":
    asyncio.run(_demo())
