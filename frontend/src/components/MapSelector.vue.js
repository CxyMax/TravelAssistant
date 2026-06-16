/// <reference types="../../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, onMounted, watch } from 'vue';
import { Empty, message } from 'ant-design-vue';
import AMapLoader from '@amap/amap-jsapi-loader';
import { searchPoi } from '@/api';
const props = defineProps();
const selected = defineModel({ default: () => [] });
const simpleImage = Empty.PRESENTED_IMAGE_SIMPLE;
const keyword = ref('');
const results = ref([]);
const searching = ref(false);
const searched = ref(false);
// ---- 地图(可选,需 VITE_AMAP_JS_KEY)----
const mapEl = ref(null);
const mapReady = ref(false);
let map = null;
let markers = [];
const AMAP_JS_KEY = import.meta.env.VITE_AMAP_JS_KEY;
onMounted(async () => {
    if (!AMAP_JS_KEY)
        return; // 没配 JS key 就只用列表选择,不渲染地图
    try {
        const AMap = await AMapLoader.load({ key: AMAP_JS_KEY, version: '2.0' });
        map = new AMap.Map(mapEl.value, { zoom: 11 });
        mapReady.value = true;
    }
    catch (e) {
        console.warn('AMap 加载失败,降级为列表选择:', e);
    }
});
function renderMarkers() {
    if (!map || !window.AMap)
        return;
    const AMap = window.AMap;
    markers.forEach((m) => map.remove(m));
    markers = [];
    const pts = results.value.filter((p) => p.longitude != null && p.latitude != null);
    pts.forEach((p) => {
        const marker = new AMap.Marker({
            position: [p.longitude, p.latitude],
            title: p.name
        });
        marker.on('click', () => toggle(p));
        map.add(marker);
        markers.push(marker);
    });
    if (pts.length)
        map.setFitView(markers);
}
async function onSearch() {
    const kw = keyword.value.trim();
    if (!kw)
        return;
    if (!props.city) {
        message.warning('请先填写目的地城市');
        return;
    }
    searching.value = true;
    searched.value = true;
    try {
        results.value = await searchPoi(kw, props.city);
        renderMarkers();
    }
    catch (e) {
        message.error(e.message || '搜索失败');
    }
    finally {
        searching.value = false;
    }
}
function isSelected(poi) {
    return selected.value.some((s) => (poi.poi_id && s.poi_id === poi.poi_id) || s.name === poi.name);
}
function toggle(poi) {
    const idx = selected.value.findIndex((s) => (poi.poi_id && s.poi_id === poi.poi_id) || s.name === poi.name);
    if (idx >= 0) {
        selected.value.splice(idx, 1);
    }
    else {
        selected.value.push({
            name: poi.name,
            kind: props.kind,
            poi_id: poi.poi_id,
            address: poi.address,
            longitude: poi.longitude,
            latitude: poi.latitude
        });
    }
}
function remove(i) {
    selected.value.splice(i, 1);
}
// 城市变更时清空已选,避免跨城市误选
watch(() => props.city, () => {
    results.value = [];
    searched.value = false;
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_defaults = {
    'modelValue': () => [],
};
const __VLS_modelEmit = defineEmits();
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['result-item']} */ ;
/** @type {__VLS_StyleScopedClasses['result-item']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "map-selector" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "selector-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "selector-icon" },
});
(__VLS_ctx.icon);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "selector-title" },
});
(__VLS_ctx.title);
if (__VLS_ctx.selected.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "selector-count" },
    });
    (__VLS_ctx.selected.length);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "search-row" },
});
const __VLS_0 = {}.AInputSearch;
/** @type {[typeof __VLS_components.AInputSearch, typeof __VLS_components.aInputSearch, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onSearch': {} },
    value: (__VLS_ctx.keyword),
    placeholder: (__VLS_ctx.placeholder),
    loading: (__VLS_ctx.searching),
    enterButton: "搜索",
}));
const __VLS_2 = __VLS_1({
    ...{ 'onSearch': {} },
    value: (__VLS_ctx.keyword),
    placeholder: (__VLS_ctx.placeholder),
    loading: (__VLS_ctx.searching),
    enterButton: "搜索",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onSearch: (__VLS_ctx.onSearch)
};
var __VLS_3;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ref: "mapEl",
    ...{ class: "map-canvas" },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.mapReady) }, null, null);
/** @type {typeof __VLS_ctx.mapEl} */ ;
if (__VLS_ctx.results.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "result-list" },
    });
    for (const [poi] of __VLS_getVForSourceType((__VLS_ctx.results))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.results.length))
                        return;
                    __VLS_ctx.toggle(poi);
                } },
            key: (poi.poi_id || poi.name),
            ...{ class: "result-item" },
            ...{ class: ({ picked: __VLS_ctx.isSelected(poi) }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "result-main" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "result-name" },
        });
        (poi.name);
        if (poi.category) {
            const __VLS_8 = {}.ATag;
            /** @type {[typeof __VLS_components.ATag, typeof __VLS_components.aTag, typeof __VLS_components.ATag, typeof __VLS_components.aTag, ]} */ ;
            // @ts-ignore
            const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
                color: "default",
            }));
            const __VLS_10 = __VLS_9({
                color: "default",
            }, ...__VLS_functionalComponentArgsRest(__VLS_9));
            __VLS_11.slots.default;
            (poi.category);
            var __VLS_11;
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "result-addr" },
        });
        (poi.address);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "result-action" },
        });
        (__VLS_ctx.isSelected(poi) ? '✓ 已选' : '+ 选择');
    }
}
else if (__VLS_ctx.searched && !__VLS_ctx.searching) {
    const __VLS_12 = {}.AEmpty;
    /** @type {[typeof __VLS_components.AEmpty, typeof __VLS_components.aEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        image: (__VLS_ctx.simpleImage),
        description: "没有找到,换个关键词试试",
    }));
    const __VLS_14 = __VLS_13({
        image: (__VLS_ctx.simpleImage),
        description: "没有找到,换个关键词试试",
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
}
if (__VLS_ctx.selected.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "selected-list" },
    });
    for (const [poi, i] of __VLS_getVForSourceType((__VLS_ctx.selected))) {
        const __VLS_16 = {}.ATag;
        /** @type {[typeof __VLS_components.ATag, typeof __VLS_components.aTag, typeof __VLS_components.ATag, typeof __VLS_components.aTag, ]} */ ;
        // @ts-ignore
        const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
            ...{ 'onClose': {} },
            key: (poi.poi_id || poi.name + i),
            closable: true,
            color: "red",
        }));
        const __VLS_18 = __VLS_17({
            ...{ 'onClose': {} },
            key: (poi.poi_id || poi.name + i),
            closable: true,
            color: "red",
        }, ...__VLS_functionalComponentArgsRest(__VLS_17));
        let __VLS_20;
        let __VLS_21;
        let __VLS_22;
        const __VLS_23 = {
            onClose: (...[$event]) => {
                if (!(__VLS_ctx.selected.length))
                    return;
                __VLS_ctx.remove(i);
            }
        };
        __VLS_19.slots.default;
        (poi.name);
        var __VLS_19;
    }
}
/** @type {__VLS_StyleScopedClasses['map-selector']} */ ;
/** @type {__VLS_StyleScopedClasses['selector-header']} */ ;
/** @type {__VLS_StyleScopedClasses['selector-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['selector-title']} */ ;
/** @type {__VLS_StyleScopedClasses['selector-count']} */ ;
/** @type {__VLS_StyleScopedClasses['search-row']} */ ;
/** @type {__VLS_StyleScopedClasses['map-canvas']} */ ;
/** @type {__VLS_StyleScopedClasses['result-list']} */ ;
/** @type {__VLS_StyleScopedClasses['result-item']} */ ;
/** @type {__VLS_StyleScopedClasses['result-main']} */ ;
/** @type {__VLS_StyleScopedClasses['result-name']} */ ;
/** @type {__VLS_StyleScopedClasses['result-addr']} */ ;
/** @type {__VLS_StyleScopedClasses['result-action']} */ ;
/** @type {__VLS_StyleScopedClasses['selected-list']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            selected: selected,
            simpleImage: simpleImage,
            keyword: keyword,
            results: results,
            searching: searching,
            searched: searched,
            mapEl: mapEl,
            mapReady: mapReady,
            onSearch: onSearch,
            isSelected: isSelected,
            toggle: toggle,
            remove: remove,
        };
    },
    __typeEmits: {},
    __typeProps: {},
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
    __typeEmits: {},
    __typeProps: {},
});
; /* PartiallyEnd: #4569/main.vue */
