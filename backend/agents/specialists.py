"""专家 Agent 节点:景点 / 天气 / 酒店 / 餐饮(v3)。

每个专家分两步:
1) create_agent 自主循环调用高德 MCP 工具,产出一段自由文本(搜集到的真实数据);
2) 再用 with_structured_output(method="function_calling") 把文本抽取成结构化数据。

v3 变化:
- 查询不再读 request.preferences,而是读 state["plan_brief"](splitter 的产出),
  用各专家关键词 + city_scope 构造搜索词;
- 新增 make_meal_node;
- 景点/酒店/餐饮节点会把 plan_brief.must_go 里属于自己的项解析成真实 POI 并标 must_go=True,
  确保用户点名的必去/必住/必吃项一定带真实坐标进入候选。

每个节点都包 try/except:单个专家失败只降级为空结果,不会让整张图 500。
"""

import asyncio
import json
from typing import Awaitable, Callable, List

from langchain_core.language_models import BaseChatModel
from langchain.agents import create_agent

from backend.agents.state import TripState
from backend.config import make_llm
from backend.services.mcp_tools import AmapToolProvider
from backend.agents.prompts import (
    ATTRACTION_AGENT_PROMPT,
    HOTEL_AGENT_PROMPT,
    MEAL_AGENT_PROMPT,
    WEATHER_AGENT_PROMPT,
)
from backend.schemas import (
    SpecialistAttractions,
    SpecialistHotels,
    SpecialistMeals,
    SpecialistWeather,
    SplitterOutput,
    TripRequest,
)

Node = Callable[[TripState], Awaitable[dict]]


def _stringify_content(content) -> str:
    if isinstance(content, list):
        return "\n".join(
            part.get("text", "") if isinstance(part, dict) else str(part)
            for part in content
        )
    return str(content)


async def _gather_text(agent, query: str) -> str:
    """运行 react agent(工具循环),返回模型总结文本。"""
    result = await agent.ainvoke({"messages": [("user", query)]})
    messages = result.get("messages", [])
    if not messages:
        return ""
    summary = _stringify_content(messages[-1].content)
    return f"【总结】\n{summary}"


def _make_structured_extractor(llm: BaseChatModel, schema):
    """兼容不同 LangChain provider 的 structured output 包装。"""
    try:
        return llm.with_structured_output(schema, method="function_calling")
    except ValueError as exc:
        if "unsupported arguments" not in str(exc):
            raise
        return llm.with_structured_output(schema)


def _brief(state: TripState) -> SplitterOutput:
    """取 plan_brief;若缺失(理论上 splitter 一定先跑)给个空壳兜底。"""
    return state.get("plan_brief") or SplitterOutput()


def _kw(keywords: List[str]) -> str:
    """把关键词拼成给 agent 的提示串。"""
    return "、".join(k for k in keywords if k) or "热门"


def make_attraction_node(llm: BaseChatModel, provider: AmapToolProvider) -> Node:
    agent = create_agent(
        llm,
        tools=provider.tools("maps_text_search", "maps_search_detail"),
        system_prompt=ATTRACTION_AGENT_PROMPT,
    )
    extractor = _make_structured_extractor(llm, SpecialistAttractions)

    async def attraction_node(state: TripState) -> dict:
        request: TripRequest = state["request"]
        brief = _brief(state)
        query = (
            f"用户要求：{request.free_text_input}，"
            f"请搜索 {request.city} 的景点,提取后旅游景点关键词:{_kw(brief.attraction_keywords)}。"
            f"覆盖不同关键词,结合用户要求（如果有）返回带真实坐标的候选景点。"
        )
        try:
            text = await _gather_text(agent, query)
            out: SpecialistAttractions = await extractor.ainvoke(
                f"把下面搜集到的景点信息整理成结构化数据(保留真实坐标):\n{text}"
            )
            attractions = out.attractions if out else []
        except Exception as exc:
            print(f"⚠️  景点专家失败,降级为空: {exc}")
            attractions = []

        # 坐标兜底
        for attr in attractions:
            if attr.location is None:
                attr.location = await provider.geocode(
                    attr.address or attr.name, city=request.city
                )

        print(f"📍 景点专家返回 {len(attractions)} 个景点")
        return {"attractions": attractions}

    return attraction_node


