"""Splitter 节点:把 free_text_input 拆成各专家搜索关键词。

放在所有专家之前(START -> splitter -> 四专家并行)。一次 LLM 调用产出 SplitterOutput,
写入 state["plan_brief"],供景点/酒店/餐饮节点构造各自的搜索查询。

为什么用独立 splitter 而不是把整段自由文本塞给每个专家:
- 关键词提炼只做一次,避免三个节点各自重复解析、口径不一致。

注意:用户点名的"必去/必住/必吃"项不在这里处理——它们由前端地图让用户搜索并显式
选择真实 POI(TripRequest.must_go),splitter 只负责提炼软偏好关键词。

失败时降级为安全默认(各 keywords 给一个兜底词),不阻断整张图。
"""

from asyncio.log import logger

from langchain_core.language_models import BaseChatModel

from backend.agents.state import TripState
from backend.agents.prompts import SPLITTER_AGENT_PROMPT
from backend.schemas import SplitterOutput, TripRequest


def _make_structured_splitter(llm: BaseChatModel):
    """兼容不同 provider 的 structured output 包装(qwen 下 function_calling 更稳)。"""
    try:
        return llm.with_structured_output(SplitterOutput, method="function_calling")
    except ValueError as exc:
        if "unsupported arguments" not in str(exc):
            raise
        return llm.with_structured_output(SplitterOutput)


def _default_brief(request: TripRequest) -> SplitterOutput:
    """无自由文本或解析失败时的安全默认。"""
    hotel_kw = [request.accommodation] if request.accommodation else ["酒店"]
    return SplitterOutput(
        attraction_keywords=["热门景点"],
        hotel_keywords=hotel_kw,
        meal_keywords=["当地特色美食"],
    )


def make_splitter_node(llm: BaseChatModel):
    structured_llm = _make_structured_splitter(llm)

    async def splitter_node(state: TripState) -> dict:
        request: TripRequest = state["request"]
        text = (request.free_text_input or "").strip()
        if not text:
            return {"plan_brief": _default_brief(request)}

        query = (
            SPLITTER_AGENT_PROMPT
            + f"\n\n目的地城市:{request.city}"
            + f"\n住宿偏好(若用户没在自由描述里另说,可作为酒店关键词参考):{request.accommodation or '无'}"
            + f"\n用户自由描述:{text}"
        )
        try:
            brief: SplitterOutput = await structured_llm.ainvoke(query)
            if brief is None:
                brief = _default_brief(request)
            # 兜底:任一关键词列表为空时补默认,保证下游一定有东西可搜
            if not brief.attraction_keywords:
                brief.attraction_keywords = ["热门景点"]
            elif "热门景点" not in brief.attraction_keywords:
                brief.attraction_keywords.append("热门景点")
            if not brief.hotel_keywords:
                brief.hotel_keywords = [request.accommodation] if request.accommodation else ["酒店"]
            if not brief.meal_keywords:
                brief.meal_keywords = ["当地特色美食"]
        except Exception as exc:
            logger.warning(f"⚠️  splitter 失败,使用默认拆分: {exc}")
            return {"plan_brief": _default_brief(request)}

        # print(
        #     f"🧭 splitter: 景点{brief.attraction_keywords} 酒店{brief.hotel_keywords} "
        #     f"餐饮{brief.meal_keywords}"
        # )
        logger.info(
            f"🧭 splitter: 景点{brief.attraction_keywords} 酒店{brief.hotel_keywords} "
            f"餐饮{brief.meal_keywords}"
        )
        return {"plan_brief": brief}

    return splitter_node

from backend import config
import asyncio

async def demo():
    

    trip_request_1 = TripRequest(
        city="青岛",
        free_text_input="想逛青岛市区特色咖啡店,最好在海边",
        accommodation="锦江之星",
        travel_days=2
    )
    trip_request_2 = TripRequest(
        city="青岛",
        free_text_input="我想在海边，边欣赏风景边喝咖啡，吃一些景点鲁菜",
        travel_days=3
    )
    llm = config.make_llm()
    splitter_node = make_splitter_node(llm)

    task_1 = asyncio.create_task(splitter_node(TripState(request=trip_request_1)))
    task_2 = asyncio.create_task(splitter_node(TripState(request=trip_request_2)))

    result_1 = await task_1
    result_2 = await task_2

    print("Result 1:", result_1)
    print("Result 2:", result_2)

    return result_1, result_2

if __name__ == "__main__":
    asyncio.run(demo())