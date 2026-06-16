// 类型定义(v3)
// 与后端 schemas.py 保持一致,确保前后端数据交互的类型安全。
// v3 变化:TripFormData 删除 preferences;Attraction/Hotel/Meal 新增 must_go;Meal 增加 location/category/poi_id。
export interface Location {
  longitude: number
  latitude: number
}

export interface Attraction {
  poi_id?: string
  name: string
  address: string
  location: Location
  visit_duration?: number
  description?: string
  category?: string // 问号?表示可选字段，对应后端 Pydantic 模型中的Optional。
  rating?: number
  ticket_price?: string
  must_go?: boolean
}

export interface Meal {
  poi_id?: string
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  name: string
  address?: string
  location?: Location
  category?: string
  description?: string
  estimated_cost?: number
  must_go?: boolean
}

export interface Hotel {
  poi_id?: string
  name: string
  address: string
  location?: Location
  price_range?: string
  rating?: string
  type?: string
  estimated_cost?: number
  must_go?: boolean
}

export interface Budget {
  total_attractions: number
  total_hotels: number
  total_meals: number
  total_transportation: number
  total: number
}

export interface DayPlan {
  date: string
  day_index: number
  description: string
  transportation: string
  accommodation: string
  hotel?: Hotel
  attractions: Attraction[]
  meals: Meal[]
}

export interface WeatherInfo {
  date: string
  day_weather: string
  night_weather: string
  day_temp: number
  night_temp: number
  wind_direction: string
  wind_power: string
}

export interface TripPlan {
  city: string
  start_date: string
  end_date: string
  days: DayPlan[]
  weather_info: WeatherInfo[]
  overall_suggestions: string
  budget?: Budget
}

export type MustGoKind = 'attraction' | 'hotel' | 'meal'

// 用户在地图上搜索到的 POI 候选(来自 GET /poi/search)
export interface PoiSearchResult {
  poi_id?: string
  name: string
  address?: string
  category?: string
  longitude?: number
  latitude?: number
}

// 用户选定的必去/必住/必吃 POI(提交给后端 TripRequest.must_go)
export interface SelectedPOI {
  name: string
  kind: MustGoKind
  poi_id?: string
  address?: string
  longitude?: number
  latitude?: number
}

export interface TripFormData {
  city: string
  start_date?: string
  end_date?: string
  travel_days: number
  transportation: string
  accommodation: string
  free_text_input: string
  must_go: SelectedPOI[]
}

export interface TripPlanResponse {
  success: boolean
  message: string
  data?: TripPlan
  session_id?: string
}

export interface RefineRequest {
  session_id: string
  feedback: string
}