def make_weather_node(llm: BaseChatModel, provider: AmapToolProvider) -> Node:
    agent = create_agent(
        llm,
        tools=provider.tools("maps_weather"),
        system_prompt=WEATHER_AGENT_PROMPT,
    )
    extractor = _make_structured_extractor(llm, SpecialistWeather)

    async def weather_node(state: TripState) -> dict:
        request: TripRequest = state["request"]
        # 没有出行日期时跳过天气查询:天气预报只在临近日期才有意义,无日期则无从对应。
        if not request.start_date and not request.end_date:
            print("🌤️  未提供出行日期,跳过天气节点")
            return {"weather_info": []}
        query = f"请查询 {request.city}: 未来几天的天气预报。"
        try:
            text = await _gather_text(agent, query)
            out: SpecialistWeather = await extractor.ainvoke(
                f"把下面的天气预报整理成结构化数据(温度用纯数字):\n{text}"
            )
            weather = out.weather_info if out else []
        except Exception as exc:
            print(f"⚠️  天气专家失败,降级为空: {exc}")
            return {"weather_info": []}
        print(f"🌤️  天气专家返回 {len(weather)} 天天气")
        return {"weather_info": weather}

    return weather_node


def make_hotel_node(llm: BaseChatModel, provider: AmapToolProvider) -> Node:
    agent = create_agent(
        llm,
        tools=provider.tools("maps_text_search", "maps_search_detail"),
        system_prompt=HOTEL_AGENT_PROMPT,
    )
    extractor = _make_structured_extractor(llm, SpecialistHotels)

    async def hotel_node(state: TripState) -> dict:
        request: TripRequest = state["request"]
        brief = _brief(state)
        query = (
            f"用户要求：{request.free_text_input}，"
            f"请搜索 {request.city}的酒店: 提取后入住酒店关键词:{_kw(brief.hotel_keywords)} ,"
            f"结合用户要求（如果有）返回带真实坐标的候选酒店。"
        )
        try:
            text = await _gather_text(agent, query)
            out: SpecialistHotels = await extractor.ainvoke(
                f"把下面搜集到的酒店信息整理成结构化数据(保留真实坐标):\n{text}"
            )
            hotels = out.hotels if out else []
        except Exception as exc:
            print(f"⚠️  酒店专家失败,降级为空: {exc}")
            hotels = []

        for hotel in hotels:
            if hotel.location is None:
                hotel.location = await provider.geocode(
                    hotel.address or hotel.name, city=request.city
                )

        print(f"🏨 酒店专家返回 {len(hotels)} 家酒店")
        return {"hotels": hotels}

    return hotel_node


def make_meal_node(llm: BaseChatModel, provider: AmapToolProvider) -> Node:
    """餐饮专家:根据 splitter 给的餐饮关键词搜索真实餐厅。"""
    agent = create_agent(
        llm,
        tools=provider.tools("maps_text_search", "maps_search_detail"),
        system_prompt=MEAL_AGENT_PROMPT,
    )
    extractor = _make_structured_extractor(llm, SpecialistMeals)

    async def meal_node(state: TripState) -> dict:
        request: TripRequest = state["request"]
        brief = _brief(state)
        query = (
            f"用户要求：{request.free_text_input}，"
            f"请搜索 {request.city}的餐饮地点，提取后的关键词：{_kw(brief.meal_keywords)},"
            f"结合用户要求（如果有）返回带真实坐标的候选餐厅。"
        )
        try:
            text = await _gather_text(agent, query)
            out: SpecialistMeals = await extractor.ainvoke(
                f"把下面搜集到的餐厅信息整理成结构化数据(保留真实坐标):\n{text}"
            )
            meals = out.meals if out else []
        except Exception as exc:
            print(f"⚠️  餐饮专家失败,降级为空: {exc}")
            meals = []

        for meal in meals:
            if meal.location is None and (meal.address or meal.name):
                meal.location = await provider.geocode(
                    meal.address or meal.name, city=request.city
                )

        print(f"🍜 餐饮专家返回 {len(meals)} 家餐厅")
        return {"meals": meals}

    return meal_node


### The following is for testing


def _json_dump(payload) -> str:
    return json.dumps(payload, ensure_ascii=False, indent=2, default=str)


async def _run_node_test(which: str) -> None:
    from backend.agents.splitter import make_splitter_node

    provider = AmapToolProvider()
    llm = make_llm(temperature=0.2)
    state: TripState = {
        "request": TripRequest(
            city="青岛",
            start_date="2026-06-11",
            end_date="2026-06-14",
            travel_days=3,
            transportation="公共交通",
            accommodation="华住会",
            free_text_input="想逛青岛市区特色咖啡店,最好在海边;想吃海鲜",
        )
    }

    await provider.startup()
    try:
        splitter = make_splitter_node(llm)
        state.update(await splitter(state))

        nodes: dict[str, Node] = {
            "attraction": make_attraction_node(llm, provider),
            "weather": make_weather_node(llm, provider),
            "hotel": make_hotel_node(llm, provider),
            "meal": make_meal_node(llm, provider),
        }

        selected = nodes.keys() if which == "all" else [which]
        for name in selected:
            print(f"\n=== Running {name} node ===")
            result = await nodes[name](state)
            print(_json_dump(result))
    finally:
        await provider.shutdown()


if __name__ == "__main__":
    asyncio.run(_run_node_test("meal"))
