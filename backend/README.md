# TravelAssistant v3 — Backend

异步、基于 **LangGraph** 的多智能体旅行规划后端。在 v2 基础上增强了自由文本处理、新增餐饮专家、
并支持用户在前端地图上选定"必去/必住/必吃"地点。**v2 目录保持不变**。

## 相比 v2 的改进

| 主题 | v2 | v3 |
|---|---|---|
| **自由文本** | `free_text_input` 只给 planner,不影响景点/酒店检索;另有 `preferences` 标签 | **删除 `preferences`**;新增 **splitter agent** 把 `free_text_input` 拆成各专家**搜索关键词**,真正驱动每个专家的搜索 |
| **餐饮** | 由 planner 凭空建议 | 新增 **meal 专家**(`make_meal_node`),用高德搜真实餐厅,planner 从候选里配三餐 |
| **指定地点** | 不支持 | 用户在**前端地图**搜索并选择真实 POI(`TripRequest.must_go: List[SelectedPOI]`,带真实坐标);planner 把它们并入候选并 **必须**排入,当天路线以必去景点为锚点就近排序;结构化失败时兜底也强制注入。后端新增 `GET /poi/search` 供地图搜索 |
| **入口** | `backend/fastapi/main.py`(与 README 命令不一致) | Web 层归入 `backend/api/`(`main.py` 应用 + `service.py` 服务);入口 `backend.api.main:app` |
| **代理** | 改回 `ChatTongyi`,会读 `ALL_PROXY` 间歇 ProxyError | 改回 `trust_env=False` 的 `ChatOpenAI`(见记忆 socks-proxy) |

## 架构

```
      START
        |
     splitter            (拆分 free_text_input -> 各专家搜索关键词)
        |
   +----+----+-----+-----+
   |    |     |     |
attract weather hotel meal   (并行, 异步, 各自带 amap 工具)
   |    |     |     |
   +----+----+-----+-----+
        |
     planner             (四者完成后组装 TripPlan;并入用户地图选定的 must_go 并强制保证)
        |
       END
```

> **日期可选**:`start_date`/`end_date` 可不填,`travel_days` 必填。未提供日期时
> **weather 节点直接跳过**(返回空),计划的 `start_date`/`end_date` 与每天的 `date` 均留空,
> 行程仅按"第 N 天"组织(共 `travel_days` 天)。

> must_go 不在图里产生,而是来自请求体(用户在前端地图选定的真实 POI),由 planner 注入候选并强制排入。

## 模块

- `config.py` — 读取 `TravelAssistant_v3/.env`;`make_llm()`(trust_env=False 的 ChatOpenAI)。
- `services/mcp_tools.py` — `AmapToolProvider`:MCP 会话、按名取工具、`geocode()` 坐标兜底、`search_pois()` 供前端地图搜索候选 POI。
- `schemas.py` — Pydantic 模型(请求/响应 + 专家结构化输出 + `SelectedPOI` + `SplitterOutput` + `RefineRequest` + `RouterDecision`)。
- `agents/` — `prompts.py`(提示词)、`state.py`、`splitter.py`(关键词拆分)、`specialists.py`(四专家,纯关键词搜索)、`planner.py`(规划 + must_go + 累积约束 constraints + 兜底)、`router.py`(微调路由:判定重排/重搜 + 蒸馏约束)、`session.py`(交互式会话临时记忆)、`graph.py`。
- `api/` — `service.py`(`TripPlannerService`:持有图、各节点回调与会话存储;`plan_trip()`/`refine()`/`search_pois()`)、`main.py`(FastAPI:`POST /trip/plan`、`POST /trip/refine`、`GET /poi/search`)。

## 交互式微调(refine)

`/trip/plan` 返回 `session_id`,并把本次的【候选池】(景点/酒店/餐饮/天气)+ 计划缓存为一个进程内
`TripSession`。用户不满意时,带 `session_id` + 自由反馈调用 `POST /trip/refine`:

1. **router**(`agents/router.py`,一次小而快的 LLM 调用)判定:能否用现有候选池重排,还是要重搜
   某些专家(并给新关键词);同时把反馈**蒸馏成简短约束**。
2. 若需重搜 → 只重跑被点名的专家(复用搜索基础设施),替换候选池对应切片;否则跳过。
3. **只重跑 planner**:候选池 + 累积约束 + 本轮反馈 → 新计划。复用昂贵搜索,通常 ~30s(重排)
   或 ~100s(含重搜),而非整图 ~3min。

**临时记忆 / 上下文处理**:候选池缓存在 `TripSession`(进程内 `SessionStore`,LRU 上限、线程安全,
重启即失效 → 前端遇 404 提示重新生成)。上下文不回放原始对话——只维护一个**有界的约束列表**
(去重 + 上限 12,后出现优先级更高),规划器只看到候选池 + 当前计划摘要 + 约束 + 本轮反馈。

## 运行

```bash
conda activate travel_assistant
cd TravelAssistant_v3
uvicorn backend.api.main:app --reload --port 8000
```

环境变量放在 `TravelAssistant_v3/.env`(`LLM_MODEL_ID` / `LLM_API_KEY` / `LLM_BASE_URL` / `AMAP_API_KEY`)。
高德 MCP server 用 vendor 内的本地副本以 `python -m amap_mcp_server` 拉起(无需 uvx)。

调用示例:

```bash
curl -X POST http://localhost:8000/trip/plan \
  -H "Content-Type: application/json" \
  -d '{"city":"青岛","start_date":"2026-06-11","end_date":"2026-06-13","travel_days":3,
       "transportation":"公共交通","accommodation":"舒适型",
       "free_text_input":"想逛青岛市区特色咖啡店,最好在海边;住桔子酒店,必去栈桥,想吃海鲜"}'
```

## 前端

`TravelAssistant_v3/frontend/`(Vue 3 + Vite + ant-design-vue),改自 v1:

```bash
cd TravelAssistant_v3/frontend
npm install
npm run dev      # 开发, 默认 http://localhost:5173, 通过 VITE_API_BASE_URL 指向后端
npm run build    # 生产构建(含 vue-tsc 类型检查)
```

环境变量(可选,放 `frontend/.env`):
- `VITE_API_BASE_URL` — 后端地址(默认 `http://localhost:8000`)。
- `VITE_AMAP_JS_KEY` — 高德 **JS API** key。配置后地图选择器会渲染可视地图与标记;
  不配置则降级为"搜索 + 列表选择"(搜索始终走后端 `GET /poi/search`,用服务端 key,无需 JS key)。

- 表单删除了"旅行偏好"勾选,改为一句话自由描述(软偏好,驱动各专家搜索关键词)。
- **日期可选**:开始/结束日期可不填;不填时旅行天数改为手动输入框(`a-input-number`),提交后端会跳过天气查询。
- 新增地图选择器(`components/MapSelector.vue`):分别搜索并选择**必去景点 / 必住酒店 / 必吃餐厅**,
  选中的真实 POI(带坐标)随 `must_go` 提交,规划时强制排入并作为路线锚点。
- 结果页渲染每日景点(必去高亮)、三餐、酒店、天气条(无日期时不显示)与预算汇总。
- 结果页底部有**交互式微调面板**:输入修改意见 → 调用 `/trip/refine`(带 `session_id`)→ 原地更新行程;会话过期(404)时提示重新生成。
