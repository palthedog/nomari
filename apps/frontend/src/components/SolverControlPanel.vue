<template>
  <div class="solver-control-panel">
    <h3>戦略計算</h3>

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

    <!-- Status display -->
    <div class="status-section">
      <span class="status-label">状態:</span>
      <span :class="['status-value', statusClass]">{{ statusText }}</span>
    </div>

    <!-- Error display -->
    <div v-if="error" class="error-section">
      <strong>エラー:</strong> {{ error }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { GameTree } from '@mari/game-tree/game-tree';
import type { SolverStatus } from '../workers/solver-types';

const props = defineProps<{
  gameTree: GameTree | null;
  status: SolverStatus;
  error: string | null;
}>();

const emit = defineEmits<{
  start: [];
  pause: [];
  resume: [];
}>();

// Computed properties
const isRunning = computed(() => props.status === 'running');
const isPaused = computed(() => props.status === 'paused');
const isComplete = computed(() => props.status === 'complete');
const canStart = computed(() => props.gameTree !== null && !isRunning.value && !isPaused.value);

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
  emit('start');
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
</style>
