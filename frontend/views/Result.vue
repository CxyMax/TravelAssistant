<template>
  <main class="result-page">
    <a-page-header title="旅行计划结果" sub-title="智能旅行助手 v3" @back="router.push('/')" />

    <section class="result-content">
      <a-empty v-if="!tripPlan" description="暂无旅行计划,请先返回填写表单" />

      <template v-else>
        <!-- 概览 -->
        <a-card :bordered="false" class="overview-card">
          <h1 class="trip-title">🗺️ {{ tripPlan.city }} 行程</h1>
          <p class="trip-dates">
            <template v-if="tripPlan.start_date && tripPlan.end_date">
              {{ tripPlan.start_date }} 至 {{ tripPlan.end_date }} ·
            </template>
            共 {{ tripPlan.days.length }} 天
          </p>
          <p v-if="tripPlan.overall_suggestions" class="trip-suggestion">
            💡 {{ tripPlan.overall_suggestions }}
          </p>

          <!-- 天气条 -->
          <div v-if="tripPlan.weather_info?.length" class="weather-strip">
            <div v-for="w in tripPlan.weather_info" :key="w.date" class="weather-chip">
              <div class="weather-date">{{ formatMonthDay(w.date) }}</div>
              <div class="weather-main">{{ w.day_weather }}</div>
              <div class="weather-temp">{{ w.night_temp }}° ~ {{ w.day_temp }}°</div>
            </div>
          </div>

          <!-- 预算 -->
          <div v-if="tripPlan.budget" class="budget-row">
            <a-tag color="blue">景点 ¥{{ tripPlan.budget.total_attractions }}</a-tag>
            <a-tag color="purple">酒店 ¥{{ tripPlan.budget.total_hotels }}</a-tag>
            <a-tag color="orange">餐饮 ¥{{ tripPlan.budget.total_meals }}</a-tag>
            <a-tag color="green">交通 ¥{{ tripPlan.budget.total_transportation }}</a-tag>
            <a-tag color="red" class="budget-total">总计 ¥{{ tripPlan.budget.total }}</a-tag>
          </div>
        </a-card>

        <!-- 每日行程 -->
        <a-card
          v-for="day in tripPlan.days"
          :key="day.day_index"
          :bordered="false"
          class="day-card"
        >
          <template #title>
            <span class="day-title">第 {{ day.day_index + 1 }} 天</span>
            <span v-if="day.date" class="day-date">{{ day.date }}</span>
          </template>

          <p v-if="day.description" class="day-desc">{{ day.description }}</p>

          <!-- 酒店 -->
          <div v-if="day.hotel" class="block">
            <div class="block-title">🏨 住宿</div>
            <div class="hotel-item">
              <span class="item-name">{{ day.hotel.name }}</span>
              <a-tag v-if="day.hotel.must_go" color="red">必住</a-tag>
              <span v-if="day.hotel.rating" class="muted">评分 {{ day.hotel.rating }}</span>
              <span v-if="day.hotel.estimated_cost" class="muted">约 ¥{{ day.hotel.estimated_cost }}/晚</span>
              <div class="muted addr">{{ day.hotel.address }}</div>
            </div>
          </div>

          <!-- 景点 -->
          <div v-if="day.attractions?.length" class="block">
            <div class="block-title">📍 景点(按路线顺序)</div>
            <a-timeline>
              <a-timeline-item
                v-for="(attr, i) in day.attractions"
                :key="i"
                :color="attr.must_go ? 'red' : 'blue'"
              >
                <span class="item-name">{{ attr.name }}</span>
                <a-tag v-if="attr.must_go" color="red">必去</a-tag>
                <a-tag v-if="attr.category" color="default">{{ attr.category }}</a-tag>
                <span v-if="attr.visit_duration" class="muted">约 {{ attr.visit_duration }} 分钟</span>
                <span v-if="attr.ticket_price" class="muted">{{ attr.ticket_price }}</span>
                <div v-if="attr.description" class="muted">{{ attr.description }}</div>
                <div class="muted addr">{{ attr.address }}</div>
              </a-timeline-item>
            </a-timeline>
          </div>

          <!-- 餐饮 -->
          <div v-if="day.meals?.length" class="block">
            <div class="block-title">🍜 餐饮</div>
            <div class="meals-grid">
              <div v-for="(meal, i) in day.meals" :key="i" class="meal-item">
                <div class="meal-type">{{ mealTypeLabel(meal.type) }}</div>
                <div>
                  <span class="item-name">{{ meal.name }}</span>
                  <a-tag v-if="meal.must_go" color="red">必吃</a-tag>
                </div>
                <div v-if="meal.estimated_cost" class="muted">约 ¥{{ meal.estimated_cost }}</div>
                <div v-if="meal.address" class="muted addr">{{ meal.address }}</div>
              </div>
            </div>
          </div>

          <p class="day-foot muted">交通: {{ day.transportation }}</p>
        </a-card>

        <!-- 交互式微调面板 -->
        <a-card :bordered="false" class="refine-card">
          <div class="refine-title">✨ 不满意?告诉我怎么改</div>
          <p class="refine-hint">
            例如:第二天太赶,少安排一个景点 / 换更便宜的酒店 / 多安排海边 / 想吃川菜。
            点名的必去地点会一直保留。
          </p>
          <a-textarea
            v-model:value="feedback"
            placeholder="描述你的修改意见..."
            :rows="3"
            :disabled="refining"
            class="refine-input"
          />
          <a-button
            type="primary"
            size="large"
            block
            :loading="refining"
            class="refine-button"
            @click="handleRefine"
          >
            {{ refining ? '正在重新规划...' : '🔄 重新生成行程' }}
          </a-button>
        </a-card>
      </template>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { refineTripPlan } from '@/api'
