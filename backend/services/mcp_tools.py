"""高德地图 MCP 工具提供器(全异步)。

与 v1 的核心区别:
- v1 使用 hello_agents.MCPTool,其 .run() 是同步阻塞的,且**每次调用都新建一个
  MCPClient 上下文 => 每次都重新启动一个 `uvx amap-mcp-server` 子进程**。
- v2 使用官方 langchain-mcp-adapters,在应用启动时打开**一个持久 session**,
  全部工具都是原生 async LangChain 工具,可直接 await,且复用同一子进程。
"""

import asyncio
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

from langchain_core.tools import BaseTool
from langchain_mcp_adapters.client import MultiServerMCPClient
from langchain_mcp_adapters.tools import load_mcp_tools

from backend.config import get_settings
from backend.services.poicode import category_to_code, decode_typecode
from backend.schemas import Location

# def _uvx_command() -> str:                                 
#     """优先使用与当前解释器同目录的 uvx,保证版本一致(沿用 v1 的做法)"""
#     # /home/max/miniconda3/envs/travel_assistant/bin/python
#     # /home/max/miniconda3/envs/travel_assistant/bin/uvx   
#     candidate = Path(sys.executable).with_name("uvx")      
#     return str(candidate) if candidate.exists() else "uvx" 


# 本地修补版的 amap server 所在目录: TravelAssistant_v2/vendor/
# backend/mcp_tools.py -> parents[1] = TravelAssistant_v2/
VENDOR_DIR = Path(__file__).resolve().parents[2] / "vendor"


