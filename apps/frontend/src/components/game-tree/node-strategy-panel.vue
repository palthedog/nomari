<template>
  <div class="node-strategy-panel">
    <h3>ノード戦略</h3>

    <div
      v-if="!selectedNode"
      class="no-selection"
    >
      <div class="no-selection-icon">
        🎯
      </div>
      <p>ゲーム木のノードをクリックして戦略を表示</p>
    </div>

    <div
      v-else
      class="node-details"
    >
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
          <span class="value">{{ selectedNode.name }}</span>
        </div>
        <div class="info-row">
          <span class="label">HP:</span>
          <span class="value">
            プレイヤー {{ selectedNode.state.playerHealth }} /
            相手 {{ selectedNode.state.opponentHealth }}
          </span>
        </div>
        <div class="info-row">
          <span class="label">OD:</span>
          <span class="value">
            プレイヤー {{ formatGauge(selectedNode.state.playerOd) }} /
            相手 {{ formatGauge(selectedNode.state.opponentOd) }}
          </span>
        </div>
        <div class="info-row">
          <span class="label">SA:</span>
          <span class="value">
            プレイヤー {{ formatGauge(selectedNode.state.playerSa) }} /
            相手 {{ formatGauge(selectedNode.state.opponentSa) }}
          </span>
        </div>
      </div>

      <!-- Terminal node indicator -->
      <div
        v-if="isTerminal"
        class="terminal-indicator"
      >
        <span class="terminal-badge">終端ノード</span>
        <div class="rewards">
          <span>報酬: {{ formatReward(selectedNode.playerReward?.value) }}</span>
        </div>
      </div>

      <!-- Strategy display -->
      <div
        v-else-if="hasStrategy"
        class="strategy-section"
      >
        <!-- Node expected value -->
        <div
          v-if="nodeExpectedValues"
          class="node-expected-value"
        >
          <div class="expected-value-row">
            <div class="expected-value-label">
              プレイヤー期待値:
            </div>
            <div class="expected-value-number">
              {{ formatExpectedValue(nodeExpectedValues.nodeExpectedValue)
              }}
            </div>
          </div>
          <div
            v-if="nodeExpectedValues.opponentNodeExpectedValue !== undefined"
            class="expected-value-row"
          >
            <div class="expected-value-label">
              相手期待値:
            </div>
            <div class="expected-value-number opponent-value">
              {{
                formatExpectedValue(nodeExpectedValues.opponentNodeExpectedValue) }}
            </div>
          </div>
        </div>

        <!-- Expected damage values -->
        <div
          v-if="nodeExpectedValues"
          class="damage-expected-value"
        >
          <div class="expected-value-row">
            <div class="expected-value-label">
              与えるダメージ期待値:
            </div>
            <div class="expected-value-number damage-dealt">
              {{ formatDamage(nodeExpectedValues.expectedDamageDealt) }}
            </div>
          </div>
          <div class="expected-value-row">
            <div class="expected-value-label">
              受けるダメージ期待値:
            </div>
            <div class="expected-value-number damage-received">
              {{ formatDamage(nodeExpectedValues.expectedDamageReceived) }}
            </div>
          </div>
        </div>

        <!-- Player strategy -->
        <StrategyActionList
          v-if="playerStrategy.length > 0"
          :strategy="playerStrategy"
          player-type="player"
          :selected-node="selectedNode"
          :expected-values="expectedValues"
          :strategy-data="strategyData"
        />

        <!-- Opponent strategy -->
        <StrategyActionList
          v-if="opponentStrategy.length > 0"
          :strategy="opponentStrategy"
          player-type="opponent"
          :selected-node="selectedNode"
          :expected-values="expectedValues"
          :strategy-data="strategyData"
        />
      </div>

      <!-- No strategy computed yet -->
      <div
        v-else
        class="no-strategy"
      >
        <p>戦略がまだ計算されていません</p>
        <p class="hint">
          「戦略を計算」ボタンを押してください
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Node } from '@nomari/game-tree/game-tree';
import type { StrategyData } from '@/workers/solver-types';
import type { ExpectedValuesMap } from '@/utils/expected-value-calculator';
import StrategyActionList from './strategy-action-list.vue';

const props = defineProps<{
    selectedNode: Node | null;
    strategyData: StrategyData | null;
    expectedValues: ExpectedValuesMap | null;
}>();

// Computed properties
const isTerminal = computed(() => {
    if (!props.selectedNode) {
        return false;
    }
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

// Helper functions
function formatReward(value: number | undefined): string {
    if (value === undefined) {
        return '-';
    }
    return Math.round(value).toLocaleString();
}

function formatExpectedValue(value: number | null): string {
    if (value === null) {
        return '-';
    }
    return Math.round(value).toLocaleString();
}

function formatGauge(value: number): string {
    return (value / 1000).toFixed(1);
}

function formatDamage(value: number): string {
    return Math.round(value).toLocaleString();
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

.damage-expected-value {
    background-color: var(--bg-tertiary);
    border-radius: 4px;
    padding: 12px;
    margin-bottom: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.damage-dealt {
    color: var(--color-accent-blue);
}

.damage-received {
    color: var(--color-error);
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
</style>
