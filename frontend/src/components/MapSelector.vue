<template>
  <div class="map-selector">
    <div class="selector-header">
      <span class="selector-icon">{{ icon }}</span>
      <span class="selector-title">{{ title }}</span>
      <span class="selector-count" v-if="selected.length">已选 {{ selected.length }}</span>
    </div>

    <!-- 搜索框 -->
    <div class="search-row">
      <a-input-search
        v-model:value="keyword"
        :placeholder="placeholder"
        :loading="searching"
        enter-button="搜索"
        @search="onSearch"
      />
    </div>

    <!-- 地图(有 JS key 时显示);无 key 时隐藏,仅用列表 -->
    <div v-show="mapReady" ref="mapEl" class="map-canvas"></div>

    <!-- 搜索结果候选 -->
    <div v-if="results.length" class="result-list">
      <div
        v-for="poi in results"
        :key="poi.poi_id || poi.name"
        class="result-item"
        :class="{ picked: isSelected(poi) }"
        @click="toggle(poi)"
      >
        <div class="result-main">
          <span class="result-name">{{ poi.name }}</span>
          <a-tag v-if="poi.category" color="default">{{ poi.category }}</a-tag>
        </div>
        <div class="result-addr">{{ poi.address }}</div>
        <span class="result-action">{{ isSelected(poi) ? '✓ 已选' : '+ 选择' }}</span>
      </div>
    </div>
    <a-empty
      v-else-if="searched && !searching"
      :image="simpleImage"
      description="没有找到,换个关键词试试"
    />

    <!-- 已选列表 -->
    <div v-if="selected.length" class="selected-list">
      <a-tag
        v-for="(poi, i) in selected"
        :key="poi.poi_id || poi.name + i"
        closable
        color="red"
        @close="remove(i)"
      >
        {{ poi.name }}
      </a-tag>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Empty, message } from 'ant-design-vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import { searchPoi } from '@/api'
import type { PoiSearchResult, SelectedPOI, MustGoKind } from '@/type'

const props = defineProps<{
  kind: MustGoKind
  city: string
  title: string
  icon: string
  placeholder: string
}>()

// selected POIs are exposed via v-model
const selected = defineModel<SelectedPOI[]>({ default: () => [] })

const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE
const keyword = ref('')
const results = ref<PoiSearchResult[]>([])
const searching = ref(false)
const searched = ref(false)

// ---- 地图(可选,需 VITE_AMAP_JS_KEY)----
const mapEl = ref<HTMLElement | null>(null)
const mapReady = ref(false)
let map: any = null
let markers: any[] = []
const AMAP_JS_KEY = import.meta.env.VITE_AMAP_JS_KEY as string | undefined

onMounted(async () => {
  if (!AMAP_JS_KEY) return // 没配 JS key 就只用列表选择,不渲染地图
  try {
    const AMap = await AMapLoader.load({ key: AMAP_JS_KEY, version: '2.0' })
    map = new AMap.Map(mapEl.value, { zoom: 11 })
    mapReady.value = true
  } catch (e) {
    console.warn('AMap 加载失败,降级为列表选择:', e)
  }
})

function renderMarkers() {
  if (!map || !(window as any).AMap) return
  const AMap = (window as any).AMap
  markers.forEach((m) => map.remove(m))
  markers = []
  const pts = results.value.filter((p) => p.longitude != null && p.latitude != null)
  pts.forEach((p) => {
    const marker = new AMap.Marker({
      position: [p.longitude, p.latitude],
      title: p.name
    })
    marker.on('click', () => toggle(p))
    map.add(marker)
    markers.push(marker)
  })
  if (pts.length) map.setFitView(markers)
}

async function onSearch() {
  const kw = keyword.value.trim()
  if (!kw) return
  if (!props.city) {
    message.warning('请先填写目的地城市')
    return
  }
  searching.value = true
  searched.value = true
  try {
    results.value = await searchPoi(kw, props.city)
    renderMarkers()
  } catch (e: any) {
    message.error(e.message || '搜索失败')
  } finally {
    searching.value = false
  }
}

function isSelected(poi: PoiSearchResult): boolean {
  return selected.value.some((s) => (poi.poi_id && s.poi_id === poi.poi_id) || s.name === poi.name)
}

function toggle(poi: PoiSearchResult) {
  const idx = selected.value.findIndex(
    (s) => (poi.poi_id && s.poi_id === poi.poi_id) || s.name === poi.name
  )
  if (idx >= 0) {
    selected.value.splice(idx, 1)
  } else {
    selected.value.push({
      name: poi.name,
      kind: props.kind,
      poi_id: poi.poi_id,
      address: poi.address,
      longitude: poi.longitude,
      latitude: poi.latitude
    })
  }
}

function remove(i: number) {
  selected.value.splice(i, 1)
}

// 城市变更时清空已选,避免跨城市误选
watch(
  () => props.city,
  () => {
    results.value = []
    searched.value = false
  }
)
</script>

<style scoped>
.map-selector {
  background: #fff;
  border: 1px solid #eee;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}
.selector-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.selector-icon {
  font-size: 18px;
}
.selector-title {
  font-weight: 600;
  color: #333;
}
.selector-count {
  margin-left: auto;
  font-size: 12px;
  color: #f5222d;
}
.search-row {
  margin-bottom: 12px;
}
.map-canvas {
  width: 100%;
  height: 220px;
  border-radius: 8px;
  margin-bottom: 12px;
}
.result-list {
  max-height: 240px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.result-item {
  position: relative;
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 10px 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.result-item:hover {
  border-color: #667eea;
  background: #f5f7ff;
}
.result-item.picked {
  border-color: #f5222d;
  background: #fff1f0;
}
.result-name {
  font-weight: 600;
  margin-right: 8px;
}
.result-addr {
  font-size: 12px;
  color: #999;
  margin-top: 2px;
}
.result-action {
  position: absolute;
  right: 12px;
  top: 10px;
  font-size: 12px;
  color: #667eea;
}
.selected-list {
  margin-top: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
</style>
