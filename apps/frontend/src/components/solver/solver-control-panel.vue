<template>
  <div class="solver-control-panel">
    <h3>戦略計算</h3>

    <!-- Control buttons -->
    <div class="button-group">
      <button type="button" class="primary-btn" :disabled="!canStart" @click="handleStart">
        {{ isComplete ? '再計算' : '戦略を計算' }}
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
import type { SolverStatus } from '@/workers/solver-types';

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
const isComplete = computed(() => props.status === 'complete');
const canStart = computed(() => props.gameTree !== null && !isRunning.value);

const statusText = computed(() => {
  switch (props.status) {
    case 'idle':
      return 'アイドル';
    case 'running':
      return '計算中...';
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
</script>

<style scoped>
.solver-control-panel {
  padding: 16px;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-secondary);
}

.solver-control-panel h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: var(--text-primary);
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
  background-color: var(--color-primary);
  color: white;
}

.primary-btn:hover:not(:disabled) {
  background-color: var(--color-primary-hover);
}

.primary-btn:disabled {
  background-color: var(--color-disabled);
  cursor: not-allowed;
}

.secondary-btn {
  background-color: var(--border-secondary);
  color: var(--text-primary);
}

.secondary-btn:hover:not(:disabled) {
  background-color: var(--text-disabled);
}

.secondary-btn:disabled {
  background-color: var(--bg-disabled);
  color: var(--text-disabled);
  cursor: not-allowed;
}

.status-section {
  margin-bottom: 12px;
  font-size: 13px;
}

.status-label {
  color: var(--text-secondary);
}

.status-value {
  margin-left: 8px;
  font-weight: 500;
}

.status-idle {
  color: var(--text-disabled);
}

.status-running {
  color: var(--color-accent-blue);
}

.status-paused {
  color: var(--color-warning);
}

.status-complete {
  color: var(--color-success);
}

.error-section {
  padding: 10px;
  background-color: var(--bg-error);
  color: var(--color-error-dark);
  border-radius: 4px;
  font-size: 13px;
  margin-bottom: 12px;
}
</style>
