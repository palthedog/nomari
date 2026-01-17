<template>
    <div class="node-strategy-panel">
        <h3>ノード戦略</h3>

        <div v-if="!selectedNode" class="no-selection">
            <div class="no-selection-icon">🎯</div>
            <p>ゲーム木のノードをクリックして戦略を表示</p>
        </div>

        <div v-else class="node-details">
            <!-- Node info -->
            <div class="node-info">
                <!--
                <div class="info-row">
                    <span class="label">ノードID:</span>
                    <span class="value">{{ selectedNode.nodeId }}</span>
                </div>
                -->
                <div class="info-row">
                    <span class="label">状況:</span>
                    <span class="value">{{ selectedNode.description }}</span>
                </div>
                <div class="info-row">
                    <span class="label">HP:</span>
                    <span class="value">
                        プレイヤー {{ selectedNode.state.playerHealth }} /
                        相手 {{ selectedNode.state.opponentHealth }}
                    </span>
                </div>
            </div>

            <!-- Terminal node indicator -->
            <div v-if="isTerminal" class="terminal-indicator">
                <span class="terminal-badge">終端ノード</span>
                <div class="rewards">
                    <span>報酬: {{ formatReward(selectedNode.playerReward?.value) }}</span>
                </div>
            </div>

            <!-- Strategy display -->
            <div v-else-if="hasStrategy" class="strategy-section">
                <!-- Node expected value -->
                <div v-if="nodeExpectedValues" class="node-expected-value">
                    <div class="expected-value-row">
                        <div class="expected-value-label">プレイヤー期待値:</div>
                        <div class="expected-value-number">{{ formatExpectedValue(nodeExpectedValues.nodeExpectedValue)
                            }}</div>
                    </div>
                    <div class="expected-value-row" v-if="nodeExpectedValues.opponentNodeExpectedValue !== undefined">
                        <div class="expected-value-label">相手期待値:</div>
                        <div class="expected-value-number opponent-value">{{
                            formatExpectedValue(nodeExpectedValues.opponentNodeExpectedValue) }}</div>
                    </div>
                </div>

                <!-- Player strategy -->
                <div v-if="playerStrategy.length > 0" class="strategy-group">
                    <h4>プレイヤー戦略</h4>
                    <div class="action-list">
                        <v-tooltip v-for="action in playerStrategy" :key="action.actionId" location="right"
                            :open-delay="50" :transition="false"
                            :disabled="getPlayerActionCalculation(action.actionId).length === 0"
                            content-class="calculation-tooltip">
                            <template #activator="{ props: tooltipProps }">
                                <div v-bind="tooltipProps" class="action-row">
                                    <div class="action-info">
                                        <div class="action-name-row">
                                            <span class="action-name">{{ getActionName(action.actionId, 'player')
                                                }}</span>
                                            <span class="action-expected-value"
                                                v-if="getActionExpectedValue(action.actionId) !== null">
                                                期待値: {{ formatExpectedValue(getActionExpectedValue(action.actionId)) }}
                                            </span>
                                        </div>
                                        <span class="action-prob">{{ formatPercent(action.probability) }}</span>
                                    </div>
                                    <div class="prob-bar">
                                        <div class="prob-fill player-fill"
                                            :style="{ width: action.probability * 100 + '%' }">
                                        </div>
                                    </div>
                                </div>
                            </template>
                            <template #default>
                                <table class="calculation-table">
                                    <tbody>
                                        <tr v-for="row in getPlayerActionCalculation(action.actionId)"
                                            :key="row.actionName">
                                            <td class="calc-action-name">{{ row.actionName }}</td>
                                            <td class="calc-value">{{ Math.round(row.nextNodeValue) }}</td>
                                            <td class="calc-operator">*</td>
                                            <td class="calc-prob">{{ row.probability.toFixed(2) }}</td>
                                            <td class="calc-operator">=</td>
                                            <td class="calc-product">{{ Math.round(row.product) }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </template>
                        </v-tooltip>
                    </div>
                </div>

                <!-- Opponent strategy -->
                <div v-if="opponentStrategy.length > 0" class="strategy-group">
                    <h4>相手戦略</h4>
                    <div class="action-list">
                        <v-tooltip v-for="action in opponentStrategy" :key="action.actionId" location="right"
                            :open-delay="50" :transition="false"
                            :disabled="getOpponentActionCalculation(action.actionId).length === 0"
                            content-class="calculation-tooltip">
                            <template #activator="{ props: tooltipProps }">
                                <div v-bind="tooltipProps" class="action-row">
                                    <div class="action-info">
                                        <div class="action-name-row">
                                            <span class="action-name">{{ getActionName(action.actionId, 'opponent')
                                                }}</span>
                                            <span class="action-expected-value"
                                                v-if="getOpponentActionExpectedValue(action.actionId) !== null">
                                                期待値: {{
                                                    formatExpectedValue(getOpponentActionExpectedValue(action.actionId)) }}
                                            </span>
                                        </div>
                                        <span class="action-prob">{{ formatPercent(action.probability) }}</span>
                                    </div>
                                    <div class="prob-bar">
                                        <div class="prob-fill opponent-fill"
                                            :style="{ width: action.probability * 100 + '%' }">
                                        </div>
                                    </div>
                                </div>
                            </template>
                            <template #default>
                                <table class="calculation-table">
                                    <tbody>
                                        <tr v-for="row in getOpponentActionCalculation(action.actionId)"
                                            :key="row.actionName">
                                            <td class="calc-action-name">{{ row.actionName }}</td>
                                            <td class="calc-value">{{ Math.round(row.nextNodeValue) }}</td>
                                            <td class="calc-operator">*</td>
                                            <td class="calc-prob">{{ row.probability.toFixed(2) }}</td>
                                            <td class="calc-operator">=</td>
                                            <td class="calc-product">{{ Math.round(row.product) }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </template>
                        </v-tooltip>
                    </div>
                </div>
            </div>

            <!-- No strategy computed yet -->
            <div v-else class="no-strategy">
                <p>戦略がまだ計算されていません</p>
                <p class="hint">「戦略を計算」ボタンを押してください</p>
            </div>

            <!-- Available actions (always show) -->
            <div v-if="!isTerminal" class="actions-section">
                <details>
                    <summary>利用可能なアクション</summary>
                    <div class="available-actions">
                        <div v-if="selectedNode.playerActions" class="action-group">
                            <h5>プレイヤー</h5>
                            <ul>
                                <li v-for="action in selectedNode.playerActions.actions" :key="action.actionId">
                                    {{ action.name || action.actionId }}
                                </li>
                            </ul>
                        </div>
                        <div v-if="selectedNode.opponentActions" class="action-group">
                            <h5>相手</h5>
                            <ul>
                                <li v-for="action in selectedNode.opponentActions.actions" :key="action.actionId">
                                    {{ action.name || action.actionId }}
                                </li>
                            </ul>
                        </div>
                    </div>
                </details>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Node } from '@mari/game-tree/game-tree';
import type { StrategyData } from '../workers/solver-types';
import type { ExpectedValuesMap } from '../utils/expected-value-calculator';

const props = defineProps<{
    selectedNode: Node | null;
    strategyData: StrategyData | null;
    expectedValues: ExpectedValuesMap | null;
}>();

// Calculation row type for tooltip
interface CalculationRow {
    actionName: string;
    probability: number;
    nextNodeValue: number;
    product: number;
}

// Computed properties
const isTerminal = computed(() => {
    if (!props.selectedNode) return false;
    return (
        props.selectedNode.playerReward !== undefined ||
        props.selectedNode.opponentReward !== undefined
    );
});

const hasStrategy = computed(() => {
    return props.strategyData !== null;
});

const playerStrategy = computed(() => {
    return props.strategyData?.playerStrategy ?? [];
});

const opponentStrategy = computed(() => {
    return props.strategyData?.opponentStrategy ?? [];
});

// Get expected values for the selected node
const nodeExpectedValues = computed(() => {
    if (!props.selectedNode || !props.expectedValues) {
        return null;
    }
    return props.expectedValues[props.selectedNode.nodeId] ?? null;
});

// Get expected value for a specific action
function getActionExpectedValue(actionId: string): number | null {
    if (!nodeExpectedValues.value) {
        return null;
    }
    const actionValue = nodeExpectedValues.value.actionExpectedValues.find(
        (a) => a.actionId === actionId
    );
    return actionValue?.expectedValue ?? null;
}

// Get expected value for a specific opponent action
function getOpponentActionExpectedValue(actionId: string): number | null {
    if (!nodeExpectedValues.value || !nodeExpectedValues.value.opponentActionExpectedValues) {
        return null;
    }
    const actionValue = nodeExpectedValues.value.opponentActionExpectedValues.find(
        (a) => a.actionId === actionId
    );
    return actionValue?.expectedValue ?? null;
}

// Get calculation breakdown for a player action
function getPlayerActionCalculation(actionId: string): CalculationRow[] {
    if (!props.selectedNode || !props.strategyData || !props.expectedValues) {
        return [];
    }

    const rows: CalculationRow[] = [];
    const node = props.selectedNode;
    const opponentStrategy = props.strategyData.opponentStrategy;

    // Find all transitions for this player action
    for (const transition of node.transitions) {
        if (transition.playerActionId !== actionId) {
            continue;
        }

        // Get opponent action probability
        const opponentAction = opponentStrategy.find(
            (a) => a.actionId === transition.opponentActionId
        );
        const probability = opponentAction?.probability ?? 0;

        // Skip if probability is 0
        if (probability === 0) {
            continue;
        }

        // Get next node expected value
        const nextNodeValues = props.expectedValues[transition.nextNodeId];
        if (!nextNodeValues) {
            continue;
        }

        const nextNodeValue = nextNodeValues.nodeExpectedValue;
        const product = probability * nextNodeValue;

        // Get opponent action name
        const opponentActionName = getActionName(transition.opponentActionId, 'opponent');

        rows.push({
            actionName: opponentActionName,
            probability,
            nextNodeValue,
            product,
        });
    }

    return rows;
}

// Get calculation breakdown for an opponent action
function getOpponentActionCalculation(actionId: string): CalculationRow[] {
    if (!props.selectedNode || !props.strategyData || !props.expectedValues) {
        return [];
    }

    const rows: CalculationRow[] = [];
    const node = props.selectedNode;
    const playerStrategy = props.strategyData.playerStrategy;

    // Find all transitions for this opponent action
    for (const transition of node.transitions) {
        if (transition.opponentActionId !== actionId) {
            continue;
        }

        // Get player action probability
        const playerAction = playerStrategy.find(
            (a) => a.actionId === transition.playerActionId
        );
        const probability = playerAction?.probability ?? 0;

        // Skip if probability is 0
        if (probability === 0) {
            continue;
        }

        // Get next node expected value (opponent value)
        const nextNodeValues = props.expectedValues[transition.nextNodeId];
        if (!nextNodeValues || nextNodeValues.opponentNodeExpectedValue === undefined) {
            continue;
        }

        const nextNodeValue = nextNodeValues.opponentNodeExpectedValue;
        const product = probability * nextNodeValue;

        // Get player action name
        const playerActionName = getActionName(transition.playerActionId, 'player');

        rows.push({
            actionName: playerActionName,
            probability,
            nextNodeValue,
            product,
        });
    }

    return rows;
}

// Helper functions
function formatReward(value: number | undefined): string {
    if (value === undefined) return '-';
    return Math.round(value).toLocaleString();
}

function formatPercent(value: number): string {
    return (value * 100).toFixed(1) + '%';
}

function formatExpectedValue(value: number | null): string {
    if (value === null) return '-';
    return Math.round(value).toLocaleString();
}

function getActionName(actionId: string, player: 'player' | 'opponent'): string {
    if (!props.selectedNode) return actionId;

    const actions =
        player === 'player'
            ? props.selectedNode.playerActions?.actions
            : props.selectedNode.opponentActions?.actions;

    const action = actions?.find((a) => a.actionId === actionId);
    return action?.name || actionId;
}
</script>

<style scoped>
.node-strategy-panel {
    height: 100%;
    display: flex;
    flex-direction: column;
    background-color: var(--bg-primary);
    border-left: 1px solid var(--border-secondary);
}

.node-strategy-panel h3 {
    margin: 0;
    padding: 16px;
    font-size: 16px;
    color: var(--text-primary);
    border-bottom: 1px solid var(--border-secondary);
}

.no-selection {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--text-disabled);
    text-align: center;
    padding: 20px;
}

