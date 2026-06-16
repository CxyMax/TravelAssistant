"""数据模型定义(v3)。

相比 v2 的变化:
- TripRequest 删除 `preferences`;`free_text_input` 作为软偏好信号(由 splitter 拆成各专家关键词);
- 新增 `must_go: List[SelectedPOI]`——用户在前端地图上搜索并选定的真实 POI(带坐标),规划时强制排入;
- Attraction / Hotel / Meal 新增 `must_go` 标记;
- splitter 仅输出关键词(SplitterOutput),不再从自由文本抽取必去项;餐饮专家输出 SpecialistMeals。
"""

from typing import Any, List, Literal, Optional, Union

from pydantic import BaseModel, Field, field_validator

# ============ 工具:容错解析 ============
# qwen 在 function_calling 模式下偶尔把嵌套对象/数组序列化成 JSON 字符串
# (例如 budget 返回 '{"total": 685}' 而非对象)。下面的校验器在校验前把这类
# 字符串还原成 dict/list,避免规划 Agent 因此整体失败而退回兜底方案。
import json

def _coerce_json(value: Any) -> Any:
    """若 value 是 JSON 字符串则解析,否则原样返回。"""
    if isinstance(value, str):
        text = value.strip()
        if text and text[0] in "{[":
            try:
                return json.loads(text)
            except json.JSONDecodeError:
                return value
    return value


# ============ 请求模型 ============


class SelectedPOI(BaseModel):
    """用户在前端地图上搜索并选定的必去/必住/必吃 POI。

    这些点带有高德返回的真实坐标(由前端地图选取时一并带上),
    不需要后端再反查;kind 决定它归到景点/酒店/餐饮哪一类候选并强制排入行程。
    """

    name: str = Field(..., description="POI 名称")
    kind: Literal["attraction", "hotel", "meal"] = Field(
        ..., description="类别:attraction 必去景点 / hotel 必住酒店 / meal 必吃餐厅"
    )
    poi_id: Optional[str] = Field(default=None, description="高德 POI ID")
    address: Optional[str] = Field(default=None, description="地址")
    longitude: Optional[float] = Field(default=None, description="经度")
    latitude: Optional[float] = Field(default=None, description="纬度")

    def to_location(self) -> Optional["Location"]:
        if self.longitude is None or self.latitude is None:
            return None
        return Location(longitude=self.longitude, latitude=self.latitude)


class TripRequest(BaseModel):
    """旅行规划请求。"""

    city: str = Field(..., description="目的地城市")
    start_date: str = Field("", description="开始日期 YYYY-MM-DD")
    end_date: str = Field("", description="结束日期 YYYY-MM-DD")
    travel_days: int = Field(..., description="旅行天数", ge=1, le=30)
    transportation: str = Field(default="公共交通", description="交通方式")
    accommodation: str = Field(default="", description="住宿偏好")
    free_text_input: Optional[str] = Field(
        default="",
        description="额外要求/自由描述。软偏好信号,由 splitter 解析成各专家搜索关键词",
    )
    must_go: List[SelectedPOI] = Field(
        default_factory=list,
        description="用户在前端地图上选定的必去/必住/必吃 POI(带真实坐标),规划时必须排入",
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "city": "青岛",
                # "start_date": "2025-05-26",
                # "end_date": "2025-05-28",
                "travel_days": 2,
                "transportation": "公共交通",
                "accommodation": "经济型",
                "free_text_input": "想逛青岛市区特色咖啡店,最好在海边",
                "must_go": [
                    {
                        "name": "栈桥",
                        "kind": "attraction",
                        "poi_id": "B0FFKEPXXX",
                        "address": "青岛市市南区太平路12号",
                        "longitude": 120.314,
                        "latitude": 36.058,
                    }
                ],
            }
        }
    }


# 向后兼容别名
TripPlanRequest = TripRequest


# ============ 基础响应模型 ============


class Location(BaseModel):
    """地理位置。"""

    longitude: float = Field(..., description="经度")
    latitude: float = Field(..., description="纬度")


class Attraction(BaseModel):
    """景点信息。"""

    poi_id: Optional[str] = Field(default=None, description="POI ID")
    name: str = Field(..., description="景点名称")
    address: str = Field(..., description="地址")
    location: Location = Field(..., description="经纬度坐标")
    visit_duration: Optional[int] = Field(default=None, description="建议游览时间(分钟)")
    description: Optional[str] = Field(default=None, description="景点描述")
    category: Optional[str] = Field(default=None, description="景点类别")
    rating: Optional[float] = Field(default=None, description="评分")
    ticket_price: Optional[str] = Field(default=None, description="门票价格/人均消费（元）")
    must_go: bool = Field(default=False, description="用户点名必去的景点(规划时必须保留并据此锚定路线)")

    _coerce_location = field_validator("location", mode="before")(_coerce_json)


