<template>
  <div
    v-if="strategy.length > 0"
    class="strategy-group"
  >
    <h4>{{ playerType === 'player' ? 'プレイヤー戦略' : '相手戦略' }}</h4>
    <div class="action-list">
      <v-tooltip
        v-for="action in strategy"
        :key="action.actionId"
        :location="isMobile ? 'bottom' : 'right'"
        :open-delay="50"
        :close-delay="playerType === 'player' ? 0 : undefined"
        :transition="false"
        :interactive="true"
        :disabled="getActionCalculation(action.actionId).length === 0"
        content-class="calculation-tooltip"
      >
        <template #activator="{ props: tooltipProps }">
          <div
            v-bind="tooltipProps"
            class="action-row"
          >
            <div class="action-info">
              <div class="action-name-row">
                <span class="action-name">{{ getActionName(action.actionId) }}</span>
                <span
                  v-if="getActionExpectedValue(action.actionId) !== null"
                  class="action-expected-value"
                >
                  期待値: {{ formatExpectedValue(getActionExpectedValue(action.actionId)) }}
                </span>
              </div>
              <span class="action-prob">{{ formatPercent(action.probability) }}</span>
            </div>
            <div class="prob-bar">
              <div
                class="prob-fill"
                :class="playerType === 'player' ? 'player-fill' : 'opponent-fill'"
                :style="{ width: action.probability * 100 + '%' }"
              />
            </div>
          </div>
        </template>
        <template #default>
          <table class="calculation-table">
            <tbody>
              <tr
                v-for="row in getActionCalculation(action.actionId)"
                :key="row.actionName"
                class="calc-row"
                @mouseenter="gameTreeStore.highlightNode(row.nextNodeId)"
                @mouseleave="gameTreeStore.highlightNode(null)"
                @touchstart="gameTreeStore.highlightNode(row.nextNodeId)"
                @touchend="gameTreeStore.highlightNode(null)"
                @click="gameTreeStore.selectNode(row.nextNodeId)"
              >
                <td class="calc-action-name">
                  {{ row.actionName }}
                </td>
                <td class="calc-value">
                  {{ Math.round(row.nextNodeValue) }}
                </td>
                <td class="calc-operator">
                  *
                </td>
                <td class="calc-prob">
                  {{ (row.probability * 100).toFixed(1) }}%
                </td>
                <td class="calc-operator">
                  =
                </td>
                <td class="calc-product">
                  {{ Math.round(row.product) }}
                </td>
              </tr>
            </tbody>
          </table>
        </template>
      </v-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { Node } from '@nomari/game-tree/game-tree';
import type { StrategyData } from '@/workers/solver-types';
import type { ExpectedValuesMap } from '@/utils/expected-value-calculator';
import { useGameTreeStore } from '@/stores/game-tree-store';
import log from 'loglevel';

// Mobile detection
const MOBILE_BREAKPOINT = 768;
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024);
const isMobile = computed(() => windowWidth.value <= MOBILE_BREAKPOINT);

function handleResize() {
    windowWidth.value = window.innerWidth;
}

onMounted(() => {
    window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
});

interface CalculationRow {
    actionName: string;
    probability: number;
    nextNodeValue: number;
    product: number;
    nextNodeId: string;
}

const props = defineProps<{
    strategy: Array<{ actionId: number;
        probability: number }>;
    playerType: 'player' | 'opponent';
    selectedNode: Node | null;
    expectedValues: ExpectedValuesMap | null;
    strategyData: StrategyData | null;
}>();

const gameTreeStore = useGameTreeStore();

const nodeExpectedValues = computed(() => {
    if (!props.selectedNode || !props.expectedValues) {
        return null;
    }
    return props.expectedValues[props.selectedNode.nodeId] ?? null;
});

function formatPercent(value: number): string {
    return (value * 100).toFixed(1) + '%';
}

function formatExpectedValue(value: number | null): string {
    if (value === null) {
        return '-';
    }
    return Math.round(value).toLocaleString();
}

function getActionExpectedValue(actionId: number): number | null {
    if (!nodeExpectedValues.value) {
        return null;
    }

    if (props.playerType === 'player') {
        const actionValue = nodeExpectedValues.value.actionExpectedValues.find(
            (a) => a.actionId === actionId
        );
        return actionValue?.expectedValue ?? null;
    } else {
        if (!nodeExpectedValues.value.opponentActionExpectedValues) {
            return null;
        }
        const actionValue = nodeExpectedValues.value.opponentActionExpectedValues.find(
            (a) => a.actionId === actionId
        );
        return actionValue?.expectedValue ?? null;
    }
}

