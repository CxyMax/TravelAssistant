"""Refine router:把用户的修改意见分类为"重排 / 重搜",并蒸馏出累积约束。

一次小而快的 LLM 调用(结构化输出 RouterDecision)。只看当前计划摘要、已有约束、
候选池规模(不灌入完整候选,保持便宜),不回放原始对话。
解析失败时安全降级:research 为空(只重排)+ 把原始反馈当作一条约束。
"""

from typing import Callable, List

from langchain_core.language_models import BaseChatModel

from backend.agents.prompts import REFINE_ROUTER_PROMPT
from backend.schemas import RouterDecision, TripPlan


def _make_structured_router(llm: BaseChatModel):
    try:
        return llm.with_structured_output(RouterDecision, method="function_calling")
    except ValueError as exc:
        if "unsupported arguments" not in str(exc):
            raise
        return llm.with_structured_output(RouterDecision)


def _plan_summary(plan: TripPlan) -> str:
    """当前计划的紧凑摘要(不灌全量数据,控制上下文)。"""
    lines = []
    for d in plan.days:
        attrs = "、".join(a.name for a in d.attractions) or "无"
        hotel = d.hotel.name if d.hotel else "无"
        meals = "/".join(m.name for m in d.meals) or "无"
        lines.append(f"第{d.day_index + 1}天: 景点[{attrs}] 酒店[{hotel}] 餐[{meals}]")
    return "\n".join(lines)


def make_refine_router(llm: BaseChatModel) -> Callable:
    structured = _make_structured_router(llm)

    async def route(
        feedback: str,
        plan: TripPlan,
        constraints: List[str],
        pool_sizes: dict,
    ) -> RouterDecision:
        query = (
            REFINE_ROUTER_PROMPT
            + "\n\n## 当前行程摘要\n"
            + _plan_summary(plan)
            + "\n\n## 已有累积约束\n"
            + ("、".join(constraints) if constraints else "(无)")
            + "\n\n## 现有候选池规模\n"
            + f"景点 {pool_sizes.get('attraction', 0)} 个 / 酒店 {pool_sizes.get('hotel', 0)} 家"
            + f" / 餐厅 {pool_sizes.get('meal', 0)} 家"
            + "\n\n## 用户本次修改意见\n"
            + feedback
        )
        try:
            decision: RouterDecision = await structured.ainvoke(query)
            if decision is None:
                raise ValueError("router 返回空")
            # 至少保留这条反馈作为约束,避免"什么都没记住"
            if not decision.constraints:
                decision.constraints = [feedback.strip()] if feedback.strip() else []
            return decision
        except Exception as exc:
            print(f"⚠️  refine router 失败,降级为仅重排: {exc}")
            return RouterDecision(
                research=[],
                constraints=[feedback.strip()] if feedback.strip() else [],
                note="router 解析失败的降级决策",
            )

    return route
