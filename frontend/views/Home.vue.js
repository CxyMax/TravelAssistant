/// <reference types="../node_modules/.vue-global-types/vue_3.5_0_0_0.d.ts" />
import { ref, reactive, watch, computed } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { generateTripPlan } from '@/api';
import MapSelector from '@/components/MapSelector.vue';
const router = useRouter();
const loading = ref(false);
const loadingProgress = ref(0);
const loadingStatus = ref('');
const formData = reactive({
    city: '',
    start_date: null,
    end_date: null,
    travel_days: 1,
    transportation: '公共交通',
    accommodation: '经济型酒店',
    free_text_input: ''
});
// 地图选择的必去/必住/必吃(每个选择器一组)
const attractionPicks = ref([]);
const hotelPicks = ref([]);
const mealPicks = ref([]);
// 是否已选完整日期区间。未选时旅行天数改为手动填写。
const hasDates = computed(() => !!(formData.start_date && formData.end_date));
// 监听日期变化:两个日期都选齐时自动计算旅行天数。
watch([() => formData.start_date, () => formData.end_date], ([start, end]) => {
    if (start && end) {
        const days = end.diff(start, 'day') + 1;
        if (days > 0 && days <= 30) {
            formData.travel_days = days;
        }
        else if (days > 30) {
            message.warning('旅行天数不能超过30天');
            formData.end_date = null;
        }
        else {
            message.warning('结束日期不能早于开始日期');
            formData.end_date = null;
        }
    }
});
const handleSubmit = async () => {
    // 日期可选:若只填了一个日期,提示补齐或都清空
    if (!!formData.start_date !== !!formData.end_date) {
        message.error('请同时选择开始和结束日期,或都留空并填写旅行天数');
        return;
    }
    if (!hasDates.value && (!formData.travel_days || formData.travel_days < 1)) {
        message.error('未选择日期时,请填写旅行天数');
        return;
    }
    loading.value = true;
    loadingProgress.value = 0;
    loadingStatus.value = '正在初始化...';
    // 模拟进度更新
    const progressInterval = setInterval(() => {
        if (loadingProgress.value < 90) {
            loadingProgress.value += 10;
            // 更新状态文本
            if (loadingProgress.value <= 30) {
                loadingStatus.value = '🔍 正在搜索景点...';
            }
            else if (loadingProgress.value <= 50) {
                loadingStatus.value = '🌤️ 正在查询天气...';
            }
            else if (loadingProgress.value <= 70) {
                loadingStatus.value = '🏨 正在推荐酒店...';
            }
            else {
                loadingStatus.value = '📋 正在生成行程计划...';
            }
        }
    }, 500);
    try {
        const requestData = {
            city: formData.city,
            start_date: formData.start_date ? formData.start_date.format('YYYY-MM-DD') : '',
            end_date: formData.end_date ? formData.end_date.format('YYYY-MM-DD') : '',
            travel_days: formData.travel_days,
            transportation: formData.transportation,
            accommodation: formData.accommodation,
            free_text_input: formData.free_text_input,
            must_go: [...attractionPicks.value, ...hotelPicks.value, ...mealPicks.value]
        };
        const response = await generateTripPlan(requestData);
        clearInterval(progressInterval);
        loadingProgress.value = 100;
        loadingStatus.value = '✅ 完成!';
        if (response.success && response.data) {
            // 保存到sessionStorage
            sessionStorage.setItem('tripPlan', JSON.stringify(response.data));
            // 保存会话 id,供结果页交互式微调使用
            sessionStorage.setItem('tripSessionId', response.session_id || '');
            message.success('旅行计划生成成功!');
            // 短暂延迟后跳转
            setTimeout(() => {
                router.push('/result');
            }, 500);
        }
        else {
            message.error(response.message || '生成失败');
        }
    }
    catch (error) {
        clearInterval(progressInterval);
        message.error(error.message || '生成旅行计划失败,请稍后重试');
    }
    finally {
        setTimeout(() => {
            loading.value = false;
            loadingProgress.value = 0;
            loadingStatus.value = '';
        }, 1000);
    }
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['form-section']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-input']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-input']} */ ;
/** @type {__VLS_StyleScopedClasses['ant-input']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-input']} */ ;
/** @type {__VLS_StyleScopedClasses['ant-picker']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-input']} */ ;
/** @type {__VLS_StyleScopedClasses['ant-input']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-input']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-select']} */ ;
/** @type {__VLS_StyleScopedClasses['ant-select-selector']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-select']} */ ;
/** @type {__VLS_StyleScopedClasses['ant-select-selector']} */ ;
/** @type {__VLS_StyleScopedClasses['days-display-compact']} */ ;
/** @type {__VLS_StyleScopedClasses['days-display-compact']} */ ;
/** @type {__VLS_StyleScopedClasses['preference-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['ant-checkbox-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['preference-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['free-text-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['ant-input']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-textarea']} */ ;
/** @type {__VLS_StyleScopedClasses['ant-input']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-textarea']} */ ;
/** @type {__VLS_StyleScopedClasses['ant-input']} */ ;
/** @type {__VLS_StyleScopedClasses['submit-button']} */ ;
/** @type {__VLS_StyleScopedClasses['submit-button']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "home-container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "page-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "icon-wrapper" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "icon" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "page-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "page-subtitle" },
});
const __VLS_0 = {}.ACard;
/** @type {[typeof __VLS_components.ACard, typeof __VLS_components.aCard, typeof __VLS_components.ACard, typeof __VLS_components.aCard, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    ...{ class: "form-card" },
    bordered: (false),
}));
const __VLS_2 = __VLS_1({
    ...{ class: "form-card" },
    bordered: (false),
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
const __VLS_4 = {}.AForm;
/** @type {[typeof __VLS_components.AForm, typeof __VLS_components.aForm, typeof __VLS_components.AForm, typeof __VLS_components.aForm, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    ...{ 'onFinish': {} },
    model: (__VLS_ctx.formData),
    layout: "vertical",
}));
const __VLS_6 = __VLS_5({
    ...{ 'onFinish': {} },
    model: (__VLS_ctx.formData),
    layout: "vertical",
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
let __VLS_8;
let __VLS_9;
let __VLS_10;
const __VLS_11 = {
    onFinish: (__VLS_ctx.handleSubmit)
};
__VLS_7.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "section-icon" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "section-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "free-text-hint" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
const __VLS_12 = {}.ARow;
/** @type {[typeof __VLS_components.ARow, typeof __VLS_components.aRow, typeof __VLS_components.ARow, typeof __VLS_components.aRow, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    gutter: (24),
}));
const __VLS_14 = __VLS_13({
    gutter: (24),
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
__VLS_15.slots.default;
const __VLS_16 = {}.ACol;
/** @type {[typeof __VLS_components.ACol, typeof __VLS_components.aCol, typeof __VLS_components.ACol, typeof __VLS_components.aCol, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    span: (8),
}));
const __VLS_18 = __VLS_17({
    span: (8),
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_19.slots.default;
const __VLS_20 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_21 = __VLS_asFunctionalComponent(__VLS_20, new __VLS_20({
    name: "city",
    rules: ([{ required: true, message: '请输入目的地城市' }]),
}));
const __VLS_22 = __VLS_21({
    name: "city",
    rules: ([{ required: true, message: '请输入目的地城市' }]),
}, ...__VLS_functionalComponentArgsRest(__VLS_21));
__VLS_23.slots.default;
{
    const { label: __VLS_thisSlot } = __VLS_23.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "form-label" },
    });
}
const __VLS_24 = {}.AInput;
/** @type {[typeof __VLS_components.AInput, typeof __VLS_components.aInput, typeof __VLS_components.AInput, typeof __VLS_components.aInput, ]} */ ;
// @ts-ignore
const __VLS_25 = __VLS_asFunctionalComponent(__VLS_24, new __VLS_24({
    value: (__VLS_ctx.formData.city),
    placeholder: "例如: 北京",
    size: "large",
    ...{ class: "custom-input" },
}));
const __VLS_26 = __VLS_25({
    value: (__VLS_ctx.formData.city),
    placeholder: "例如: 北京",
    size: "large",
    ...{ class: "custom-input" },
}, ...__VLS_functionalComponentArgsRest(__VLS_25));
__VLS_27.slots.default;
{
    const { prefix: __VLS_thisSlot } = __VLS_27.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ style: {} },
    });
}
var __VLS_27;
var __VLS_23;
var __VLS_19;
const __VLS_28 = {}.ACol;
/** @type {[typeof __VLS_components.ACol, typeof __VLS_components.aCol, typeof __VLS_components.ACol, typeof __VLS_components.aCol, ]} */ ;
// @ts-ignore
const __VLS_29 = __VLS_asFunctionalComponent(__VLS_28, new __VLS_28({
    span: (6),
}));
const __VLS_30 = __VLS_29({
    span: (6),
}, ...__VLS_functionalComponentArgsRest(__VLS_29));
__VLS_31.slots.default;
const __VLS_32 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_33 = __VLS_asFunctionalComponent(__VLS_32, new __VLS_32({
    name: "start_date",
}));
const __VLS_34 = __VLS_33({
    name: "start_date",
}, ...__VLS_functionalComponentArgsRest(__VLS_33));
__VLS_35.slots.default;
{
    const { label: __VLS_thisSlot } = __VLS_35.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "optional-tag" },
    });
}
const __VLS_36 = {}.ADatePicker;
/** @type {[typeof __VLS_components.ADatePicker, typeof __VLS_components.aDatePicker, ]} */ ;
// @ts-ignore
const __VLS_37 = __VLS_asFunctionalComponent(__VLS_36, new __VLS_36({
    value: (__VLS_ctx.formData.start_date),
    ...{ style: {} },
    size: "large",
    ...{ class: "custom-input" },
    placeholder: "选择日期",
}));
const __VLS_38 = __VLS_37({
    value: (__VLS_ctx.formData.start_date),
    ...{ style: {} },
    size: "large",
    ...{ class: "custom-input" },
    placeholder: "选择日期",
}, ...__VLS_functionalComponentArgsRest(__VLS_37));
var __VLS_35;
var __VLS_31;
const __VLS_40 = {}.ACol;
/** @type {[typeof __VLS_components.ACol, typeof __VLS_components.aCol, typeof __VLS_components.ACol, typeof __VLS_components.aCol, ]} */ ;
// @ts-ignore
const __VLS_41 = __VLS_asFunctionalComponent(__VLS_40, new __VLS_40({
    span: (6),
}));
const __VLS_42 = __VLS_41({
    span: (6),
}, ...__VLS_functionalComponentArgsRest(__VLS_41));
__VLS_43.slots.default;
const __VLS_44 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_45 = __VLS_asFunctionalComponent(__VLS_44, new __VLS_44({
    name: "end_date",
}));
const __VLS_46 = __VLS_45({
    name: "end_date",
}, ...__VLS_functionalComponentArgsRest(__VLS_45));
__VLS_47.slots.default;
{
    const { label: __VLS_thisSlot } = __VLS_47.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "form-label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "optional-tag" },
    });
}
const __VLS_48 = {}.ADatePicker;
/** @type {[typeof __VLS_components.ADatePicker, typeof __VLS_components.aDatePicker, ]} */ ;
// @ts-ignore
const __VLS_49 = __VLS_asFunctionalComponent(__VLS_48, new __VLS_48({
    value: (__VLS_ctx.formData.end_date),
    ...{ style: {} },
    size: "large",
    ...{ class: "custom-input" },
    placeholder: "选择日期",
}));
const __VLS_50 = __VLS_49({
    value: (__VLS_ctx.formData.end_date),
    ...{ style: {} },
    size: "large",
    ...{ class: "custom-input" },
    placeholder: "选择日期",
}, ...__VLS_functionalComponentArgsRest(__VLS_49));
var __VLS_47;
var __VLS_43;
const __VLS_52 = {}.ACol;
/** @type {[typeof __VLS_components.ACol, typeof __VLS_components.aCol, typeof __VLS_components.ACol, typeof __VLS_components.aCol, ]} */ ;
// @ts-ignore
const __VLS_53 = __VLS_asFunctionalComponent(__VLS_52, new __VLS_52({
    span: (4),
}));
const __VLS_54 = __VLS_53({
    span: (4),
}, ...__VLS_functionalComponentArgsRest(__VLS_53));
__VLS_55.slots.default;
const __VLS_56 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_57 = __VLS_asFunctionalComponent(__VLS_56, new __VLS_56({}));
const __VLS_58 = __VLS_57({}, ...__VLS_functionalComponentArgsRest(__VLS_57));
__VLS_59.slots.default;
{
    const { label: __VLS_thisSlot } = __VLS_59.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "form-label" },
    });
}
if (!__VLS_ctx.hasDates) {
    const __VLS_60 = {}.AInputNumber;
    /** @type {[typeof __VLS_components.AInputNumber, typeof __VLS_components.aInputNumber, ]} */ ;
    // @ts-ignore
    const __VLS_61 = __VLS_asFunctionalComponent(__VLS_60, new __VLS_60({
        value: (__VLS_ctx.formData.travel_days),
        min: (1),
        max: (30),
        size: "large",
        ...{ style: {} },
        ...{ class: "custom-input days-input" },
        addonAfter: "天",
    }));
    const __VLS_62 = __VLS_61({
        value: (__VLS_ctx.formData.travel_days),
        min: (1),
        max: (30),
        size: "large",
        ...{ style: {} },
        ...{ class: "custom-input days-input" },
        addonAfter: "天",
    }, ...__VLS_functionalComponentArgsRest(__VLS_61));
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "days-display-compact" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "days-value" },
    });
    (__VLS_ctx.formData.travel_days);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "days-unit" },
    });
}
var __VLS_59;
var __VLS_55;
var __VLS_15;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "section-icon" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "section-title" },
});
const __VLS_64 = {}.ARow;
/** @type {[typeof __VLS_components.ARow, typeof __VLS_components.aRow, typeof __VLS_components.ARow, typeof __VLS_components.aRow, ]} */ ;
// @ts-ignore
const __VLS_65 = __VLS_asFunctionalComponent(__VLS_64, new __VLS_64({
    gutter: (24),
}));
const __VLS_66 = __VLS_65({
    gutter: (24),
}, ...__VLS_functionalComponentArgsRest(__VLS_65));
__VLS_67.slots.default;
const __VLS_68 = {}.ACol;
/** @type {[typeof __VLS_components.ACol, typeof __VLS_components.aCol, typeof __VLS_components.ACol, typeof __VLS_components.aCol, ]} */ ;
// @ts-ignore
const __VLS_69 = __VLS_asFunctionalComponent(__VLS_68, new __VLS_68({
    span: (12),
}));
const __VLS_70 = __VLS_69({
    span: (12),
}, ...__VLS_functionalComponentArgsRest(__VLS_69));
__VLS_71.slots.default;
const __VLS_72 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_73 = __VLS_asFunctionalComponent(__VLS_72, new __VLS_72({
    name: "transportation",
}));
const __VLS_74 = __VLS_73({
    name: "transportation",
}, ...__VLS_functionalComponentArgsRest(__VLS_73));
__VLS_75.slots.default;
{
    const { label: __VLS_thisSlot } = __VLS_75.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "form-label" },
    });
}
const __VLS_76 = {}.ASelect;
/** @type {[typeof __VLS_components.ASelect, typeof __VLS_components.aSelect, typeof __VLS_components.ASelect, typeof __VLS_components.aSelect, ]} */ ;
// @ts-ignore
const __VLS_77 = __VLS_asFunctionalComponent(__VLS_76, new __VLS_76({
    value: (__VLS_ctx.formData.transportation),
    size: "large",
    ...{ class: "custom-select" },
}));
const __VLS_78 = __VLS_77({
    value: (__VLS_ctx.formData.transportation),
    size: "large",
    ...{ class: "custom-select" },
}, ...__VLS_functionalComponentArgsRest(__VLS_77));
__VLS_79.slots.default;
const __VLS_80 = {}.ASelectOption;
/** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
// @ts-ignore
const __VLS_81 = __VLS_asFunctionalComponent(__VLS_80, new __VLS_80({
    value: "公共交通",
}));
const __VLS_82 = __VLS_81({
    value: "公共交通",
}, ...__VLS_functionalComponentArgsRest(__VLS_81));
__VLS_83.slots.default;
var __VLS_83;
const __VLS_84 = {}.ASelectOption;
/** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
// @ts-ignore
const __VLS_85 = __VLS_asFunctionalComponent(__VLS_84, new __VLS_84({
    value: "自驾",
}));
const __VLS_86 = __VLS_85({
    value: "自驾",
}, ...__VLS_functionalComponentArgsRest(__VLS_85));
__VLS_87.slots.default;
var __VLS_87;
const __VLS_88 = {}.ASelectOption;
/** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
// @ts-ignore
const __VLS_89 = __VLS_asFunctionalComponent(__VLS_88, new __VLS_88({
    value: "步行",
}));
const __VLS_90 = __VLS_89({
    value: "步行",
}, ...__VLS_functionalComponentArgsRest(__VLS_89));
__VLS_91.slots.default;
var __VLS_91;
const __VLS_92 = {}.ASelectOption;
/** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
// @ts-ignore
const __VLS_93 = __VLS_asFunctionalComponent(__VLS_92, new __VLS_92({
    value: "混合",
}));
const __VLS_94 = __VLS_93({
    value: "混合",
}, ...__VLS_functionalComponentArgsRest(__VLS_93));
__VLS_95.slots.default;
var __VLS_95;
var __VLS_79;
var __VLS_75;
var __VLS_71;
const __VLS_96 = {}.ACol;
/** @type {[typeof __VLS_components.ACol, typeof __VLS_components.aCol, typeof __VLS_components.ACol, typeof __VLS_components.aCol, ]} */ ;
// @ts-ignore
const __VLS_97 = __VLS_asFunctionalComponent(__VLS_96, new __VLS_96({
    span: (12),
}));
const __VLS_98 = __VLS_97({
    span: (12),
}, ...__VLS_functionalComponentArgsRest(__VLS_97));
__VLS_99.slots.default;
const __VLS_100 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_101 = __VLS_asFunctionalComponent(__VLS_100, new __VLS_100({
    name: "accommodation",
}));
const __VLS_102 = __VLS_101({
    name: "accommodation",
}, ...__VLS_functionalComponentArgsRest(__VLS_101));
__VLS_103.slots.default;
{
    const { label: __VLS_thisSlot } = __VLS_103.slots;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "form-label" },
    });
}
const __VLS_104 = {}.ASelect;
/** @type {[typeof __VLS_components.ASelect, typeof __VLS_components.aSelect, typeof __VLS_components.ASelect, typeof __VLS_components.aSelect, ]} */ ;
// @ts-ignore
const __VLS_105 = __VLS_asFunctionalComponent(__VLS_104, new __VLS_104({
    value: (__VLS_ctx.formData.accommodation),
    size: "large",
    ...{ class: "custom-select" },
}));
const __VLS_106 = __VLS_105({
    value: (__VLS_ctx.formData.accommodation),
    size: "large",
    ...{ class: "custom-select" },
}, ...__VLS_functionalComponentArgsRest(__VLS_105));
__VLS_107.slots.default;
const __VLS_108 = {}.ASelectOption;
/** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
// @ts-ignore
const __VLS_109 = __VLS_asFunctionalComponent(__VLS_108, new __VLS_108({
    value: "经济型酒店",
}));
const __VLS_110 = __VLS_109({
    value: "经济型酒店",
}, ...__VLS_functionalComponentArgsRest(__VLS_109));
__VLS_111.slots.default;
var __VLS_111;
const __VLS_112 = {}.ASelectOption;
/** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
// @ts-ignore
const __VLS_113 = __VLS_asFunctionalComponent(__VLS_112, new __VLS_112({
    value: "舒适型酒店",
}));
const __VLS_114 = __VLS_113({
    value: "舒适型酒店",
}, ...__VLS_functionalComponentArgsRest(__VLS_113));
__VLS_115.slots.default;
var __VLS_115;
const __VLS_116 = {}.ASelectOption;
/** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
// @ts-ignore
const __VLS_117 = __VLS_asFunctionalComponent(__VLS_116, new __VLS_116({
    value: "豪华酒店",
}));
const __VLS_118 = __VLS_117({
    value: "豪华酒店",
}, ...__VLS_functionalComponentArgsRest(__VLS_117));
__VLS_119.slots.default;
var __VLS_119;
const __VLS_120 = {}.ASelectOption;
/** @type {[typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, typeof __VLS_components.ASelectOption, typeof __VLS_components.aSelectOption, ]} */ ;
// @ts-ignore
const __VLS_121 = __VLS_asFunctionalComponent(__VLS_120, new __VLS_120({
    value: "民宿",
}));
const __VLS_122 = __VLS_121({
    value: "民宿",
}, ...__VLS_functionalComponentArgsRest(__VLS_121));
__VLS_123.slots.default;
var __VLS_123;
var __VLS_107;
var __VLS_103;
var __VLS_99;
var __VLS_67;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "section-icon" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "section-title" },
});
const __VLS_124 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_125 = __VLS_asFunctionalComponent(__VLS_124, new __VLS_124({
    name: "free_text_input",
}));
const __VLS_126 = __VLS_125({
    name: "free_text_input",
}, ...__VLS_functionalComponentArgsRest(__VLS_125));
__VLS_127.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "free-text-hint" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
const __VLS_128 = {}.ATextarea;
/** @type {[typeof __VLS_components.ATextarea, typeof __VLS_components.aTextarea, ]} */ ;
// @ts-ignore
const __VLS_129 = __VLS_asFunctionalComponent(__VLS_128, new __VLS_128({
    value: (__VLS_ctx.formData.free_text_input),
    placeholder: "例如:想逛青岛市区特色咖啡店,最好在海边;想吃海鲜",
    rows: (4),
    size: "large",
    ...{ class: "custom-textarea" },
}));
const __VLS_130 = __VLS_129({
    value: (__VLS_ctx.formData.free_text_input),
    placeholder: "例如:想逛青岛市区特色咖啡店,最好在海边;想吃海鲜",
    rows: (4),
    size: "large",
    ...{ class: "custom-textarea" },
}, ...__VLS_functionalComponentArgsRest(__VLS_129));
var __VLS_127;
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "section-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "section-icon" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "section-title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "free-text-hint" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
/** @type {[typeof MapSelector, ]} */ ;
// @ts-ignore
const __VLS_132 = __VLS_asFunctionalComponent(MapSelector, new MapSelector({
    modelValue: (__VLS_ctx.attractionPicks),
    kind: "attraction",
    title: "必去景点",
    icon: "📍",
    city: (__VLS_ctx.formData.city),
    placeholder: "搜索景点,如:栈桥、八大关",
}));
const __VLS_133 = __VLS_132({
    modelValue: (__VLS_ctx.attractionPicks),
    kind: "attraction",
    title: "必去景点",
    icon: "📍",
    city: (__VLS_ctx.formData.city),
    placeholder: "搜索景点,如:栈桥、八大关",
}, ...__VLS_functionalComponentArgsRest(__VLS_132));
/** @type {[typeof MapSelector, ]} */ ;
// @ts-ignore
const __VLS_135 = __VLS_asFunctionalComponent(MapSelector, new MapSelector({
    modelValue: (__VLS_ctx.hotelPicks),
    kind: "hotel",
    title: "必住酒店",
    icon: "🏨",
    city: (__VLS_ctx.formData.city),
    placeholder: "搜索酒店,如:桔子酒店栈桥店",
}));
const __VLS_136 = __VLS_135({
    modelValue: (__VLS_ctx.hotelPicks),
    kind: "hotel",
    title: "必住酒店",
    icon: "🏨",
    city: (__VLS_ctx.formData.city),
    placeholder: "搜索酒店,如:桔子酒店栈桥店",
}, ...__VLS_functionalComponentArgsRest(__VLS_135));
/** @type {[typeof MapSelector, ]} */ ;
// @ts-ignore
const __VLS_138 = __VLS_asFunctionalComponent(MapSelector, new MapSelector({
    modelValue: (__VLS_ctx.mealPicks),
    kind: "meal",
    title: "必吃餐厅",
    icon: "🍜",
    city: (__VLS_ctx.formData.city),
    placeholder: "搜索餐厅,如:船歌鱼水饺",
}));
const __VLS_139 = __VLS_138({
    modelValue: (__VLS_ctx.mealPicks),
    kind: "meal",
    title: "必吃餐厅",
    icon: "🍜",
    city: (__VLS_ctx.formData.city),
    placeholder: "搜索餐厅,如:船歌鱼水饺",
}, ...__VLS_functionalComponentArgsRest(__VLS_138));
const __VLS_141 = {}.AFormItem;
/** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
// @ts-ignore
const __VLS_142 = __VLS_asFunctionalComponent(__VLS_141, new __VLS_141({}));
const __VLS_143 = __VLS_142({}, ...__VLS_functionalComponentArgsRest(__VLS_142));
__VLS_144.slots.default;
const __VLS_145 = {}.AButton;
/** @type {[typeof __VLS_components.AButton, typeof __VLS_components.aButton, typeof __VLS_components.AButton, typeof __VLS_components.aButton, ]} */ ;
// @ts-ignore
const __VLS_146 = __VLS_asFunctionalComponent(__VLS_145, new __VLS_145({
    type: "primary",
    htmlType: "submit",
    loading: (__VLS_ctx.loading),
    size: "large",
    block: true,
    ...{ class: "submit-button" },
}));
const __VLS_147 = __VLS_146({
    type: "primary",
    htmlType: "submit",
    loading: (__VLS_ctx.loading),
    size: "large",
    block: true,
    ...{ class: "submit-button" },
}, ...__VLS_functionalComponentArgsRest(__VLS_146));
__VLS_148.slots.default;
if (!__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "button-icon" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
var __VLS_148;
var __VLS_144;
if (__VLS_ctx.loading) {
    const __VLS_149 = {}.AFormItem;
    /** @type {[typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, typeof __VLS_components.AFormItem, typeof __VLS_components.aFormItem, ]} */ ;
    // @ts-ignore
    const __VLS_150 = __VLS_asFunctionalComponent(__VLS_149, new __VLS_149({}));
    const __VLS_151 = __VLS_150({}, ...__VLS_functionalComponentArgsRest(__VLS_150));
    __VLS_152.slots.default;
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "loading-container" },
    });
    const __VLS_153 = {}.AProgress;
    /** @type {[typeof __VLS_components.AProgress, typeof __VLS_components.aProgress, ]} */ ;
    // @ts-ignore
    const __VLS_154 = __VLS_asFunctionalComponent(__VLS_153, new __VLS_153({
        percent: (__VLS_ctx.loadingProgress),
        status: "active",
        strokeColor: ({
            '0%': '#667eea',
            '100%': '#764ba2',
        }),
        strokeWidth: (10),
    }));
    const __VLS_155 = __VLS_154({
        percent: (__VLS_ctx.loadingProgress),
        status: "active",
        strokeColor: ({
            '0%': '#667eea',
            '100%': '#764ba2',
        }),
        strokeWidth: (10),
    }, ...__VLS_functionalComponentArgsRest(__VLS_154));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "loading-status" },
    });
    (__VLS_ctx.loadingStatus);
    var __VLS_152;
}
var __VLS_7;
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['home-container']} */ ;
/** @type {__VLS_StyleScopedClasses['page-header']} */ ;
/** @type {__VLS_StyleScopedClasses['icon-wrapper']} */ ;
/** @type {__VLS_StyleScopedClasses['icon']} */ ;
/** @type {__VLS_StyleScopedClasses['page-title']} */ ;
/** @type {__VLS_StyleScopedClasses['page-subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['form-card']} */ ;
/** @type {__VLS_StyleScopedClasses['form-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-header']} */ ;
/** @type {__VLS_StyleScopedClasses['section-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['free-text-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['optional-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['optional-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-input']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-input']} */ ;
/** @type {__VLS_StyleScopedClasses['days-input']} */ ;
/** @type {__VLS_StyleScopedClasses['days-display-compact']} */ ;
/** @type {__VLS_StyleScopedClasses['days-value']} */ ;
/** @type {__VLS_StyleScopedClasses['days-unit']} */ ;
/** @type {__VLS_StyleScopedClasses['form-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-header']} */ ;
/** @type {__VLS_StyleScopedClasses['section-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-label']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-select']} */ ;
/** @type {__VLS_StyleScopedClasses['form-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-header']} */ ;
/** @type {__VLS_StyleScopedClasses['section-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['free-text-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['custom-textarea']} */ ;
/** @type {__VLS_StyleScopedClasses['form-section']} */ ;
/** @type {__VLS_StyleScopedClasses['section-header']} */ ;
/** @type {__VLS_StyleScopedClasses['section-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['section-title']} */ ;
/** @type {__VLS_StyleScopedClasses['free-text-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['submit-button']} */ ;
/** @type {__VLS_StyleScopedClasses['button-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-container']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-status']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            MapSelector: MapSelector,
            loading: loading,
            loadingProgress: loadingProgress,
            loadingStatus: loadingStatus,
            formData: formData,
            attractionPicks: attractionPicks,
            hotelPicks: hotelPicks,
            mealPicks: mealPicks,
            hasDates: hasDates,
            handleSubmit: handleSubmit,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
