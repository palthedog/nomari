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
                <!-- Player strategy -->
                <div v-if="playerStrategy.length > 0" class="strategy-group">
                    <h4>プレイヤー戦略</h4>
                    <div class="action-list">
                        <div v-for="action in playerStrategy" :key="action.actionId" class="action-row">
                            <div class="action-info">
                                <span class="action-name">{{ getActionName(action.actionId, 'player') }}</span>
                                <span class="action-prob">{{ formatPercent(action.probability) }}</span>
                            </div>
                            <div class="prob-bar">
                                <div class="prob-fill player-fill" :style="{ width: action.probability * 100 + '%' }">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Opponent strategy -->
                <div v-if="opponentStrategy.length > 0" class="strategy-group">
                    <h4>相手戦略</h4>
                    <div class="action-list">
                        <div v-for="action in opponentStrategy" :key="action.actionId" class="action-row">
                            <div class="action-info">
                                <span class="action-name">{{ getActionName(action.actionId, 'opponent') }}</span>
                                <span class="action-prob">{{ formatPercent(action.probability) }}</span>
                            </div>
                            <div class="prob-bar">
                                <div class="prob-fill opponent-fill" :style="{ width: action.probability * 100 + '%' }">
                                </div>
                            </div>
                        </div>
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

const props = defineProps<{
    selectedNode: Node | null;
    strategyData: StrategyData | null;
}>();

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

// Helper functions
function formatReward(value: number | undefined): string {
    if (value === undefined) return '-';
    return Math.round(value).toLocaleString();
}

function formatPercent(value: number): string {
    return (value * 100).toFixed(1) + '%';
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
    background-color: #fff;
    border-left: 1px solid #e0e0e0;
}

.node-strategy-panel h3 {
    margin: 0;
    padding: 16px;
    font-size: 16px;
    color: #333;
    border-bottom: 1px solid #e0e0e0;
}

.no-selection {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #9e9e9e;
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
    background-color: #f5f5f5;
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
    color: #666;
    min-width: 80px;
}

.info-row .value {
    color: #333;
    font-weight: 500;
    word-break: break-all;
}

.terminal-indicator {
    text-align: center;
    padding: 16px;
    background-color: #fff3e0;
    border-radius: 4px;
    margin-bottom: 16px;
}

.terminal-badge {
    display: inline-block;
    padding: 4px 12px;
    background-color: #ff9800;
    color: white;
    font-size: 12px;
    font-weight: 500;
    border-radius: 12px;
    margin-bottom: 8px;
}

.rewards {
    font-size: 14px;
    color: #666;
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

.strategy-group h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    color: #333;
}

.action-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.action-row {
    background-color: #fafafa;
    border-radius: 4px;
    padding: 10px;
}

.action-info {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
}

.action-name {
    font-size: 13px;
    color: #333;
}

.action-prob {
    font-size: 13px;
    font-weight: 600;
    color: #666;
}

.prob-bar {
    height: 8px;
    background-color: #e0e0e0;
    border-radius: 4px;
    overflow: hidden;
}

.prob-fill {
    height: 100%;
    transition: width 0.3s ease;
}

.player-fill {
    background-color: #4CAF50;
}

.opponent-fill {
    background-color: #f44336;
}

.no-strategy {
    text-align: center;
    padding: 24px;
    color: #9e9e9e;
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
    border: 1px solid #e0e0e0;
    border-radius: 4px;
}

.actions-section summary {
    padding: 10px 12px;
    font-size: 13px;
    color: #666;
    cursor: pointer;
    background-color: #fafafa;
}

.actions-section summary:hover {
    background-color: #f0f0f0;
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
    color: #666;
}

.action-group ul {
    margin: 0;
    padding-left: 20px;
}

.action-group li {
    font-size: 12px;
    color: #333;
    margin-bottom: 4px;
}
</style>