class AmapToolProvider:
    """管理 MCP 客户端会话生命周期,并按名称提供工具。"""

    def __init__(self) -> None:
        self._client: Optional[MultiServerMCPClient] = None
        self._session_cm = None  # client.session(...) 返回的异步上下文管理器
        self._session = None
        self._tools: Dict[str, BaseTool] = {}
        # 高德免费配额并发很低,用信号量把所有工具调用(含 agent 内并行 tool_calls
        # 和三个专家节点并行)收敛到一个全局上限,避免 CUQPS_HAS_EXCEEDED_THE_LIMIT。
        max_conc = int(os.getenv("AMAP_MAX_CONCURRENCY", "2"))
        self._semaphore = asyncio.Semaphore(max_conc)

    async def startup(self) -> None:
        """启动 MCP 服务器并加载工具(应用启动时调用一次)。"""
        settings = get_settings()
        # 使用本地修补版 amap server(vendor/amap_mcp_server),而非 `uvx amap-mcp-server`。
        # 原因:上游 0.1.11 在 transit 工具里有一行 print(data) 会污染 stdio 协议流。
        # 通过当前解释器以 `python -m amap_mcp_server` 启动,并把 vendor 加入 PYTHONPATH。
        env = {
            "AMAP_MAPS_API_KEY": settings.amap_api_key,
            "PATH": os.getenv("PATH", ""),
            "PYTHONPATH": str(VENDOR_DIR) + os.pathsep + os.getenv("PYTHONPATH", ""),
            # 保证子进程 stdout 不被缓冲/编码问题干扰
            "PYTHONUNBUFFERED": "1",
        }
        self._client = MultiServerMCPClient(
            {
                "amap": {
                    "command": sys.executable,            # 当前 conda 环境的 python
                    "args": ["-m", "amap_mcp_server"],     # 运行 vendor 里的本地副本
                    "transport": "stdio",                  # standard I/O, 不可以远程调用
                    "env": env,
                }
                # "amap": {
                #     "command": _uvx_command(),                                                        
                #     "args": ["amap-mcp-server"],                                                      
                #     "transport": "stdio", # standard I/O, 不可以远程调用                              
                #     "env": {                                                                          
                #     "AMAP_MAPS_API_KEY": settings.amap_api_key,                                   
                #     # 保证uvx可以被找到, 这里是 /home/max/miniconda3/envs/travel_assistant/bin/uvx
                #     "PATH": os.getenv("PATH", ""),                                                
                #     # "UV_CACHE_DIR": settings.uvx_cache_path,                                    
                #     },                                                                                

            }
        )

        # 手动进入持久 session,贯穿整个应用生命周期
        self._session_cm = self._client.session("amap") # _AsyncGeneratorContextManager, an async context manager object
        self._session = await self._session_cm.__aenter__() # MultiServerMCPSession, get the result from yield
        # above two lines are equivalent to: 
        # async with self._client.session("amap") as session:
    


        tools = await load_mcp_tools(self._session)
        for tool in tools:
            self._throttle_tool(tool)
        self._tools = {tool.name: tool for tool in tools}
        print(f"✅ 高德 MCP 工具加载成功,共 {len(self._tools)} 个: {list(self._tools)[:6]}...")

    async def shutdown(self) -> None:
        """关闭 session(应用关闭时调用)。"""
        if self._session_cm is not None:
            try:
                await self._session_cm.__aexit__(None, None, None)
            except Exception as exc:  # 关闭异常不应影响主流程
                print(f"⚠️  关闭 MCP session 时出现异常: {exc}")
            finally:
                self._session_cm = None
                self._session = None
                self._tools = {}

    
    def _throttle_tool(self, tool: BaseTool) -> None:
        """给单个 MCP 工具的 async 调用包一层:全局并发限流 + QPS 超限自动重试。

        load_mcp_tools 返回的工具走 tool.coroutine 执行;这里替换它,使
        agent 内部并行的 tool_calls 与各专家节点共享同一个信号量,并在
        命中 CUQPS_HAS_EXCEEDED_THE_LIMIT 时退避重试,对 create_agent 透明。
        """
        original = tool.coroutine
        if original is None:
            return
        semaphore = self._semaphore

        async def throttled(*args: Any, **kwargs: Any):
            delay = 0.5
            last = None
            for _ in range(3):
                async with semaphore:
                    last = await original(*args, **kwargs)
                if "CUQPS_HAS_EXCEEDED_THE_LIMIT" not in _result_text(last):
                    return last
                await asyncio.sleep(delay)
                delay *= 2
            return last

        tool.coroutine = throttled

    def get(self, name: str) -> BaseTool:
        """按名称获取单个工具。"""
        if name not in self._tools:
            raise KeyError(f"MCP 工具不存在: {name} (可用: {list(self._tools)})")
        return self._tools[name]

    def tools(self, *names: str) -> List[BaseTool]:
        """按名称批量获取工具,供各专家 Agent 绑定。"""
        return [self.get(name) for name in names]

    @property
    def all_tools(self) -> List[BaseTool]:
        return list(self._tools.values())

    async def call(self, tool_name: str, **arguments: Any) -> Dict[str, Any]:
        """通用工具调用入口。所有具体方法(geocode/search_poi/...)都基于它构建。

        输入:
            tool_name —— 工具名,如 "maps_geo"、"maps_text_search"、"maps_weather"。
            **arguments —— 该工具的命名参数(全部是字符串)。参见各工具签名:
                maps_geo(address, city=None)
                maps_text_search(keywords, city="", citylimit="false")
                maps_around_search(location, radius="1000", keywords="")
                maps_search_detail(id)
                maps_weather(city)
                maps_regeocode(location)                       # location="经度,纬度"
                maps_distance(origins, destination, type="1")  # type: 0直线/1驾车/3步行
                maps_direction_walking_by_address(origin_address, destination_address,
                    origin_city=None, destination_city=None)
                maps_direction_driving_by_address(...)         # 同上
                maps_direction_transit_integrated_by_address(origin_address,
                    destination_address, origin_city, destination_city)  # 后两个必填
                ...(*_by_coordinates 版本用 origin/destination 经纬度字符串)

        输出:
            工具返回的 dict(已自动从 [{'type':'text','text':'<json>'}] 解包并解析)。
            高德 server 在出错时返回 {"error": "..."},本方法原样透传该 dict,
            由调用方自行判断 "error" 键。

        示例(在其它方法里这样用):
            data = await self.call("maps_text_search", keywords="咖啡", city="青岛", citylimit="true")
            pois = data.get("pois", [])
        """
        raw = await self.get(tool_name).ainvoke(arguments)
        payload = _extract_json(raw)
        # 统一成 dict 返回;若解析出的是 list(少见),包一层方便调用方处理。
        if isinstance(payload, dict):
            return payload
        if isinstance(payload, list):
            return {"list": payload}
        return {}


    # async def search_poi(
    #     self,
    #     keywords: str = "",
    #     city: str = "",
    #     category: str = "",
    #     citylimit: bool = True,
    # ) -> List[Dict[str, Any]]:
    #     """搜索 POI,可按关键词和/或类别(category)过滤,并回填中文类别名。

    #     输入:
    #         keywords —— 关键词(如 "海边"),可为空。
    #         city     —— 城市名或 adcode。
    #         category —— 中文类别名(如 "风景名胜"/"咖啡厅")或 6 位 types code。
    #                     会经 category_to_code 转成高德 types 过滤。可为空。
    #         citylimit—— 是否限定在 city 范围内。

    #     输出:
    #         POI 字典列表,每项在原始字段(id/name/address/typecode)外,
    #         额外补 "category"(中类中文名,由 typecode 解码而来)。

    #     示例:
    #         # 搜青岛所有"风景名胜"
    #         await provider.search_poi(city="青岛", category="风景名胜")
    #         # 搜青岛海边的咖啡厅
    #         await provider.search_poi(keywords="海边", city="青岛", category="咖啡厅")
    #     """
    #     types = ""
    #     if category:
    #         # 已是 6 位 code 就直接用,否则按中文名反查
    #         types = category if category.isdigit() and len(category) == 6 else (category_to_code(category) or "")
    #     data = await self.call(
    #         "maps_text_search",
    #         keywords=keywords,
    #         city=city,
    #         citylimit="true" if citylimit else "false",
    #         types=types,
    #     )
    #     if "error" in data:
    #         print(f"⚠️  search_poi 返回错误: {data['error']}")
    #         return []
    #     pois = data.get("pois", []) or []
    #     for poi in pois:
    #         poi["category"] = decode_typecode(poi.get("typecode", ""), level="mid")
    #     return pois



    async def geocode(self, address: str, city: Optional[str] = None) -> Optional[Location]:
        """地址转坐标。maps_text_search 不返回坐标,需要用 maps_geo 补全。

        被景点/酒店/餐饮专家用作坐标兜底:当某个 POI 没拿到 location 时,
        用其名称/地址反查一个经纬度,避免规划阶段缺坐标。
        """
        if not address:
            return None
        kwargs: Dict[str, str] = {"address": address}
        if city:
            kwargs["city"] = city
        try:
            data = await self.call("maps_geo", **kwargs)
        except Exception as exc:
            print(f"⚠️  geocode 失败 ({address}): {exc}")
            return None
        if "error" in data:
            print(f"⚠️  geocode 返回错误 ({address}): {data['error']}")
            return None
        return self._parse_geo_location(data)
    

    @staticmethod
    def _parse_geo_location(payload) -> Optional[Location]:
        """从 maps_geo 的结果中解析第一个坐标。

        maps_geo 返回结构:{"return": [{..., "location": "经度,纬度"}, ...]}
        """
        items = []
        if isinstance(payload, dict):
            items = payload.get("return") or payload.get("geocodes") or []
        elif isinstance(payload, list):
            items = payload
        for item in items:
            if isinstance(item, dict) and item.get("location"):
                try:
                    lng, lat = str(item["location"]).split(",", 1)
                    return Location(longitude=float(lng), latitude=float(lat))
                except (TypeError, ValueError):
                    continue
        return None

    async def search_pois(
        self, keywords: str, city: str = "", limit: int = 10, with_location: bool = True
    ) -> List[Dict[str, Any]]:
        """按关键词搜索 POI 候选,供前端地图"搜索并选择必去项"使用。

        流程:maps_text_search 取候选 -> 对前 `limit` 个用 maps_search_detail 补真实坐标
        (maps_text_search 本身不返回坐标)。返回 list,每项含
        id/name/address/category/longitude/latitude(拿不到坐标的项也保留,经纬度为 None)。
        """
        if not keywords:
            return []
        try:
            data = await self.call(
                "maps_text_search",
                keywords=keywords,
                city=city,
                citylimit="true" if city else "false",
            )
        except Exception as exc:
            print(f"⚠️  search_pois 搜索失败 ({keywords}): {exc}")
            return []
        
        pois = (data.get("pois") or []) if isinstance(data, dict) else []
        results: List[Dict[str, Any]] = []
        for poi in pois[:limit]:
            lng = lat = None
            poi_id = poi.get("id")
            if with_location and poi_id:
                try:
                    detail = await self.call("maps_search_detail", id=poi_id)
                    loc_str = detail.get("location") if isinstance(detail, dict) else None
                    if loc_str and "," in str(loc_str):
                        lng_s, lat_s = str(loc_str).split(",", 1)
                        lng, lat = float(lng_s), float(lat_s)
                except Exception as exc:
                    print(f"⚠️  search_pois 取详情失败 ({poi.get('name')}): {exc}")
            if with_location and lng is None:
                # 需要修改 
                loc = await self.geocode(poi.get("address") or poi.get("name"), city=city)
                if loc is not None:
                    lng, lat = loc.longitude, loc.latitude
            results.append(
                {
                    "poi_id": poi_id,
                    "name": poi.get("name"),
                    "address": poi.get("address"),
                    "category": decode_typecode(poi.get("typecode", ""), level="mid"),
                    "longitude": lng,
                    "latitude": lat,
                }
            )
        return results



