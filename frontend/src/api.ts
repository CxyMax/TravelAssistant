import axios from 'axios'
import type { TripFormData, TripPlanResponse, PoiSearchResult } from './type'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000' // `||` means 'or' in typescript 

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 300000, // 5分钟超时:/trip/plan 跑整张多智能体图约 2.5-3 分钟,120s 会在后端返回前就中断
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    console.log('发送请求:', config.method?.toUpperCase(), config.url)
    return config
  },
  (error) => {
    console.error('请求错误:', error)
    return Promise.reject(error)
  }
)

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    console.log('收到响应:', response.status, response.config.url)
    return response
  },
  (error) => {
    console.error('响应错误:', error.response?.status, error.message)
    return Promise.reject(error)
  }
)

/**
 * 生成旅行计划
 */
export async function generateTripPlan(formData: TripFormData): Promise<TripPlanResponse> {
  try {
    const response = await apiClient.post<TripPlanResponse>('/trip/plan', formData)
    return response.data
  } catch (error: any) {
    console.error('生成旅行计划失败:', error)
    throw new Error(error.response?.data?.detail || error.message || '生成旅行计划失败')
  }
}

/**
 * 交互式微调:基于已生成行程的反馈,重新规划
 */
export async function refineTripPlan(
  session_id: string,
  feedback: string
): Promise<TripPlanResponse> {
  try {
    const response = await apiClient.post<TripPlanResponse>('/trip/refine', {
      session_id,
      feedback
    })
    return response.data
  } catch (error: any) {
    console.error('微调行程失败:', error)
    // 404 -> 会话过期/服务重启,交给调用方区分处理
    const status = error.response?.status
    const detail = error.response?.data?.detail || error.message || '微调行程失败'
    const e = new Error(detail) as Error & { status?: number }
    e.status = status
    throw e
  }
}

/**
 * 搜索 POI(供地图选择必去/必住/必吃)
 */
export async function searchPoi(keywords: string, city: string): Promise<PoiSearchResult[]> {
  try {
    const response = await apiClient.get<{ success: boolean; pois: PoiSearchResult[] }>(
      '/poi/search',
      { params: { keywords, city, limit: 10 } }
    )
    return response.data.pois || []
  } catch (error: any) {
    console.error('POI 搜索失败:', error)
    throw new Error(error.response?.data?.detail || error.message || 'POI 搜索失败')
  }
}

/**
 * 健康检查
 */
export async function healthCheck(): Promise<any> {
  try {
    const response = await apiClient.get('/')
    return response.data
  } catch (error: any) {
    console.error('健康检查失败:', error)
    throw new Error(error.message || '健康检查失败')
  }
}

export default apiClient
