"""全局配置与 LLM 工厂。

从仓库根目录的 .env 读取配置(与 v1 共用同一份 .env)。
"""

import os
from functools import lru_cache
from pathlib import Path

import httpx
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

# backend/ -> TravelAssistant_v2/ -> 仓库根目录
PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env")


class Settings:
    """运行时配置(从环境变量加载)。"""

    def __init__(self) -> None:
        # LLM(DashScope OpenAI 兼容接口)
        self.llm_model_id: str = os.getenv("LLM_MODEL_ID", "qwen3-max")
        self.llm_api_key: str = os.getenv("LLM_API_KEY", "")
        self.llm_base_url: str = os.getenv("LLM_BASE_URL", "")
        self.llm_timeout: float = float(os.getenv("LLM_TIMEOUT", "300"))

        # 高德地图。MCP server 需要的环境变量名是 AMAP_MAPS_API_KEY,
        # 但 .env 里沿用 v1 的 AMAP_API_KEY,这里做一次映射。
        self.amap_api_key: str = os.getenv("AMAP_MAPS_API_KEY") or os.getenv("AMAP_API_KEY", "")
        # self.uvx_cache_path: str = os.getenv("UVX_PATH", "")  # 可选, 默认使用与当前解释器同目录的 uvx

    def validate(self) -> None:
        missing = [
            name
            for name, value in (
                ("LLM_API_KEY", self.llm_api_key),
                ("LLM_BASE_URL", self.llm_base_url),
                ("AMAP_API_KEY", self.amap_api_key),
            )
            if not value
        ]
        if missing:
            raise ValueError(f"缺少必要的环境变量: {', '.join(missing)} (请检查仓库根目录 .env)")


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    settings.validate()
    return settings


from langchain_community.chat_models.tongyi import ChatTongyi  # noqa: F401  (备用 provider)

def make_llm(temperature: float = 0.3, **kwargs) -> ChatOpenAI:

    """创建 ChatOpenAI 实例(DashScope OpenAI 兼容接口)。

    关键点: 本机环境设置了 ALL_PROXY=socks://... ,而 httpx 默认会读取该代理
    并因缺少 socks 依赖而崩溃/连接被重置(ProxyError)。DashScope 是国内 endpoint,
    本就不该走代理,因此显式注入 trust_env=False 的 httpx 客户端,忽略所有 *_PROXY 环境变量。

    注:v2 一度改用 ChatTongyi,但它会读取 ALL_PROXY 导致景点等节点间歇性 ProxyError;
    这里改回 trust_env=False 的 ChatOpenAI(见记忆 socks-proxy-breaks-httpx)。
    """
    settings = get_settings()
    return ChatOpenAI(
        model=settings.llm_model_id,
        api_key=settings.llm_api_key,
        base_url=settings.llm_base_url,
        temperature=temperature,
        timeout=settings.llm_timeout,
        http_client=httpx.Client(trust_env=False, timeout=settings.llm_timeout),
        http_async_client=httpx.AsyncClient(trust_env=False, timeout=settings.llm_timeout),
        **kwargs,
    )