.no-selection-icon {
    font-size: 48px;
    margin-bottom: 16px;
}

.no-selection p {
    margin: 0;
    font-size: 14px;
}

.node-details {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

.node-info {
    background-color: var(--bg-quaternary);
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 16px;
}

.info-row {
    display: flex;
    margin-bottom: 8px;
    font-size: 13px;
}

.info-row:last-child {
    margin-bottom: 0;
}

.info-row .label {
    color: var(--text-secondary);
    min-width: 80px;
}

.info-row .value {
    color: var(--text-primary);
    font-weight: 500;
    word-break: break-all;
}

.terminal-indicator {
    text-align: center;
    padding: 16px;
    background-color: var(--bg-warning);
    border-radius: 4px;
    margin-bottom: 16px;
}

.terminal-badge {
    display: inline-block;
    padding: 4px 12px;
    background-color: var(--color-warning);
    color: white;
    font-size: 12px;
    font-weight: 500;
    border-radius: 12px;
    margin-bottom: 8px;
}

.rewards {
    font-size: 14px;
    color: var(--text-secondary);
}

.strategy-section {
    margin-bottom: 16px;
}

.strategy-group {
    margin-bottom: 16px;
}

.strategy-group:last-child {
    margin-bottom: 0;
}

.node-expected-value {
    background-color: var(--bg-secondary);
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.expected-value-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.expected-value-label {
    font-size: 13px;
    color: var(--text-secondary);
    font-weight: 500;
}

.expected-value-number {
    font-size: 16px;
    font-weight: 600;
    color: var(--color-accent-blue);
}

.opponent-value {
    color: var(--color-error);
}

.opponent-value {
    color: var(--color-error);
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

.no-strategy {
    text-align: center;
    padding: 24px;
    color: var(--text-disabled);
}

.no-strategy p {
    margin: 0 0 8px 0;
}

.no-strategy .hint {
    font-size: 12px;
}

.actions-section {
    margin-top: 16px;
}

.actions-section details {
    border: 1px solid var(--border-secondary);
    border-radius: 4px;
}

.actions-section summary {
    padding: 10px 12px;
    font-size: 13px;
    color: var(--text-secondary);
    cursor: pointer;
    background-color: var(--bg-secondary);
}

.actions-section summary:hover {
    background-color: var(--bg-hover);
}

.available-actions {
    padding: 12px;
}

.action-group {
    margin-bottom: 12px;
}

.action-group:last-child {
    margin-bottom: 0;
}

.action-group h5 {
    margin: 0 0 8px 0;
    font-size: 12px;
    color: var(--text-secondary);
}

.action-group ul {
    margin: 0;
    padding-left: 20px;
}

.action-group li {
    font-size: 12px;
    color: var(--text-primary);
    margin-bottom: 4px;
}

/* Tooltip styles */
:deep(.calculation-tooltip) {
    font-size: 12px;
    max-width: none;
    padding: 8px;
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
</style>
