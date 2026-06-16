"""规划 Agent 节点:仅做编排与组装(v3)。

planner 拿到的已是结构化、含真实坐标的景点/天气/酒店/餐厅数据,只需:
分配到每天 + 选酒店 + 配三餐(优先用真实候选餐厅)+ 算预算 + 保证 must_go 项落地。
结构化失败时回退到确定性的本地组装,且兜底同样强制注入 must_go 项。

v3 变化:
- must_go 不再来自 free_text/splitter,而是来自 request.must_go——用户在前端地图上
  搜索并选定的真实 POI(SelectedPOI,带真实坐标)。planner 把它们转成带 must_go=True 的
  Attraction/Hotel/Meal 注入对应候选列表,既让 LLM 看到也便于强制校验;
- payload 增加 candidate_meals,删除 preferences;
- prompt 要求所有 must_go 项必须出现且据此锚定路线;
- 兜底逻辑会把 must_go 景点/酒店/餐厅强制放入计划。
"""

import asyncio
import json
import math
from datetime import datetime, timedelta
from typing import List, Optional, Tuple

from langchain_core.language_models import BaseChatModel

from backend.agents.state import TripState
from backend.config import make_llm
from backend.agents.prompts import PLANNER_AGENT_PROMPT
from backend.schemas import (
    Attraction,
    Budget,
    DayPlan,
    Hotel,
    Meal,
    SelectedPOI,
    TripPlan,
    TripRequest,
    WeatherInfo,
)
from backend.services.mcp_tools import AmapToolProvider


def _make_structured_planner(llm: BaseChatModel):
    """兼容不同 provider 的 structured output 包装。"""
    try:
        return llm.with_structured_output(TripPlan, method="function_calling")
    except ValueError as exc:
        if "unsupported arguments" not in str(exc):
            raise
        return llm.with_structured_output(TripPlan)


def _merge_must_go(
    must_go: List[SelectedPOI],
    attractions: List[Attraction],
    hotels: List[Hotel],
    meals: List[Meal],
) -> Tuple[List[Attraction], List[Hotel], List[Meal]]:
    """把用户在地图上选定的 must_go POI 转成带 must_go=True 的候选并并入对应列表。

    若候选里已有同名项,只把它标记为 must_go=True(避免重复);否则用 SelectedPOI 的
    真实坐标构造一个新候选并插到列表最前面。返回 (attractions, hotels, meals) 新列表。
    """
    attractions = list(attractions)
    hotels = list(hotels)
    meals = list(meals)

    for poi in must_go:
        loc = poi.to_location()
        if poi.kind == "attraction":
            existing = next((a for a in attractions if _name_match(a.name, poi.name)), None)
            if existing is not None:
                existing.must_go = True
            elif loc is not None:
                attractions.insert(0, Attraction(
                    poi_id=poi.poi_id, name=poi.name, address=poi.address or poi.name,
                    location=loc, description="用户指定必去", must_go=True))
        elif poi.kind == "hotel":
            existing = next((h for h in hotels if _name_match(h.name, poi.name)), None)
            if existing is not None:
                existing.must_go = True
            elif loc is not None:
                hotels.insert(0, Hotel(
                    poi_id=poi.poi_id, name=poi.name, address=poi.address or poi.name,
                    location=loc, type="用户指定必住", must_go=True))
        elif poi.kind == "meal":
            existing = next((m for m in meals if _name_match(m.name, poi.name)), None)
            if existing is not None:
                existing.must_go = True
            else:
                meals.insert(0, Meal(
                    poi_id=poi.poi_id, type="lunch", name=poi.name,
                    address=poi.address, location=loc,
                    description="用户指定必吃", must_go=True))
    return attractions, hotels, meals