function getActionCalculation(actionId: number): CalculationRow[] {
    if (!props.selectedNode || !props.strategyData || !props.expectedValues) {
        return [];
    }

    const rows: CalculationRow[] = [];
    const node = props.selectedNode;

    // Share logic between player and opponent branches as much as possible
    const isPlayer = props.playerType === 'player';
    const strategy = isPlayer
        ? props.strategyData.opponentStrategy
        : props.strategyData.playerStrategy;

    for (const transition of node.transitions) {
        // Identify actionId type depending on playerType
        const matchesAction = isPlayer
            ? transition.playerActionId === actionId
            : transition.opponentActionId === actionId;
        if (!matchesAction) {
            continue;
        }

        // Get strategyActionId and type for lookup
        const strategyActionId = isPlayer
            ? transition.opponentActionId
            : transition.playerActionId;
        const actionType: 'player' | 'opponent' = isPlayer ? 'opponent' : 'player';

        const strategyAction = strategy.find(
            (a) => a.actionId === strategyActionId
        );
        const probability = strategyAction?.probability ?? 0;

        const nextNodeValues = props.expectedValues[transition.nextNodeId];
        if (!nextNodeValues) {
            log.warn(`Expected values not found for next node: ${transition.nextNodeId}`);
            continue;
        }

        // Figure out the correct expected value and skip if it's undefined only for opponent branch
        let nextNodeValue: number | undefined;
        if (isPlayer) {
            nextNodeValue = nextNodeValues.nodeExpectedValue;
        } else {
            nextNodeValue = nextNodeValues.opponentNodeExpectedValue;
            if (nextNodeValue === undefined) {
                continue;
            }
        }

        const product = probability * nextNodeValue;
        const actionName = getActionNameForType(strategyActionId, actionType);

        rows.push({
            actionName,
            probability,
            nextNodeValue,
            product,
            nextNodeId: transition.nextNodeId,
        });
    }

    return rows;
}

function getActionName(actionId: number): string {
    return getActionNameForType(actionId, props.playerType);
}

function getActionNameForType(actionId: number, type: 'player' | 'opponent'): string {
    if (!props.selectedNode) {
        return String(actionId);
    }

    const actions =
        type === 'player'
            ? props.selectedNode.playerActions?.actions
            : props.selectedNode.opponentActions?.actions;

    const action = actions?.find((a) => a.actionId === actionId);
    return action?.name || '(名前なし)';
}
</script>

<style scoped>
.strategy-group {
    margin-bottom: 16px;
}

.strategy-group:last-child {
    margin-bottom: 0;
}

.strategy-group h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: var(--text-primary);
}

.action-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.action-row {
    background-color: var(--bg-secondary);
    border-radius: 4px;
    padding: 10px;
}

.action-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
}

.action-name-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.action-name {
    font-size: 13px;
    color: var(--text-primary);
}

.action-expected-value {
    font-size: 11px;
    color: var(--text-secondary);
    font-weight: 500;
}

.action-prob {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-secondary);
}

.prob-bar {
    height: 8px;
    background-color: var(--border-secondary);
    border-radius: 4px;
    overflow: hidden;
}

.prob-fill {
    height: 100%;
    transition: width 0.3s ease;
}

.player-fill {
    background-color: var(--color-primary);
}

.opponent-fill {
    background-color: var(--color-error);
}

/* Tooltip styles */
:deep(.calculation-tooltip) {
    font-size: 12px;
    max-width: none;
    padding: 8px;
    background-color: var(--tooltip-bg) !important;
    color: var(--tooltip-text) !important;
}

.calculation-table {
    border-collapse: collapse;
    font-family: monospace;
    font-size: 12px;
    line-height: 1.6;
}

.calculation-table td {
    padding: 2px 4px;
    white-space: nowrap;
}

.calc-row {
    cursor: pointer;
}

.calc-row:hover {
    color: var(--color-accent-blue) !important;
    background-color: var(--bg-hover);
}

.calc-action-name {
    text-align: left;
    padding-right: 8px;
}

.calc-value {
    text-align: right;
    padding-right: 4px;
    min-width: 60px;
}

.calc-operator {
    text-align: center;
    padding: 0 4px;
}

.calc-prob {
    text-align: left;
    padding-left: 4px;
    padding-right: 4px;
    min-width: 40px;
}

.calc-product {
    text-align: right;
    padding-left: 8px;
    min-width: 60px;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
    :deep(.calculation-tooltip) {
        max-width: 90vw;
        overflow-x: auto;
    }

    .calculation-table {
        font-size: 11px;
    }

    .calculation-table td {
        padding: 4px 2px;
    }

    .calc-value,
    .calc-product {
        min-width: 50px;
    }

    .calc-prob {
        min-width: 35px;
    }
}
</style>
