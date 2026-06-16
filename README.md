# 智能旅行助手 TravelAssistant v3

基于**多智能体协作**与**高德地图(Amap)MCP** 的旅行行程规划系统。
输入目的地和一句话需求,系统自动检索真实的景点 / 酒店 / 餐厅 / 天气,
编排出带路线、餐饮与预算的逐日行程;对结果不满意还能用自然语言**交互式微调**。

## 功能特性

- 🧭 **一句话规划**:用自由文本描述偏好(如"想逛市区特色咖啡店,最好在海边;想吃海鲜"),
  系统自动拆解成各专家的搜索关键词。
- 🗺️ **真实数据**:景点 / 酒店 / 餐厅 / 天气全部来自高德地图 MCP,带真实坐标,严禁编造。
- 📍 **地图选点**:在前端地图上搜索并勾选"必去景点 / 必住酒店 / 必吃餐厅",规划时**强制排入**
  并作为当天路线的就近锚点。
- 📅 **日期可选**:可只填天数;不填日期则跳过天气查询,按"第 N 天"组织行程。
- ✨ **交互式微调**:结果不满意时输入修改意见(如"第二天太赶""换便宜点的酒店"),
  系统复用已检索的候选池**快速重排**,必要时才重新搜索个别类别。
- 🍜 **三餐编排**:从真实餐厅候选里为每天配早 / 中 / 晚餐,并汇总预算。

## 整体架构

```
                     前端 (Vue 3 + Vite + ant-design-vue)
     Home 表单(目的地 / 日期可选 / 自由描述) + 地图选点(必去 / 必住 / 必吃)
                     Result 结果页 + 交互式微调面板
                                │  HTTP (axios)
                                ▼
                   FastAPI (backend/api/main.py)
        POST /trip/plan    POST /trip/refine    GET /poi/search
                                │
                       TripPlannerService
                                │
                  LangGraph 多智能体图(全异步)
            START → splitter → ┌─ attraction ─┐
                               ├─ weather ────┤ → planner → END
                               ├─ hotel ──────┤
                               └─ meal ───────┘
                                │
                高德 Amap MCP server(本地 vendor 副本,单一持久会话)
```

- **splitter**:把自由描述拆成各专家的搜索关键词(只做一次)。
- **四个专家**(景点 / 天气 / 酒店 / 餐饮):**并行**调用高德 MCP 工具,产出带真实坐标的结构化候选。
- **planner**:只做编排——分配每日行程、配三餐、选酒店、算预算,并强制排入用户点选的 `must_go`。
- **LLM**:DashScope(通义千问 `qwen`,OpenAI 兼容接口)。

## 技术栈

| 层 | 技术 |
|---|---|
| 编排 | LangGraph `StateGraph`(并行 fan-out + barrier) |
| LLM | DashScope / 通义千问(`langchain-openai`,结构化输出) |
| 工具 | 高德地图 MCP(`langchain-mcp-adapters`,异步持久会话) |
| 后端 | FastAPI + Uvicorn(异步) |
| 前端 | Vue 3 + Vite + TypeScript + ant-design-vue |

## 相比初代版本(v1)的改进

v1 是最初的公开版本(基于 `hello_agents`),能跑通但有几个结构性问题。v3 做了彻底重写并新增了多项能力。

### 1. Agent 编排:串行阻塞 → 并行异步

- **v1**:`景点 → 天气 → 酒店 → 规划` 四个 Agent **依次同步执行**(`agent.run()` 阻塞),总耗时是各段之和。
- **v3**:LangGraph `StateGraph`,四个专家从 `START` **并行 fan-out**,规划器靠多入边天然形成 barrier,
  等全部完成后再组装。整体延迟大幅下降。

### 2. MCP 工具:每次调用重启子进程 → 单一持久会话

- **v1**:`hello_agents.MCPTool` 同步执行,且**每次工具调用都重新拉起一个 `uvx amap-mcp-server` 子进程**,开销巨大。
- **v3**:官方 `langchain-mcp-adapters`,应用启动时打开**一个持久 MCP 会话**,所有工具均为原生 `async`、复用同一子进程;
  并用信号量做全局并发限流 + QPS 超限退避重试,适配高德免费配额。

### 3. 规划器:解析自由文本 + 编造坐标 → 纯编排

- **v1**:三个专家只返回**自由文本**,规划 Agent 要自己解析、**编造坐标**、再手拼整份 JSON——既慢又不稳,坐标常是假的。
- **v3**:专家通过 `with_structured_output` 直接产出**结构化数据 + 真实坐标**(经 `maps_search_detail` / `maps_geo`);
  规划器只负责分配天数、选酒店、配餐、算预算。

### 4. 偏好与"必去":标签勾选 → 自由文本拆分 + 地图选点

- **v1**:用 `preferences` 标签勾选;无法精确指定"必去某地"。
- **v3**:删除标签,改用 **splitter** 把 `free_text_input` 拆成各专家搜索关键词,真正驱动检索;
  另外用户可在**前端地图**搜索并选定真实 POI(`must_go`,带坐标),规划时**保证排入**且作为路线锚点。

### 5. 全新能力:交互式微调