def make_planner_node(llm: BaseChatModel):
    # function_calling 比默认的 json_schema(strict)更宽容,qwen 下更稳。
    structured_llm = _make_structured_planner(llm)

    async def planner_node(state: TripState) -> dict:
        request: TripRequest = state["request"]
        attractions: List[Attraction] = state.get("attractions") or []
        weather: List[WeatherInfo] = state.get("weather_info") or []
        hotels: List[Hotel] = state.get("hotels") or []
        meals: List[Meal] = state.get("meals") or []
        constraints: List[str] = state.get("constraints") or []

        # 把用户在地图上选定的必去/必住/必吃 POI 并入候选并标记 must_go
        attractions, hotels, meals = _merge_must_go(
            request.must_go, attractions, hotels, meals
        )

        payload = {
            "city": request.city,
            "start_date": request.start_date,
            "end_date": request.end_date,
            "travel_days": request.travel_days,
            "transportation": request.transportation,
            "accommodation": request.accommodation,
            "free_text_input": request.free_text_input,
            "constraints": constraints,
            "candidate_attractions": [a.model_dump() for a in attractions],
            "weather_info": [w.model_dump() for w in weather],
            "candidate_hotels": [h.model_dump() for h in hotels],
            "candidate_meals": [m.model_dump() for m in meals],
        }

        query = (
            PLANNER_AGENT_PROMPT
            + "\n\n以下是已搜集好的真实数据(JSON):\n"
            + json.dumps(payload, ensure_ascii=False, indent=2, default=str)
        )

        try:
            plan: TripPlan = await structured_llm.ainvoke(query)
            if not plan.weather_info and weather:
                plan.weather_info = weather
            # 强保证:确认所有 must_go 项都已落地,缺失的强制补进去
            _enforce_must_go(plan, request, attractions, hotels, meals)
            print(f"📋 规划专家生成 {len(plan.days)} 天行程")
            return {"trip_plan": plan}
        except Exception as exc:
            print(f"⚠️  规划专家结构化输出失败,使用确定性兜底: {exc}")
            return {
                "trip_plan": _fallback_plan(request, attractions, weather, hotels, meals)
            }

    return planner_node


# ============ must-go 强保证 ============


def _dist(a: Optional[object], b: Optional[object]) -> float:
    """两个带 location 的对象之间的近似平面距离(仅用于排序,够用)。"""
    la = getattr(a, "location", None)
    lb = getattr(b, "location", None)
    if not la or not lb:
        return float("inf")
    return math.hypot(la.longitude - lb.longitude, la.latitude - lb.latitude)


def _name_match(a: str, b: str) -> bool:
    """宽松名称匹配:互为子串即认为是同一地点(LLM 常把'栈桥景区'写成'栈桥')。"""
    if not a or not b:
        return False
    return a == b or a in b or b in a


def _enforce_must_go(
    plan: TripPlan,
    request: TripRequest,
    attractions: List[Attraction],
    hotels: List[Hotel],
    meals: List[Meal],
) -> None:
    """确认 LLM 产出的计划里包含全部 must_go 项;缺失的强制补入并锚定路线。"""
    if not plan.days:
        return

    # --- 必去景点 ---
    for must in (a for a in attractions if a.must_go):
        placed = next(
            (a for d in plan.days for a in d.attractions if _name_match(a.name, must.name)),
            None,
        )
        if placed is not None:
            placed.must_go = True
            continue
        # 放进景点最少的一天,并把该天景点按到必去点的距离就近排序(锚定)
        target = min(plan.days, key=lambda d: len(d.attractions))
        target.attractions.insert(0, must)
        target.attractions.sort(key=lambda a: _dist(a, must))

    # --- 必住酒店 ---
    for must in (h for h in hotels if h.must_go):
        if any(d.hotel and _name_match(d.hotel.name, must.name) for d in plan.days):
            for d in plan.days:
                if d.hotel and _name_match(d.hotel.name, must.name):
                    d.hotel.must_go = True
            continue
        plan.days[0].hotel = must  # 至少保证出现在第一天

    # --- 必吃餐厅 ---
    for must in (m for m in meals if m.must_go):
        placed = next(
            (m for d in plan.days for m in d.meals if _name_match(m.name, must.name)),
            None,
        )
        if placed is not None:
            placed.must_go = True
            continue
        plan.days[0].meals.append(must)


def _ticket_price_to_int(value) -> int:
    if value in (None, ""):
        return 0
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, str):
        digits = "".join(ch for ch in value if ch.isdigit())
        return int(digits) if digits else 0
    return 0


