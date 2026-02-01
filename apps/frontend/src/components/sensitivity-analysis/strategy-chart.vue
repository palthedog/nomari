<template>
  <div class="strategy-chart">
    <div class="chart-tabs">
      <button
        :class="['tab-btn', { active: activeTab === 'player' }]"
        @click="activeTab = 'player'"
      >
        プレイヤー戦略
      </button>
      <button
        :class="['tab-btn', { active: activeTab === 'opponent' }]"
        @click="activeTab = 'opponent'"
      >
        相手戦略
      </button>
    </div>

    <div class="chart-container">
      <Line
        :data="chartData"
        :options="chartOptions"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    type ChartOptions,
} from 'chart.js';
import { Line } from 'vue-chartjs';
import type { SensitivityResult, ParameterConfig } from '@/workers/sensitivity-types';
import { formatParameterValue } from '@/utils/sub-scenario-builder';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const props = defineProps<{
    results: SensitivityResult[];
    parameterConfig: ParameterConfig;
}>();

const activeTab = ref<'player' | 'opponent'>('player');

// Color palette for chart lines
const colors = [
    '#3b82f6', // blue
    '#ef4444', // red
    '#10b981', // green
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#84cc16', // lime
];

const chartData = computed(() => {
    const sortedResults = [...props.results].sort((a, b) => a.parameterValue - b.parameterValue);

    const labels = sortedResults.map(r =>
        formatParameterValue(props.parameterConfig.resourceType, r.parameterValue)
    );

    const strategies = activeTab.value === 'player'
        ? sortedResults.map(r => r.playerStrategies)
        : sortedResults.map(r => r.opponentStrategies);

    // Get all unique action names
    const actionNames = new Set<string>();
    for (const strats of strategies) {
        for (const s of strats) {
            actionNames.add(s.name);
        }
    }

    const datasets = Array.from(actionNames).map((actionName, idx) => {
        const data = strategies.map(strats => {
            const action = strats.find(s => s.name === actionName);
            return action ? action.probability * 100 : 0;
        });

        return {
            label: actionName,
            data,
            borderColor: colors[idx % colors.length],
            backgroundColor: colors[idx % colors.length],
            tension: 0.1,
            pointRadius: 3,
            pointHoverRadius: 5,
        };
    });

    return {
        labels,
        datasets,
    };
});

const chartOptions = computed((): ChartOptions<'line'> => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            position: 'bottom' as const,
            labels: {
                color: '#9ca3af',
                font: {
                    size: 12,
                },
            },
        },
        tooltip: {
            callbacks: {
                label: (context) => {
                    const label = context.dataset.label ?? '';
                    const y = context.parsed.y ?? 0;
                    return `${label}: ${y.toFixed(1)}%`;
                },
            },
        },
    },
    scales: {
        x: {
            title: {
                display: true,
                text: getXAxisLabel(),
                color: '#9ca3af',
            },
            ticks: {
                color: '#9ca3af',
            },
            grid: {
                color: 'rgba(156, 163, 175, 0.2)',
            },
        },
        y: {
            title: {
                display: true,
                text: '確率 (%)',
                color: '#9ca3af',
            },
            min: 0,
            max: 100,
            ticks: {
                color: '#9ca3af',
                callback: (value) => `${value}%`,
            },
            grid: {
                color: 'rgba(156, 163, 175, 0.2)',
            },
        },
    },
}));

function getXAxisLabel(): string {
    const labels: Record<number, string> = {
        1: 'プレイヤーHP',
        2: '相手HP',
        3: 'プレイヤーOD',
        4: 'プレイヤーSA',
        5: '相手OD',
        6: '相手SA',
    };
    return labels[props.parameterConfig.resourceType] || 'パラメータ値';
}
</script>

<style scoped>
.strategy-chart {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.chart-tabs {
    display: flex;
    gap: 8px;
}

.tab-btn {
    padding: 8px 16px;
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-sm);
    background-color: var(--bg-secondary);
    color: var(--text-secondary);
    font-size: 13px;
    cursor: pointer;
    transition: all 0.15s ease;
}

.tab-btn:hover {
    background-color: var(--bg-hover);
}

.tab-btn.active {
    background-color: var(--color-primary);
    border-color: var(--color-primary);
    color: white;
}

.chart-container {
    height: 350px;
}
</style>