import type { TripPlan } from '@/type'

const router = useRouter()

function loadPlan(): TripPlan | null {
  const rawPlan = sessionStorage.getItem('tripPlan')
  return rawPlan ? JSON.parse(rawPlan) : null
}

const tripPlan = ref<TripPlan | null>(loadPlan())
const sessionId = ref<string>(sessionStorage.getItem('tripSessionId') || '')

// 微调面板状态
const feedback = ref('')
const refining = ref(false)

async function handleRefine() {
  const text = feedback.value.trim()
  if (!text) {
    message.warning('请先描述你想怎么改')
    return
  }
  if (!sessionId.value) {
    message.error('会话已失效,请返回重新生成行程')
    return
  }
  refining.value = true
  try {
    const resp = await refineTripPlan(sessionId.value, text)
    if (resp.success && resp.data) {
      tripPlan.value = resp.data
      sessionStorage.setItem('tripPlan', JSON.stringify(resp.data))
      feedback.value = ''
      message.success('已根据你的反馈更新行程')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      message.error(resp.message || '微调失败')
    }
  } catch (error: any) {
    if (error.status === 404) {
      message.error('会话已过期(服务可能已重启),请返回重新生成行程')
    } else {
      message.error(error.message || '微调失败,请稍后重试')
    }
  } finally {
    refining.value = false
  }
}

function formatMonthDay(date: string): string {
  const parts = date?.split('-')
  return parts && parts.length === 3 ? `${parts[1]}/${parts[2]}` : date
}

function mealTypeLabel(type: string): string {
  const map: Record<string, string> = {
    breakfast: '早餐',
    lunch: '午餐',
    dinner: '晚餐',
    snack: '小吃'
  }
  return map[type] || type
}
</script>

<style scoped>
.result-page {
  min-height: 100vh;
  background: #f5f7fa;
  padding-bottom: 40px;
}

.result-content {
  max-width: 1000px;
  margin: 0 auto;
  padding: 24px;
}

.overview-card {
  border-radius: 16px;
  margin-bottom: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
}

.overview-card :deep(.ant-card-body) {
  color: #fff;
}

.trip-title {
  font-size: 28px;
  font-weight: 700;
  margin: 0 0 8px;
  color: #fff;
}

.trip-dates {
  font-size: 15px;
  opacity: 0.9;
  margin: 0 0 12px;
}

.trip-suggestion {
  background: rgba(255, 255, 255, 0.15);
  padding: 12px 16px;
  border-radius: 10px;
  margin: 0 0 16px;
  line-height: 1.6;
}

.weather-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 16px;
}

.weather-chip {
  background: rgba(255, 255, 255, 0.18);
  border-radius: 10px;
  padding: 8px 14px;
  text-align: center;
  min-width: 84px;
}

.weather-date { font-size: 13px; opacity: 0.85; }
.weather-main { font-size: 15px; font-weight: 600; }
.weather-temp { font-size: 13px; opacity: 0.9; }

.budget-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.budget-total {
  font-weight: 700;
}

.day-card {
  border-radius: 16px;
  margin-bottom: 20px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}

.day-title {
  font-size: 18px;
  font-weight: 700;
  color: #667eea;
  margin-right: 12px;
}

.day-date { color: #999; font-size: 14px; }
.day-desc { color: #555; margin-bottom: 16px; }

.block { margin-bottom: 18px; }

.block-title {
  font-size: 15px;
  font-weight: 600;
  color: #333;
  margin-bottom: 10px;
}

.item-name { font-weight: 600; color: #222; margin-right: 8px; }
.muted { color: #888; font-size: 13px; margin-right: 8px; }
.addr { display: block; margin-top: 2px; }

.hotel-item {
  background: #faf9ff;
  border-radius: 10px;
  padding: 12px 14px;
}

.meals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 12px;
}

.meal-item {
  background: #fffaf5;
  border: 1px solid #ffe7d1;
  border-radius: 10px;
  padding: 12px 14px;
}

.meal-type {
  font-size: 12px;
  color: #fa8c16;
  font-weight: 700;
  margin-bottom: 6px;
}

.day-foot {
  margin: 8px 0 0;
  padding-top: 12px;
  border-top: 1px dashed #eee;
}

/* 交互式微调面板 */
.refine-card {
  border-radius: 16px;
  margin-top: 8px;
  border: 2px dashed #667eea;
  background: #fafbff;
}

.refine-title {
  font-size: 18px;
  font-weight: 700;
  color: #667eea;
  margin-bottom: 8px;
}

.refine-hint {
  color: #888;
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 12px;
}

.refine-input {
  border-radius: 10px;
  margin-bottom: 12px;
}

.refine-button {
  height: 48px;
  border-radius: 24px;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
}
</style>