def _meals_for_day(meals: List[Meal], idx: int) -> List[Meal]:
    """从候选餐厅里给某天挑三餐;不足时用通用建议补齐。"""
    types = ["breakfast", "lunch", "dinner"]
    chosen: List[Meal] = []
    # 简单轮转分配候选餐厅
    for j, t in enumerate(types):
        pick = meals[(idx * 3 + j) % len(meals)] if meals else None
        if pick is not None:
            chosen.append(
                Meal(
                    poi_id=pick.poi_id,
                    type=t,
                    name=pick.name,
                    address=pick.address,
                    location=pick.location,
                    category=pick.category,
                    description=pick.description,
                    estimated_cost=pick.estimated_cost or {"breakfast": 30, "lunch": 50, "dinner": 80}[t],
                    must_go=pick.must_go,
                )
            )
        else:
            cost = {"breakfast": 30, "lunch": 50, "dinner": 80}[t]
            name = {"breakfast": "当地特色早餐", "lunch": "午餐推荐", "dinner": "晚餐推荐"}[t]
            chosen.append(Meal(type=t, name=name, estimated_cost=cost))
    return chosen


def _fallback_plan(
    request: TripRequest,
    attractions: List[Attraction],
    weather: List[WeatherInfo],
    hotels: List[Hotel],
    meals: List[Meal],
) -> TripPlan:
    """确定性组装:把候选景点平均分配到每天,选酒店,配三餐,并强制注入 must_go。"""
    # 有出行日期则按日期排;没有则只按"第N天"排,date 留空。
    start: Optional[datetime] = None
    if request.start_date:
        try:
            start = datetime.strptime(request.start_date, "%Y-%m-%d")
        except ValueError:
            start = None

    # 必去景点排前面,保证一定被分到某天
    must_attrs = [a for a in attractions if a.must_go]
    rest_attrs = [a for a in attractions if not a.must_go]
    ordered = must_attrs + rest_attrs

    per_day = max(1, len(ordered) // max(1, request.travel_days)) if ordered else 0
    # 必住优先,否则第一家
    must_hotel = next((h for h in hotels if h.must_go), None)
    hotel = must_hotel or (hotels[0] if hotels else None)
    days: List[DayPlan] = []
    total_tickets = 0

    for i in range(request.travel_days):
        date = (start + timedelta(days=i)).strftime("%Y-%m-%d") if start else ""
        day_attrs = ordered[i * per_day : (i + 1) * per_day] if per_day else []
        total_tickets += sum(_ticket_price_to_int(a.ticket_price) for a in day_attrs)
        days.append(
            DayPlan(
                date=date,
                day_index=i,
                description=f"第{i + 1}天行程",
                transportation=request.transportation,
                accommodation=request.accommodation,
                hotel=hotel,
                attractions=day_attrs,
                meals=_meals_for_day(meals, i),
            )
        )

    # 兜底也要保证 must_go 餐厅出现
    if days:
        for m in (x for x in meals if x.must_go):
            if not any(mm.name == m.name for d in days for mm in d.meals):
                days[0].meals.append(m)

    hotel_cost = (hotel.estimated_cost if hotel else 0) * request.travel_days
    meal_cost = sum(mm.estimated_cost for d in days for mm in d.meals)
    transport_cost = 50 * request.travel_days
    budget = Budget(
        total_attractions=total_tickets,
        total_hotels=hotel_cost,
        total_meals=meal_cost,
        total_transportation=transport_cost,
        total=total_tickets + hotel_cost + meal_cost + transport_cost,
    )

    return TripPlan(
        city=request.city,
        start_date=request.start_date,
        end_date=request.end_date,
        days=days,
        weather_info=weather,
        overall_suggestions=f"为您规划的 {request.city} {request.travel_days} 日游,建议提前查看景点开放时间。",
        budget=budget,
    )


### The following is for testing.

def _json_dump(payload) -> str:
    return json.dumps(payload, ensure_ascii=False, indent=2, default=str)


async def _demo() -> None:
    from backend.agents.graph import build_graph

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
                        name="栈桥", kind="attraction",
                        address="青岛市市南区太平路12号",
                        longitude=120.314, latitude=36.058,
                    ),
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
