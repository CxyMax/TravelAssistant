"""LangGraph 共享状态定义。

splitter 先把 free_text_input 解析成 plan_brief(各专家关键词 + 必去项),
四个专家节点(景点/天气/酒店/餐饮)读取 plan_brief 后各自只写入自己的 key,
因此可以安全地并行 fan-out,不会发生并发写冲突。
planner 节点读取全部专家结果后写入 trip_plan。
"""

from typing import List, Optional

from typing_extensions import TypedDict

from backend.schemas import (
    Attraction,
    Hotel,
    Meal,
    SplitterOutput,
    TripPlan,
    TripRequest,
    WeatherInfo,
)


class TripState(TypedDict, total=False):
    """旅行规划图的全局状态。"""

    request: TripRequest             # 输入:用户请求
    plan_brief: SplitterOutput       # splitter 产出:各专家关键词
    attractions: List[Attraction]    # 景点专家产出
    weather_info: List[WeatherInfo]  # 天气专家产出
    hotels: List[Hotel]              # 酒店专家产出
    meals: List[Meal]                # 餐饮专家产出
    constraints: List[str]           # 交互式微调累积的约束(refine 时由 router 蒸馏)
    trip_plan: Optional[TripPlan]    # 规划专家产出(最终结果)