class WeatherInfo(BaseModel):
    """天气信息。"""

    date: str = Field(..., description="日期 YYYY-MM-DD")
    day_weather: str = Field(default="", description="白天天气")
    night_weather: str = Field(default="", description="夜间天气")
    day_temp: Union[int, str] = Field(default=None, description="白天温度")
    night_temp: Union[int, str] = Field(default=None, description="夜间温度")
    wind_direction: str = Field(default="", description="风向")
    wind_power: str = Field(default="", description="风力")

    @field_validator("day_temp", "night_temp", mode="before")
    @classmethod
    def parse_temperature(cls, v):
        """解析温度,移除 °C / ℃ 等单位。"""
        if isinstance(v, str):
            v = v.replace("°C", "").replace("℃", "").replace("°", "").strip()
            try:
                return int(v)
            except ValueError:
                return 0
        return v
    
    
class Meal(BaseModel):
    """餐饮信息。"""

    poi_id: Optional[str] = Field(default=None, description="POI ID")
    type: str = Field(..., description="餐饮类型: breakfast/lunch/dinner/snack")
    name: str = Field(..., description="餐饮名称")
    address: Optional[str] = Field(default=None, description="地址")
    location: Optional[Location] = Field(default=None, description="经纬度坐标")
    category: Optional[str] = Field(default=None, description="餐饮类别/菜系")
    description: Optional[str] = Field(default=None, description="描述")
    estimated_cost: int = Field(default=0, description="预估费用(元)")
    must_go: bool = Field(default=False, description="用户点名必吃的餐厅(规划时必须保留)")

    _coerce_location = field_validator("location", mode="before")(_coerce_json)


class Hotel(BaseModel):
    """酒店信息。"""

    poi_id: Optional[str] = Field(default=None, description="POI ID")
    name: str = Field(..., description="酒店名称")
    address: str = Field(default=..., description="酒店地址")
    location: Location = Field(default=..., description="酒店位置")
    price_range: Optional[str] = Field(default=None, description="价格范围")
    rating: Optional[str] = Field(default=None, description="评分")
    type: Optional[str] = Field(default=None, description="酒店类型")
    estimated_cost: int = Field(default=0, description="预估费用(元/晚)")
    must_go: bool = Field(default=False, description="用户点名必住的酒店(规划时必须保留)")

    _coerce_location = field_validator("location", mode="before")(_coerce_json)





class Budget(BaseModel):
    """预算信息。"""

    total_attractions: int = Field(default=0, description="景点门票总费用")
    total_hotels: int = Field(default=0, description="酒店总费用")
    total_meals: int = Field(default=0, description="餐饮总费用")
    total_transportation: int = Field(default=0, description="交通总费用")
    total: int = Field(default=0, description="总费用")


class DayPlan(BaseModel):
    """单日行程。"""

    date: str = Field(default="", description="日期 YYYY-MM-DD(未提供出行日期时可为空)")
    day_index: int = Field(..., description="第几天(从0开始)")
    description: str = Field(default="", description="当日行程描述")
    transportation: str = Field(default="", description="交通方式")
    accommodation: str = Field(default="", description="住宿")
    hotel: Optional[Hotel] = Field(default=None, description="推荐酒店")
    attractions: List[Attraction] = Field(default_factory=list, description="景点列表")
    meals: List[Meal] = Field(default_factory=list, description="餐饮列表")

    _coerce_hotel = field_validator("hotel", mode="before")(_coerce_json)
    _coerce_attractions = field_validator("attractions", mode="before")(_coerce_json)
    _coerce_meals = field_validator("meals", mode="before")(_coerce_json)


class TripPlan(BaseModel):
    """旅行计划。"""

    city: str = Field(..., description="目的地城市")
    start_date: str = Field(default="", description="开始日期(未提供出行日期时可为空)")
    end_date: str = Field(default="", description="结束日期(未提供出行日期时可为空)")
    days: List[DayPlan] = Field(default_factory=list, description="每日行程")
    weather_info: List[WeatherInfo] = Field(default_factory=list, description="天气信息")
    overall_suggestions: str = Field(default="", description="总体建议")
    budget: Optional[Budget] = Field(default=None, description="预算信息")

    _coerce_days = field_validator("days", mode="before")(_coerce_json)
    _coerce_weather = field_validator("weather_info", mode="before")(_coerce_json)
    _coerce_budget = field_validator("budget", mode="before")(_coerce_json)


