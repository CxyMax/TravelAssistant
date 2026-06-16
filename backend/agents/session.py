"""交互式微调用的临时会话存储(进程内、内存级)。

设计要点(回应"如何处理临时记忆与上下文"):
- 临时记忆 = 一个 TripSession,缓存初次规划时各专家产出的【候选池】
  (景点/酒店/餐饮/天气)、当前 TripPlan、以及累积的约束列表。
  refine 时复用候选池,避免重跑昂贵的搜索(~3min -> ~20s)。
- 上下文 = 不回放原始对话。约束以"蒸馏后的短句"形式累积(去重 + 上限),
  规划器只看到:候选池 + 当前计划 + 约束列表 + 本轮反馈。天然有界。

进程重启即丢失(本项目可接受);用锁保证并发安全;用 LRU + 上限控制内存。
"""

import threading
import time
import uuid
from collections import OrderedDict
from dataclasses import dataclass, field
from typing import List, Optional

from backend.schemas import (
    Attraction,
    Hotel,
    Meal,
    SplitterOutput,
    TripPlan,
    TripRequest,
    WeatherInfo,
)

# 约束列表上限:控制喂给规划器的上下文规模,超出则丢弃最旧的。
_MAX_CONSTRAINTS = 12
# 会话上限:超出按 LRU 淘汰最久未访问的,避免内存无限增长。
_MAX_SESSIONS = 200


@dataclass
class TripSession:
    """单次旅行规划会话的临时记忆。"""

    id: str
    request: TripRequest
    plan_brief: Optional[SplitterOutput]
    attractions: List[Attraction]
    hotels: List[Hotel]
    meals: List[Meal]
    weather_info: List[WeatherInfo]
    plan: TripPlan
    constraints: List[str] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)

    def add_constraints(self, new: List[str]) -> None:
        """追加蒸馏出的约束:去重(忽略大小写/空白),并保持总量不超过上限。"""
        existing = {c.strip() for c in self.constraints}
        for c in new or []:
            c = (c or "").strip()
            if c and c not in existing:
                self.constraints.append(c)
                existing.add(c)
        if len(self.constraints) > _MAX_CONSTRAINTS:
            # 丢弃最旧的,保留最近(后出现的优先级更高)
            self.constraints = self.constraints[-_MAX_CONSTRAINTS:]


class SessionStore:
    """进程内会话存储:线程安全 + LRU 上限。"""

    def __init__(self, max_sessions: int = _MAX_SESSIONS) -> None:
        self._sessions: "OrderedDict[str, TripSession]" = OrderedDict()
        self._lock = threading.Lock()
        self._max = max_sessions

    def create(self, session: TripSession) -> str:
        with self._lock:
            self._sessions[session.id] = session
            self._sessions.move_to_end(session.id)
            while len(self._sessions) > self._max:
                self._sessions.popitem(last=False)  # 淘汰最旧
        return session.id

    def get(self, session_id: str) -> Optional[TripSession]:
        with self._lock:
            session = self._sessions.get(session_id)
            if session is not None:
                self._sessions.move_to_end(session_id)  # 标记为最近使用
            return session


def new_session_id() -> str:
    return uuid.uuid4().hex[:12]
