<template>
  <div class="solver-control-panel">
    <h3>戦略計算</h3>

    <!-- Iteration settings -->
    <div class="control-group">
      <label for="iterations">イテレーション数</label>
      <input id="iterations" v-model.number="iterations" type="number" min="100" max="100000" step="100"
        :disabled="isRunning" />
    </div>

    <!-- Control buttons -->
    <div class="button-group">
      <button type="button" class="primary-btn" :disabled="!canStart" @click="handleStart">
        {{ isComplete ? '再計算' : '戦略を計算' }}
      </button>

      <button type="button" class="secondary-btn" :disabled="!isRunning" title="将来の機能: 一時停止" @click="handlePause">
        一時停止
      </button>

      <button type="button" class="secondary-btn" :disabled="!isPaused" title="将来の機能: 再開" @click="handleResume">
        再開
      </button>
    </div>

    <!-- Progress display -->
    <div v-if="isRunning || isComplete" class="progress-section">
      <div class="progress-label">
        <span>進捗</span>
        <span>{{ progress }} / {{ totalIterations }}</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill" :style="{ width: progressPercent + '%' }"></div>
      </div>
    </div>

    <!-- Status display -->
    <div class="status-section">
      <span class="status-label">状態:</span>
      <span :class="['status-value', statusClass]">{{ statusText }}</span>
    </div>

    <!-- Error display -->
    <div v-if="error" class="error-section">
      <strong>エラー:</strong> {{ error }}
    </div>

    <!-- Exploitability chart placeholder -->
    <div class="chart-section" :hidden="true">
      <ExploitabilityChart :data="exploitabilityHistory" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { GameTree } from '@mari/game-tree/game-tree';
import type { SolverStatus, StrategyData } from '../workers/solver-types';
import ExploitabilityChart from './ExploitabilityChart.vue';

const props = defineProps<{
  gameTree: GameTree | null;
  status: SolverStatus;
  progress: number;
  totalIterations: number;
  error: string | null;
  exploitabilityHistory: Array<{ iteration: number; value: number }>;
}>();

const emit = defineEmits<{
  start: [iterations: number];
  pause: [];
  resume: [];
}>();

// Local state
const iterations = ref(1000);
const timeLimit = ref(60);

// Computed properties
const isRunning = computed(() => props.status === 'running');
const isPaused = computed(() => props.status === 'paused');
const isComplete = computed(() => props.status === 'complete');
const canStart = computed(() => props.gameTree !== null && !isRunning.value && !isPaused.value);

const progressPercent = computed(() => {
  if (props.totalIterations === 0) return 0;
  return Math.round((props.progress / props.totalIterations) * 100);
});

const statusText = computed(() => {
  switch (props.status) {
    case 'idle':
      return 'アイドル';
    case 'running':
      return '計算中...';
    case 'paused':
      return '一時停止';
    case 'complete':
      return '完了';
    default:
      return '不明';
  }
});

const statusClass = computed(() => {
  return {
    idle: 'status-idle',
    running: 'status-running',
    paused: 'status-paused',
    complete: 'status-complete',
  }[props.status];
});

// Event handlers
function handleStart() {
  emit('start', iterations.value);
}

function handlePause() {
  emit('pause');
}

function handleResume() {
  emit('resume');
}
</script>

<style scoped>
.solver-control-panel {
  padding: 16px;
  background-color: #fafafa;
  border-bottom: 1px solid #e0e0e0;
}

.solver-control-panel h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #333;
}

.control-group {
  margin-bottom: 12px;
}

.control-group label {
  display: block;
  margin-bottom: 4px;
  font-size: 13px;
  color: #666;
}

.control-group input {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.control-group input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.future-feature {
  position: relative;
  opacity: 0.6;
}

.feature-badge {
  position: absolute;
  top: 0;
  right: 0;
  padding: 2px 6px;
  background-color: #9e9e9e;
  color: white;
  font-size: 10px;
  border-radius: 3px;
}

.button-group {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.primary-btn,
.secondary-btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.primary-btn {
  background-color: #4CAF50;
  color: white;
}

.primary-btn:hover:not(:disabled) {
  background-color: #43a047;
}

.primary-btn:disabled {
  background-color: #c8e6c9;
  cursor: not-allowed;
}

.secondary-btn {
  background-color: #e0e0e0;
  color: #333;
}

.secondary-btn:hover:not(:disabled) {
  background-color: #bdbdbd;
}

.secondary-btn:disabled {
  background-color: #f5f5f5;
  color: #bdbdbd;
  cursor: not-allowed;
}

.progress-section {
  margin-bottom: 12px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  font-size: 12px;
  color: #666;
}

.progress-bar {
  height: 8px;
  background-color: #e0e0e0;
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background-color: #4CAF50;
  transition: width 0.3s ease;
}

.status-section {
  margin-bottom: 12px;
  font-size: 13px;
}

.status-label {
  color: #666;
}

.status-value {
  margin-left: 8px;
  font-weight: 500;
}

.status-idle {
  color: #9e9e9e;
}

.status-running {
  color: #2196F3;
}

.status-paused {
  color: #FF9800;
}

.status-complete {
  color: #4CAF50;
}

.error-section {
  padding: 10px;
  background-color: #ffebee;
  color: #c62828;
  border-radius: 4px;
  font-size: 13px;
  margin-bottom: 12px;
}

.chart-section {
  margin-top: 16px;
}
</style>