class TripPlanResponse(BaseModel):
    """旅行计划响应。"""

    success: bool = Field(..., description="是否成功")
    message: str = Field(default="", description="消息")
    data: Optional[TripPlan] = Field(default=None, description="旅行计划数据")
    session_id: str = Field(default="", description="会话 id,用于后续交互式微调 /trip/refine")


# ============ 专家 Agent 结构化输出模型 ============
# 每个专家 Agent 调用工具后,通过 with_structured_output(function_calling)
# 直接返回这些结构化结果,而不是自由文本。规划 Agent 据此组装最终计划。


class SpecialistAttractions(BaseModel):
    """景点专家的结构化输出。"""

    attractions: List[Attraction] = Field(
        default_factory=list, description="搜索到的候选景点(含真实坐标)"
    )

    _coerce = field_validator("attractions", mode="before")(_coerce_json)


class SpecialistWeather(BaseModel):
    """天气专家的结构化输出。"""

    weather_info: List[WeatherInfo] = Field(
        default_factory=list, description="目的地未来几天天气预报"
    )

    _coerce = field_validator("weather_info", mode="before")(_coerce_json)


class SpecialistHotels(BaseModel):
    """酒店专家的结构化输出。"""

    hotels: List[Hotel] = Field(
        default_factory=list, description="候选酒店列表(含真实坐标)"
    )

    _coerce = field_validator("hotels", mode="before")(_coerce_json)


class SpecialistMeals(BaseModel):
    """餐饮专家的结构化输出。"""

    meals: List[Meal] = Field(
        default_factory=list, description="候选餐厅/美食列表(含真实坐标)"
    )

    _coerce = field_validator("meals", mode="before")(_coerce_json)


# ============ Splitter(自由文本拆分)模型 ============
# splitter agent 只负责把 free_text_input 解析成各专家可直接使用的关键词列表。
# 注意:用户点名的"必去/必住/必吃"项不再由 splitter 从自由文本里抽取,
# 而是由前端地图让用户搜索并显式选择真实 POI(见 TripRequest.must_go / SelectedPOI)。


class SplitterOutput(BaseModel):
    """splitter agent 的结构化输出(仅关键词)。"""

    attraction_keywords: List[str] = Field(
        default_factory=list, description="景点专家搜索关键词"
    )
    hotel_keywords: List[str] = Field(
        default_factory=list, description="酒店专家搜索关键词"
    )
    meal_keywords: List[str] = Field(
        default_factory=list, description="餐饮专家搜索关键词"
    )

    _coerce_attr = field_validator("attraction_keywords", mode="before")(_coerce_json)
    _coerce_hotel = field_validator("hotel_keywords", mode="before")(_coerce_json)
    _coerce_meal = field_validator("meal_keywords", mode="before")(_coerce_json)


# ============ 交互式微调(refine)模型 ============
# 用户对生成的行程不满意时,带着 session_id + 自由反馈再次请求;
# router agent 把反馈分类为"仅重排"或"需要重搜某些专家",并蒸馏出累积约束。


class RefineRequest(BaseModel):
    """对已生成行程的微调请求。"""

    session_id: str = Field(..., description="/trip/plan 返回的会话 id")
    feedback: str = Field(..., description="用户的修改意见,如'第二天太赶''换更便宜的酒店'")


class RouterDecision(BaseModel):
    """refine router 的结构化输出:决定重搜哪些专家 + 蒸馏出的约束。"""

    research: List[Literal["attraction", "hotel", "meal", "weather"]] = Field(
        default_factory=list,
        description="需要重新搜索候选的专家;为空表示只用现有候选重新规划",
    )
    attraction_keywords: List[str] = Field(
        default_factory=list, description="若重搜景点,使用的新关键词"
    )
    hotel_keywords: List[str] = Field(
        default_factory=list, description="若重搜酒店,使用的新关键词"
    )
    meal_keywords: List[str] = Field(
        default_factory=list, description="若重搜餐饮,使用的新关键词"
    )
    constraints: List[str] = Field(
        default_factory=list,
        description="从本次反馈蒸馏出的简短约束,如'酒店预算<400/晚''节奏轻松'",
    )
    note: str = Field(default="", description="可选:对决策的简短说明")

    _coerce_research = field_validator("research", mode="before")(_coerce_json)
    _coerce_attr = field_validator("attraction_keywords", mode="before")(_coerce_json)
    _coerce_hotel = field_validator("hotel_keywords", mode="before")(_coerce_json)
    _coerce_meal = field_validator("meal_keywords", mode="before")(_coerce_json)
    _coerce_cons = field_validator("constraints", mode="before")(_coerce_json)
