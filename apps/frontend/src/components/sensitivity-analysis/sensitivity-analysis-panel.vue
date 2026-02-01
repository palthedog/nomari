<template>
  <v-dialog
    v-model="sensitivityStore.isOpen"
    max-width="900"
    scrollable
  >
    <v-card class="sensitivity-panel">
      <v-card-title class="panel-title">
        <v-icon class="mr-2">
          mdi-chart-line
        </v-icon>
        パラメータ感度分析
      </v-card-title>

      <v-card-text class="panel-content">
        <!-- Node info summary -->
        <div
          v-if="sensitivityStore.sourceNode"
          class="node-summary"
        >
          <div class="summary-item">
            <span class="summary-label">状況:</span>
            <span class="summary-value">{{ sensitivityStore.sourceNode.name }}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">HP:</span>
            <span class="summary-value">
              プレイヤー {{ sensitivityStore.sourceNode.state.playerHealth }} /
              相手 {{ sensitivityStore.sourceNode.state.opponentHealth }}
            </span>
          </div>
          <div class="summary-item">
            <span class="summary-label">OD:</span>
            <span class="summary-value">
              プレイヤー {{ formatGauge(sensitivityStore.sourceNode.state.playerOd) }} /
              相手 {{ formatGauge(sensitivityStore.sourceNode.state.opponentOd) }}
            </span>
          </div>
          <div class="summary-item">
            <span class="summary-label">SA:</span>
            <span class="summary-value">
              プレイヤー {{ formatGauge(sensitivityStore.sourceNode.state.playerSa) }} /
              相手 {{ formatGauge(sensitivityStore.sourceNode.state.opponentSa) }}
            </span>
          </div>
        </div>

        <!-- Configuration state -->
        <ParameterSelector
          v-if="sensitivityStore.status === 'configuring'"
          v-model="sensitivityStore.parameterConfig"
        />

        <!-- Computing state -->
        <div
          v-else-if="sensitivityStore.status === 'computing'"
          class="computing-section"
        >
          <div class="progress-info">
            <span>計算中...</span>
            <span>{{ sensitivityStore.progress.current }} / {{ sensitivityStore.progress.total }}</span>
          </div>
          <v-progress-linear
            :model-value="progressPercentage"
            color="primary"
            height="8"
            rounded
          />
        </div>

        <!-- Complete state -->
        <StrategyChart
          v-else-if="sensitivityStore.status === 'complete' && sensitivityStore.results.length > 0"
          :results="sensitivityStore.results"
          :parameter-config="sensitivityStore.parameterConfig"
        />

        <!-- Error state -->
        <div
          v-else-if="sensitivityStore.status === 'error'"
          class="error-section"
        >
          <v-icon
            color="error"
            class="mr-2"
          >
            mdi-alert-circle
          </v-icon>
          <span>{{ sensitivityStore.error }}</span>
        </div>
      </v-card-text>

      <v-card-actions class="panel-actions">
        <v-btn
          v-if="sensitivityStore.status === 'complete'"
          variant="text"
          @click="sensitivityStore.resetToConfig"
        >
          設定に戻る
        </v-btn>
        <v-spacer />
        <v-btn
          v-if="sensitivityStore.status === 'computing'"
          variant="text"
          color="warning"
          @click="sensitivityStore.cancelComputation"
        >
          キャンセル
        </v-btn>
        <v-btn
          variant="text"
          @click="sensitivityStore.closeAnalysis"
        >
          閉じる
        </v-btn>
        <v-btn
          v-if="sensitivityStore.status === 'configuring'"
          color="primary"
          variant="flat"
          @click="sensitivityStore.startComputation"
        >
          分析開始
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useSensitivityStore } from '@/stores/sensitivity-store';
import ParameterSelector from './parameter-selector.vue';
import StrategyChart from './strategy-chart.vue';

const sensitivityStore = useSensitivityStore();

const progressPercentage = computed(() => {
    if (sensitivityStore.progress.total === 0) {
        return 0;
    }
    return (sensitivityStore.progress.current / sensitivityStore.progress.total) * 100;
});

function formatGauge(value: number): string {
    return (value / 1000).toFixed(1);
}
</script>

<style scoped>
.sensitivity-panel {
    background-color: var(--bg-primary);
}

.panel-title {
    display: flex;
    align-items: center;
    font-size: 16px;
    font-weight: 600;
    border-bottom: 1px solid var(--border-primary);
    padding: 16px 20px;
}

.panel-content {
    padding: 20px;
    min-height: 400px;
}

.node-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 8px;
    padding: 12px 16px;
    background-color: var(--bg-secondary);
    border-radius: var(--radius-md);
    margin-bottom: 20px;
}

.summary-item {
    display: flex;
    gap: 8px;
    font-size: 13px;
}

.summary-label {
    color: var(--text-tertiary);
    min-width: 40px;
}

.summary-value {
    color: var(--text-primary);
    font-family: var(--font-family-mono);
}

.computing-section {
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 24px;
}

.progress-info {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    color: var(--text-secondary);
}

.error-section {
    display: flex;
    align-items: center;
    padding: 16px;
    background-color: var(--bg-error);
    border-radius: var(--radius-md);
    color: var(--color-error);
}

.panel-actions {
    border-top: 1px solid var(--border-primary);
    padding: 12px 16px;
}
</style>