- **v1**:不满意只能从头再来。
- **v3**:`/trip/plan` 返回 `session_id` 并缓存候选池;用户带反馈调用 `/trip/refine`,
  **复用候选池只重新规划**(~30s),必要时才重搜个别专家。偏好以**有界约束列表**累积(不回放原始对话)。

> 仓库内 `TravelAssistant_v3/` 即当前版本;v1 重写过程中还有一个中间版本 v2(LangGraph 化),此处不展开。

## 交互式微调(refine):临时记忆与上下文设计

`/trip/plan` 返回 `session_id`,并把本次的【候选池】(景点 / 酒店 / 餐厅 / 天气)+ 计划缓存为一个进程内 `TripSession`。
用户不满意时,带 `session_id` + 自由反馈调用 `POST /trip/refine`:

1. **router**(`agents/router.py`,一次小而快的 LLM 调用)判定:能否用现有候选池重排,还是要重搜某些专家(并给新关键词);
   同时把反馈**蒸馏成简短约束**。
2. 若需重搜 → 只重跑被点名的专家(复用搜索基础设施),替换候选池对应切片;否则跳过。
3. **只重跑 planner**:候选池 + 累积约束 + 本轮反馈 → 新计划。复用昂贵搜索,通常 ~30s(重排)或 ~100s(含重搜),而非整图 ~3min。

**临时记忆**缓存在 `TripSession`(进程内 `SessionStore`,LRU 上限、线程安全,重启即失效 → 前端遇 404 提示重新生成)。
**上下文**不回放原始对话——只维护一个**有界约束列表**(去重 + 上限 12,后出现优先级更高),
规划器只看到候选池 + 当前计划摘要 + 约束 + 本轮反馈。

## 快速开始

依赖已装在 conda 环境 `travel_assistant`(Python 3.10)。配置放在 `TravelAssistant_v3/.env`
(复制 `.env.example` 后填入真实值):`LLM_MODEL_ID` / `LLM_API_KEY` / `LLM_BASE_URL` / `AMAP_API_KEY`。

**后端**

```bash
conda activate travel_assistant
cd TravelAssistant_v3
uvicorn backend.api.main:app --reload --port 8000
```

> 高德 MCP server 用 vendor 内的本地副本以 `python -m amap_mcp_server` 拉起(无需 uvx)。

调用示例:

```bash
curl -X POST http://localhost:8000/trip/plan \
  -H "Content-Type: application/json" \
  -d '{"city":"青岛","travel_days":3,"transportation":"公共交通","accommodation":"舒适型",
       "free_text_input":"想逛青岛市区特色咖啡店,最好在海边;想吃海鲜","must_go":[]}'
```

**前端**(Vue 3 + Vite,改自 v1 并新增地图选点与微调面板)

```bash
cd TravelAssistant_v3/frontend
npm install
npm run dev      # 默认 http://localhost:5173,通过 VITE_API_BASE_URL 指向后端
npm run build    # 生产构建(含 vue-tsc 类型检查)
```

可选:`frontend/.env` 里设 `VITE_AMAP_JS_KEY` 渲染可视地图(不设则地图选点降级为"搜索 + 列表选择",
搜索始终走后端 `GET /poi/search`,用服务端 key)。

## 接口

| 方法 | 路径 | 说明 |
|---|---|---|
| `POST` | `/trip/plan` | 生成行程,返回 `{ data: TripPlan, session_id }` |
| `POST` | `/trip/refine` | 带 `{ session_id, feedback }` 微调已生成行程 |
| `GET` | `/poi/search?keywords=&city=` | 供前端地图搜索候选 POI(带真实坐标) |

## 模块

- `config.py` — 读取 `TravelAssistant_v3/.env`;`make_llm()`(trust_env=False 的 ChatOpenAI,绕开本机 SOCKS 代理)。
- `services/mcp_tools.py` — `AmapToolProvider`:MCP 会话生命周期、按名取工具、`geocode()` 坐标兜底、`search_pois()` 供地图搜索。
- `schemas.py` — Pydantic 模型(请求 / 响应 + 专家结构化输出 + `SelectedPOI` / `SplitterOutput` / `RefineRequest` / `RouterDecision`)。
- `agents/` — `prompts.py`、`state.py`、`splitter.py`(关键词拆分)、`specialists.py`(四专家)、
  `planner.py`(编排 + must_go + 累积约束 + 兜底)、`router.py`(微调路由)、`session.py`(会话临时记忆)、`graph.py`(并行图)。
- `api/` — `service.py`(`TripPlannerService`:持有图、节点回调与会话存储)、`main.py`(FastAPI 应用)。

## 备注

- LLM 走 DashScope 国内 endpoint;本机若设了 `ALL_PROXY=socks://...` 会让 httpx 崩溃,故 `make_llm()` 用 `trust_env=False` 忽略代理。
- `/trip/plan` 跑整张多智能体图约 2.5–3 分钟(各专家并行,但每个有多次串行 LLM + amap 往返,且受高德并发限流);前端 axios 超时已设为 5 分钟。
- 会话为进程内存,服务重启即失效——前端遇 404 会提示重新生成。