def _result_text(raw) -> str:
    """把工具返回值(dict/list/str/[{'type':'text',...}])粗暴转成字符串,
    仅用于检测错误标记(如 CUQPS_HAS_EXCEEDED_THE_LIMIT),不要求严格结构。
    """
    if raw is None:
        return ""
    if isinstance(raw, str):
        return raw
    try:
        return json.dumps(raw, ensure_ascii=False, default=str)
    except (TypeError, ValueError):
        return str(raw)


def _extract_json(raw):
    """MCP 工具返回值可能是 dict/list、JSON 字符串,或 [{'type':'text','text':...}]。"""
    if isinstance(raw, (dict, list)):
        # langchain-mcp-adapters 常返回 [{'type':'text','text':'<json>'}]
        if isinstance(raw, list) and raw and isinstance(raw[0], dict) and "text" in raw[0]:
            try:
                return json.loads(raw[0]["text"])
            except (json.JSONDecodeError, TypeError):
                return raw
        return raw
    if isinstance(raw, str):
        try:
            return json.loads(raw)
        except json.JSONDecodeError:
            return {}
    return {}

if __name__ == "__main__":
    import asyncio

    async def test():
        provider = AmapToolProvider()
        await provider.startup()
        
        # maps_geo
        # location = await provider.call("maps_geo", address="咖啡店", city="青岛")
        # print("maps_geo 返回:", location, type(location))
        # {'return': [{'country': '中国', 'province': '北京市', 'city': '北京市', 'citycode': '010', 'district': '东城区', 'street': [], 'number': [], 'adcode': '110101', 'location': '116.397463,39.909187', 'level': '兴趣点'}]}

        # maps_regeocode
        # location = "116.403874,39.914888"  # 天安门坐标
        # regeocode = await provider.call("maps_regeocode", location=location)
        # print("maps_regeocode 返回:", regeocode, type(regeocode))
        # {'province': '北京市', 'city': [], 'district': '东城区'}




        # map_text_search
        # poi_data = await provider.call(
        #     "maps_text_search", keywords="", city="青岛", citylimit="true", types='110000'
        # )
        # print("text_search 返回 keys:", list(poi_data.keys())) 
        # print("前 2 个 POI:", poi_data.get("pois", [])[:2])
        # [{'id': 'B000A8UIN8', 'name': '故宫博物院', 'address': '景山前街4号', 'typecode': '110201|140100'}...]

        # maps_around_search
        # around_data = await provider.call(
        #     "maps_around_search", location="116.403874,39.914888", radius="500", keywords="餐厅"
        # )
        # print("around_search 返回 keys:", list(around_data.keys()))
        # print("前 2 个 POI:", around_data.get("pois", [])[:2])
        # [{'id': 'B0FFG9V1R9', 'name': '四季民福烤鸭店(故宫店)', 'address': '南池子大街11号故宫东门旁(距趣拿步行780m)', 'typecode': '050111'}...]




        # maps_direction_transit_integrated_by_address
        # route = await provider.call(
        #     "maps_direction_transit_integrated_by_address", origin_address = '五四广场',
        #             destination_address = '台东步行街', origin_city = '青岛', destination_city = '青岛'
        # )
        # print("direction_transit_integrated_by_address 返回:", route, type(route))


        # result = await provider.geocode("天安门", city="北京")
        # print("geocode 返回:", result, type(result))


        # weather
        weather = await provider.call("maps_weather", city="青岛")
        print("maps_weather 返回:", weather, type(weather))

        await provider.shutdown()

    asyncio.run(test())
