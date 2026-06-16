"""FastAPI 应用入口(v3)。

运行: 在 TravelAssistant_v3/ 目录下执行
    uvicorn backend.api.main:app --reload --port 8000

Web 层位于 backend/api/(main.py 应用入口 + service.py 服务封装)。
请求体删除了 preferences 字段;free_text_input 成为唯一软偏好信号。
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from backend.schemas import RefineRequest, TripPlanResponse, TripRequest
from backend.api.service import TripPlannerService


@asynccontextmanager
async def lifespan(app: FastAPI):
    """应用启动时初始化服务(拉起 MCP server),关闭时清理。"""
    app.state.service = await TripPlannerService.create()
    try:
        yield
    finally:
        await app.state.service.close()


app = FastAPI(title="Travel Assistant API v3", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Travel Assistant API v3 is running"}


@app.get(
    "/poi/search",
    summary="搜索 POI",
    description="供前端地图搜索景点/酒店/餐厅候选(必去/必住/必吃选择器),返回带真实坐标的 POI 列表",
)
async def search_poi(keywords: str, city: str = "", limit: int = 10):
    if not keywords.strip():
        return {"success": True, "pois": []}
    try:
        service: TripPlannerService = app.state.service
        pois = await service.search_pois(keywords, city=city, limit=min(max(limit, 1), 25))
        return {"success": True, "pois": pois}
    except Exception as exc:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"POI 搜索失败: {exc}")


@app.post(
    "/trip/plan",
    response_model=TripPlanResponse,
    summary="生成旅行计划",
    description="多智能体协作:splitter 拆分自由文本 -> 景点/天气/酒店/餐饮并行检索 -> 规划专家组装(含必去项)",
)
async def plan_trip(request: TripRequest):
    print(
        f"\n{'=' * 60}\n📥 旅行规划请求: {request.city} "
        f"{request.start_date}~{request.end_date} {request.travel_days}天\n{'=' * 60}"
    )
    try:
        service: TripPlannerService = app.state.service
        session_id, plan = await service.plan_trip(request)
        return TripPlanResponse(
            success=True, message="旅行计划生成成功", data=plan, session_id=session_id
        )
    except Exception as exc:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"生成旅行计划失败: {exc}")


@app.post(
    "/trip/refine",
    response_model=TripPlanResponse,
    summary="交互式微调行程",
    description="带 session_id + 反馈意见,基于已缓存的候选池重新规划(必要时重搜部分专家)",
)
async def refine_trip(req: RefineRequest):
    print(f"\n{'=' * 60}\n🔧 行程微调: session={req.session_id} 反馈={req.feedback}\n{'=' * 60}")
    service: TripPlannerService = app.state.service
    try:
        plan = await service.refine(req.session_id, req.feedback)
        return TripPlanResponse(
            success=True, message="行程已根据反馈更新", data=plan, session_id=req.session_id
        )
    except KeyError:
        raise HTTPException(
            status_code=404, detail="会话不存在或已过期(可能服务已重启),请重新生成行程"
        )
    except Exception as exc:
        import traceback

        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"微调行程失败: {exc}")
