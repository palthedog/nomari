<template>
  <div class="parameter-selector">
    <h4>パラメータ設定</h4>

    <div class="form-section">
      <div class="form-row">
        <label class="form-label">変化させるパラメータ</label>
        <select
          v-model="config.resourceType"
          class="form-select"
          @change="onResourceTypeChange"
        >
          <option
            v-for="option in resourceTypeOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>

      <div class="form-row">
        <label class="form-label">最小値</label>
        <input
          v-model.number="displayMinValue"
          type="number"
          class="form-input"
          :min="inputRange.min"
          :max="inputRange.max"
          :step="displayStepSize"
        >
      </div>

      <div class="form-row">
        <label class="form-label">最大値</label>
        <input
          v-model.number="displayMaxValue"
          type="number"
          class="form-input"
          :min="inputRange.min"
          :max="inputRange.max"
          :step="displayStepSize"
        >
      </div>

      <div class="form-row">
        <label class="form-label">ステップ</label>
        <input
          v-model.number="displayStepSize"
          type="number"
          class="form-input"
          :min="1"
          :step="1"
        >
      </div>

      <div class="info-row">
        <span class="info-text">
          計算回数: {{ computationCount }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { ResourceType } from '@nomari/ts-proto/generated/game';
import type { ParameterConfig } from '@/workers/sensitivity-types';
import { getDefaultParameterConfig, getResourceTypeLabel } from '@/utils/sub-scenario-builder';

const props = defineProps<{
    modelValue: ParameterConfig;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: ParameterConfig): void;
}>();

const resourceTypeOptions = [
    {
        value: ResourceType.PLAYER_HEALTH,
        label: getResourceTypeLabel(ResourceType.PLAYER_HEALTH)
    },
    {
        value: ResourceType.OPPONENT_HEALTH,
        label: getResourceTypeLabel(ResourceType.OPPONENT_HEALTH)
    },
    {
        value: ResourceType.PLAYER_OD_GAUGE,
        label: getResourceTypeLabel(ResourceType.PLAYER_OD_GAUGE)
    },
    {
        value: ResourceType.OPPONENT_OD_GAUGE,
        label: getResourceTypeLabel(ResourceType.OPPONENT_OD_GAUGE)
    },
    {
        value: ResourceType.PLAYER_SA_GAUGE,
        label: getResourceTypeLabel(ResourceType.PLAYER_SA_GAUGE)
    },
    {
        value: ResourceType.OPPONENT_SA_GAUGE,
        label: getResourceTypeLabel(ResourceType.OPPONENT_SA_GAUGE)
    },
];

const config = ref<ParameterConfig>({
    ...props.modelValue
});

const scaleFactor = computed(() => 1);

const inputRange = computed(() => {
    const rt = config.value.resourceType;
    if (rt === ResourceType.PLAYER_HEALTH || rt === ResourceType.OPPONENT_HEALTH) {
        return {
            min: 1,
            max: 10000
        };
    }
    if (rt === ResourceType.PLAYER_OD_GAUGE || rt === ResourceType.OPPONENT_OD_GAUGE) {
        return {
            min: 0,
            max: 6
        };
    }
    if (rt === ResourceType.PLAYER_SA_GAUGE || rt === ResourceType.OPPONENT_SA_GAUGE) {
        return {
            min: 0,
            max: 3
        };
    }
    return {
        min: 0,
        max: 10000
    };
});

const displayMinValue = computed({
    get: () => config.value.minValue / scaleFactor.value,
    set: (v: number) => {
        config.value.minValue = v * scaleFactor.value;
    }
});

const displayMaxValue = computed({
    get: () => config.value.maxValue / scaleFactor.value,
    set: (v: number) => {
        config.value.maxValue = v * scaleFactor.value;
    }
});

const displayStepSize = computed({
    get: () => config.value.stepSize / scaleFactor.value,
    set: (v: number) => {
        config.value.stepSize = v * scaleFactor.value;
    }
});

const computationCount = computed(() => {
    if (config.value.stepSize <= 0) {
        return 0;
    }
    return Math.floor((config.value.maxValue - config.value.minValue) / config.value.stepSize) + 1;
});

function onResourceTypeChange() {
    const defaults = getDefaultParameterConfig(config.value.resourceType);
    config.value.minValue = defaults.minValue;
    config.value.maxValue = defaults.maxValue;
    config.value.stepSize = defaults.stepSize;
}

watch(config, (newConfig) => {
    emit('update:modelValue', {
        ...newConfig
    });
}, {
    deep: true,
    immediate: true
});
</script>

<style scoped>
.parameter-selector {
    padding: 16px;
}

.parameter-selector h4 {
    margin-top: 0;
    margin-bottom: 16px;
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 600;
}

.form-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.form-row {
    display: flex;
    align-items: center;
    gap: 12px;
}

.form-label {
    min-width: 140px;
    font-size: 13px;
    color: var(--text-secondary);
}

.form-select,
.form-input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid var(--border-input);
    border-radius: var(--radius-sm);
    background-color: var(--bg-elevated);
    color: var(--text-primary);
    font-size: 13px;
}

.form-select:focus,
.form-input:focus {
    outline: none;
    border-color: var(--border-focus);
}

.info-row {
    margin-top: 8px;
    padding-top: 12px;
    border-top: 1px solid var(--border-secondary);
}

.info-text {
    font-size: 12px;
    color: var(--text-tertiary);
}
</style>
