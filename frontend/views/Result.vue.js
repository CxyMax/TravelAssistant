/// <reference types="../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { refineTripPlan } from '@/api';
const router = useRouter();
function loadPlan() {
    const rawPlan = sessionStorage.getItem('tripPlan');
    return rawPlan ? JSON.parse(rawPlan) : null;
}
const tripPlan = ref(loadPlan());
const sessionId = ref(sessionStorage.getItem('tripSessionId') || '');
// 微调面板状态
const feedback = ref('');
const refining = ref(false);
async function handleRefine() {
    const text = feedback.value.trim();
    if (!text) {
        message.warning('请先描述你想怎么改');
        return;
    }
    if (!sessionId.value) {
        message.error('会话已失效,请返回重新生成行程');
        return;
    }
    refining.value = true;
    try {
        const resp = await refineTripPlan(sessionId.value, text);
        if (resp.success && resp.data) {
            tripPlan.value = resp.data;
            sessionStorage.setItem('tripPlan', JSON.stringify(resp.data));
            feedback.value = '';
            message.success('已根据你的反馈更新行程');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        else {
            message.error(resp.message || '微调失败');
        }
    }
    catch (error) {
        if (error.status === 404) {
            message.error('会话已过期(服务可能已重启),请返回重新生成行程');
        }
        else {
            message.error(error.message || '微调失败,请稍后重试');
        }
    }
    finally {
        refining.value = false;
    }
}
function formatMonthDay(date) {
    const parts = date?.split('-');
    return parts && parts.length === 3 ? `${parts[1]}/${parts[2]}` : date;
}
function mealTypeLabel(type) {
    const map = {
        breakfast: '早餐',
        lunch: '午餐',
        dinner: '晚餐',
        snack: '小吃'
    };
    return map[type] || type;
}
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['overview-card']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "result-page" },
});
const __VLS_0 = {}.APageHeader;
/** @type {[typeof __VLS_components.APageHeader, typeof __VLS_components.aPageHeader, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ 'onBack': {} },
    title: "旅行计划结果",
    subTitle: "智能旅行助手 v3",
}));
const __VLS_2 = __VLS_1({
    ...{ 'onBack': {} },
    title: "旅行计划结果",
    subTitle: "智能旅行助手 v3",
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
let __VLS_4;
let __VLS_5;
let __VLS_6;
const __VLS_7 = {
    onBack: (...[$event]) => {
        __VLS_ctx.router.push('/');
    }
};
var __VLS_3;
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "result-content" },
});
if (!__VLS_ctx.tripPlan) {
    const __VLS_8 = {}.AEmpty;
    /** @type {[typeof __VLS_components.AEmpty, typeof __VLS_components.aEmpty, ]} */ ;
    // @ts-ignore
    const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
        description: "暂无旅行计划,请先返回填写表单",
    }));
    const __VLS_10 = __VLS_9({
        description: "暂无旅行计划,请先返回填写表单",
    }, ...__VLS_functionalComponentArgsRest(__VLS_9));
}
else {
    const __VLS_12 = {}.ACard;
    /** @type {[typeof __VLS_components.ACard, typeof __VLS_components.aCard, typeof __VLS_components.ACard, typeof __VLS_components.aCard, ]} */ ;
    // @ts-ignore
    const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
        bordered: (false),
        ...{ class: "overview-card" },
    }));
    const __VLS_14 = __VLS_13({
        bordered: (false),
        ...{ class: "overview-card" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_13));
    __VLS_15.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
        ...{ class: "trip-title" },
    });
    (__VLS_ctx.tripPlan.city);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "trip-dates" },
    });
    if (__VLS_ctx.tripPlan.start_date && __VLS_ctx.tripPlan.end_date) {
        (__VLS_ctx.tripPlan.start_date);
        (__VLS_ctx.tripPlan.end_date);
    }
    (__VLS_ctx.tripPlan.days.length);
    if (__VLS_ctx.tripPlan.overall_suggestions) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "trip-suggestion" },
        });
        (__VLS_ctx.tripPlan.overall_suggestions);
    }
    if (__VLS_ctx.tripPlan.weather_info?.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "weather-strip" },
        });
        for (const [w] of __VLS_getVForSourceType((__VLS_ctx.tripPlan.weather_info))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (w.date),
                ...{ class: "weather-chip" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "weather-date" },
            });
            (__VLS_ctx.formatMonthDay(w.date));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "weather-main" },
            });
            (w.day_weather);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "weather-temp" },
            });
            (w.night_temp);
            (w.day_temp);
        }
    }
    if (__VLS_ctx.tripPlan.budget) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "budget-row" },
        });
        const __VLS_16 = {}.ATag;
        /** @type {[typeof __VLS_components.ATag, typeof __VLS_components.aTag, typeof __VLS_components.ATag, typeof __VLS_components.aTag, ]} */ ;
        // @ts-ignore
        const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
            color: "blue",
        }));
        const __VLS_18 = __VLS_17({
            color: "blue",
        }, ...__VLS_functionalComponentArgsRest(__VLS_17));
        __VLS_19.slots.default;
        (__VLS_ctx.tripPlan.budget.total_attractions);
        var __VLS_19;
        const __VLS_20 = {}.ATag;
        /** @type {[typeof __VLS_components.ATag, typeof __VLS_components.aTag, typeof __VLS_components.ATag, typeof __VLS_components.aTag, ]} */ ;
        // @ts-ignore
        const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
            color: "purple",
        }));
        const __VLS_22 = __VLS_21({
            color: "purple",
        }, ...__VLS_functionalComponentArgsRest(__VLS_21));
        __VLS_23.slots.default;
        (__VLS_ctx.tripPlan.budget.total_hotels);
        var __VLS_23;
        const __VLS_24 = {}.ATag;
        /** @type {[typeof __VLS_components.ATag, typeof __VLS_components.aTag, typeof __VLS_components.ATag, typeof __VLS_components.aTag, ]} */ ;
        // @ts-ignore
        const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
            color: "orange",
        }));
        const __VLS_26 = __VLS_25({
            color: "orange",
        }, ...__VLS_functionalComponentArgsRest(__VLS_25));
        __VLS_27.slots.default;
        (__VLS_ctx.tripPlan.budget.total_meals);
        var __VLS_27;
        const __VLS_28 = {}.ATag;
        /** @type {[typeof __VLS_components.ATag, typeof __VLS_components.aTag, typeof __VLS_components.ATag, typeof __VLS_components.aTag, ]} */ ;
        // @ts-ignore
        const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
            color: "green",
        }));
        const __VLS_30 = __VLS_29({
            color: "green",
        }, ...__VLS_functionalComponentArgsRest(__VLS_29));
        __VLS_31.slots.default;
        (__VLS_ctx.tripPlan.budget.total_transportation);
        var __VLS_31;
        const __VLS_32 = {}.ATag;
        /** @type {[typeof __VLS_components.ATag, typeof __VLS_components.aTag, typeof __VLS_components.ATag, typeof __VLS_components.aTag, ]} */ ;
        // @ts-ignore
        const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
            color: "red",
            ...{ class: "budget-total" },
        }));
        const __VLS_34 = __VLS_33({
            color: "red",
            ...{ class: "budget-total" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_33));
        __VLS_35.slots.default;
        (__VLS_ctx.tripPlan.budget.total);
        var __VLS_35;
    }
    var __VLS_15;
    for (const [day] of __VLS_getVForSourceType((__VLS_ctx.tripPlan.days))) {
        const __VLS_36 = {}.ACard;
        /** @type {[typeof __VLS_components.ACard, typeof __VLS_components.aCard, typeof __VLS_components.ACard, typeof __VLS_components.aCard, ]} */ ;
        // @ts-ignore
        const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
            key: (day.day_index),
            bordered: (false),
            ...{ class: "day-card" },
        }));
        const __VLS_38 = __VLS_37({
            key: (day.day_index),
            bordered: (false),
            ...{ class: "day-card" },
        }, ...__VLS_functionalComponentArgsRest(__VLS_37));
        __VLS_39.slots.default;
        {
            const { title: __VLS_thisSlot } = __VLS_39.slots;
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "day-title" },
            });
            (day.day_index + 1);
            if (day.date) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "day-date" },
                });
                (day.date);
            }
        }
        if (day.description) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "day-desc" },
            });
            (day.description);
        }
        if (day.hotel) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "block" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "block-title" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "hotel-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "item-name" },
            });
            (day.hotel.name);
            if (day.hotel.must_go) {
                const __VLS_40 = {}.ATag;
                /** @type {[typeof __VLS_components.ATag, typeof __VLS_components.aTag, typeof __VLS_components.ATag, typeof __VLS_components.aTag, ]} */ ;
                // @ts-ignore
                const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
                    color: "red",
                }));
                const __VLS_42 = __VLS_41({
                    color: "red",
                }, ...__VLS_functionalComponentArgsRest(__VLS_41));
                __VLS_43.slots.default;
                var __VLS_43;
            }
            if (day.hotel.rating) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "muted" },
                });
                (day.hotel.rating);
            }
            if (day.hotel.estimated_cost) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "muted" },
                });
                (day.hotel.estimated_cost);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "muted addr" },
            });
            (day.hotel.address);
        }
        if (day.attractions?.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "block" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "block-title" },
            });
            const __VLS_44 = {}.ATimeline;
            /** @type {[typeof __VLS_components.ATimeline, typeof __VLS_components.aTimeline, typeof __VLS_components.ATimeline, typeof __VLS_components.aTimeline, ]} */ ;
            // @ts-ignore
            const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({}));
            const __VLS_46 = __VLS_45({}, ...__VLS_functionalComponentArgsRest(__VLS_45));
            __VLS_47.slots.default;
            for (const [attr, i] of __VLS_getVForSourceType((day.attractions))) {
                const __VLS_48 = {}.ATimelineItem;
                /** @type {[typeof __VLS_components.ATimelineItem, typeof __VLS_components.aTimelineItem, typeof __VLS_components.ATimelineItem, typeof __VLS_components.aTimelineItem, ]} */ ;
                // @ts-ignore
                const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
                    key: (i),
                    color: (attr.must_go ? 'red' : 'blue'),
                }));
                const __VLS_50 = __VLS_49({
                    key: (i),
                    color: (attr.must_go ? 'red' : 'blue'),
                }, ...__VLS_functionalComponentArgsRest(__VLS_49));
                __VLS_51.slots.default;
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "item-name" },
                });
                (attr.name);
                if (attr.must_go) {
                    const __VLS_52 = {}.ATag;
                    /** @type {[typeof __VLS_components.ATag, typeof __VLS_components.aTag, typeof __VLS_components.ATag, typeof __VLS_components.aTag, ]} */ ;
                    // @ts-ignore
                    const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
                        color: "red",
                    }));
                    const __VLS_54 = __VLS_53({
                        color: "red",
                    }, ...__VLS_functionalComponentArgsRest(__VLS_53));
                    __VLS_55.slots.default;
                    var __VLS_55;
                }
                if (attr.category) {
                    const __VLS_56 = {}.ATag;
                    /** @type {[typeof __VLS_components.ATag, typeof __VLS_components.aTag, typeof __VLS_components.ATag, typeof __VLS_components.aTag, ]} */ ;
                    // @ts-ignore
                    const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({
                        color: "default",
                    }));
                    const __VLS_58 = __VLS_57({
                        color: "default",
                    }, ...__VLS_functionalComponentArgsRest(__VLS_57));
                    __VLS_59.slots.default;
                    (attr.category);
                    var __VLS_59;
                }
                if (attr.visit_duration) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "muted" },
                    });
                    (attr.visit_duration);
                }
                if (attr.ticket_price) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                        ...{ class: "muted" },
                    });
                    (attr.ticket_price);
                }
                if (attr.description) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: "muted" },
                    });
                    (attr.description);
                }
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "muted addr" },
                });
                (attr.address);
                var __VLS_51;
            }
            var __VLS_47;
        }
        if (day.meals?.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "block" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "block-title" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "meals-grid" },
            });
            for (const [meal, i] of __VLS_getVForSourceType((day.meals))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    key: (i),
                    ...{ class: "meal-item" },
                });
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                    ...{ class: "meal-type" },
                });
                (__VLS_ctx.mealTypeLabel(meal.type));
                __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "item-name" },
                });
                (meal.name);
                if (meal.must_go) {
                    const __VLS_60 = {}.ATag;
                    /** @type {[typeof __VLS_components.ATag, typeof __VLS_components.aTag, typeof __VLS_components.ATag, typeof __VLS_components.aTag, ]} */ ;
                    // @ts-ignore
                    const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
                        color: "red",
                    }));
                    const __VLS_62 = __VLS_61({
                        color: "red",
                    }, ...__VLS_functionalComponentArgsRest(__VLS_61));
                    __VLS_63.slots.default;
                    var __VLS_63;
                }
                if (meal.estimated_cost) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: "muted" },
                    });
                    (meal.estimated_cost);
                }
                if (meal.address) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                        ...{ class: "muted addr" },
                    });
                    (meal.address);
                }
            }
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "day-foot muted" },
        });
        (day.transportation);
        var __VLS_39;
    }
    const __VLS_64 = {}.ACard;
    /** @type {[typeof __VLS_components.ACard, typeof __VLS_components.aCard, typeof __VLS_components.ACard, typeof __VLS_components.aCard, ]} */ ;
    // @ts-ignore
    const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
        bordered: (false),
        ...{ class: "refine-card" },
    }));
    const __VLS_66 = __VLS_65({
        bordered: (false),
        ...{ class: "refine-card" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_65));
    __VLS_67.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "refine-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "refine-hint" },
    });
    const __VLS_68 = {}.ATextarea;
    /** @type {[typeof __VLS_components.ATextarea, typeof __VLS_components.aTextarea, ]} */ ;
    // @ts-ignore
    const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
        value: (__VLS_ctx.feedback),
        placeholder: "描述你的修改意见...",
        rows: (3),
        disabled: (__VLS_ctx.refining),
        ...{ class: "refine-input" },
    }));
    const __VLS_70 = __VLS_69({
        value: (__VLS_ctx.feedback),
        placeholder: "描述你的修改意见...",
        rows: (3),
        disabled: (__VLS_ctx.refining),
        ...{ class: "refine-input" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_69));
    const __VLS_72 = {}.AButton;
    /** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
    // @ts-ignore
    const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
        ...{ 'onClick': {} },
        type: "primary",
        size: "large",
        block: true,
        loading: (__VLS_ctx.refining),
        ...{ class: "refine-button" },
    }));
    const __VLS_74 = __VLS_73({
        ...{ 'onClick': {} },
        type: "primary",
        size: "large",
        block: true,
        loading: (__VLS_ctx.refining),
        ...{ class: "refine-button" },
    }, ...__VLS_functionalComponentArgsRest(__VLS_73));
    let __VLS_76;
    let __VLS_77;
    let __VLS_78;
    const __VLS_79 = {
        onClick: (__VLS_ctx.handleRefine)
    };
    __VLS_75.slots.default;
    (__VLS_ctx.refining ? '正在重新规划...' : '🔄 重新生成行程');
    var __VLS_75;
    var __VLS_67;
}
/** @type {__VLS_StyleScopedClasses['result-page']} */ ;
/** @type {__VLS_StyleScopedClasses['result-content']} */ ;
/** @type {__VLS_StyleScopedClasses['overview-card']} */ ;
/** @type {__VLS_StyleScopedClasses['trip-title']} */ ;
/** @type {__VLS_StyleScopedClasses['trip-dates']} */ ;
/** @type {__VLS_StyleScopedClasses['trip-suggestion']} */ ;
/** @type {__VLS_StyleScopedClasses['weather-strip']} */ ;
/** @type {__VLS_StyleScopedClasses['weather-chip']} */ ;
/** @type {__VLS_StyleScopedClasses['weather-date']} */ ;
/** @type {__VLS_StyleScopedClasses['weather-main']} */ ;
/** @type {__VLS_StyleScopedClasses['weather-temp']} */ ;
/** @type {__VLS_StyleScopedClasses['budget-row']} */ ;
/** @type {__VLS_StyleScopedClasses['budget-total']} */ ;
/** @type {__VLS_StyleScopedClasses['day-card']} */ ;
/** @type {__VLS_StyleScopedClasses['day-title']} */ ;
/** @type {__VLS_StyleScopedClasses['day-date']} */ ;
/** @type {__VLS_StyleScopedClasses['day-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['block-title']} */ ;
/** @type {__VLS_StyleScopedClasses['hotel-item']} */ ;
/** @type {__VLS_StyleScopedClasses['item-name']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['addr']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['block-title']} */ ;
/** @type {__VLS_StyleScopedClasses['item-name']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['addr']} */ ;
/** @type {__VLS_StyleScopedClasses['block']} */ ;
/** @type {__VLS_StyleScopedClasses['block-title']} */ ;
/** @type {__VLS_StyleScopedClasses['meals-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['meal-item']} */ ;
/** @type {__VLS_StyleScopedClasses['meal-type']} */ ;
/** @type {__VLS_StyleScopedClasses['item-name']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['addr']} */ ;
/** @type {__VLS_StyleScopedClasses['day-foot']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['refine-card']} */ ;
/** @type {__VLS_StyleScopedClasses['refine-title']} */ ;
/** @type {__VLS_StyleScopedClasses['refine-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['refine-input']} */ ;
/** @type {__VLS_StyleScopedClasses['refine-button']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            router: router,
            tripPlan: tripPlan,
            feedback: feedback,
            refining: refining,
            handleRefine: handleRefine,
            formatMonthDay: formatMonthDay,
            mealTypeLabel: mealTypeLabel,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
