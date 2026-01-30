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
              報酬期待値:
            </div>
            <div class="expected-value-number">
              {{ formatExpectedValue(nodeExpectedValues.nodeExpectedValue)
              }}
            </div>
          </div>

          <!-- Expected damage values -->
          <div class="expected-value-row">
            <div class="expected-value-label">
              ダメージ期待値:
            </div>
            <div class="expected-value-number damage-dealt">
              {{ formatDamage(nodeExpectedValues.expectedDamageDealt) }}
            </div>
          </div>
          <div class="expected-value-row">
            <div class="expected-value-label">
              被ダメージ期待値:
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
    border-left: 1px solid var(--border-primary);
    font-family: var(--font-family-ui);
}

.node-strategy-panel h3 {
    margin: 0;
    padding: 14px 16px;
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    border-bottom: 1px solid var(--border-primary);
    background-color: var(--bg-secondary);
    letter-spacing: 0.5px;
}

.no-selection {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--text-tertiary);
    text-align: center;
    padding: 24px;
}

.no-selection-icon {
    font-size: 40px;
    margin-bottom: 16px;
    opacity: 0.6;
}

.no-selection p {
    margin: 0;
    font-size: 13px;
}

.node-details {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
}

.node-info {
    background-color: var(--bg-secondary);
    border-radius: var(--radius-md);
    padding: 14px;
    margin-bottom: 16px;
    border: 1px solid var(--border-secondary);
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
    color: var(--text-tertiary);
    min-width: 50px;
    font-size: 12px;
}

.info-row .value {
    color: var(--text-primary);
    font-weight: 500;
    word-break: break-all;
    font-family: var(--font-family-mono);
    font-size: 12px;
}

.terminal-indicator {
    text-align: center;
    padding: 16px;
    background-color: var(--bg-warning);
    border-radius: var(--radius-md);
    margin-bottom: 16px;
    border: 1px solid var(--terminal);
}

.terminal-badge {
    display: inline-block;
    padding: 4px 12px;
    background-color: var(--terminal);
    color: white;
    font-size: 11px;
    font-weight: 600;
    border-radius: 12px;
    margin-bottom: 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.rewards {
    font-size: 14px;
    color: var(--text-secondary);
    font-family: var(--font-family-mono);
}

.strategy-section {
    margin-bottom: 16px;
}

.node-expected-value {
    background-color: var(--bg-secondary);
    border-radius: var(--radius-md);
    padding: 14px;
    margin-bottom: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    border: 1px solid var(--border-secondary);
}

.expected-value-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.expected-value-row:first-child {
    padding-bottom: 8px;
    border-bottom: 1px solid var(--border-secondary);
    margin-bottom: 4px;
}

.expected-value-label {
    font-size: 12px;
    color: var(--text-tertiary);
    font-weight: 500;
}

.expected-value-number {
    font-size: 18px;
    font-weight: 600;
    font-family: var(--font-family-mono);
    color: var(--color-gold);
}

.opponent-value {
    color: var(--color-error);
}

.damage-expected-value {
    background-color: var(--bg-tertiary);
    border-radius: var(--radius-md);
    padding: 12px;
    margin-bottom: 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.damage-dealt {
    color: var(--player-combo);
    font-family: var(--font-family-mono);
}

.damage-received {
    color: var(--opponent-combo);
    font-family: var(--font-family-mono);
}

.no-strategy {
    text-align: center;
    padding: 24px;
    color: var(--text-tertiary);
}

.no-strategy p {
    margin: 0 0 8px 0;
}

.no-strategy .hint {
    font-size: 12px;
    opacity: 0.8;
}

.actions-section {
    margin-top: 16px;
}

.actions-section details {
    border: 1px solid var(--border-secondary);
    border-radius: var(--radius-md);
    overflow: hidden;
}

.actions-section summary {
    padding: 10px 12px;
    font-size: 12px;
    color: var(--text-secondary);
    cursor: pointer;
    background-color: var(--bg-secondary);
    font-weight: 500;
}

.actions-section summary:hover {
    background-color: var(--bg-hover);
}

.available-actions {
    padding: 12px;
    background-color: var(--bg-primary);
}

.action-group {
    margin-bottom: 12px;
}

.action-group:last-child {
    margin-bottom: 0;
}

.action-group h5 {
    margin: 0 0 8px 0;
    font-size: 11px;
    color: var(--text-tertiary);
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.action-group ul {
    margin: 0;
    padding-left: 16px;
}

.action-group li {
    font-size: 12px;
    color: var(--text-primary);
    margin-bottom: 4px;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
    .node-strategy-panel {
        border-left: none;
    }

    .node-strategy-panel h3 {
        padding: 12px;
        font-size: 13px;
    }

    .node-details {
        padding: 12px;
    }

    .node-info {
        padding: 12px;
        margin-bottom: 12px;
    }

    .info-row {
        font-size: 12px;
    }

    .info-row .label {
        min-width: 45px;
    }

    .no-selection-icon {
        font-size: 32px;
    }

    .no-selection p {
        font-size: 12px;
    }

    .expected-value-number {
        font-size: 16px;
    }
}
</style>
