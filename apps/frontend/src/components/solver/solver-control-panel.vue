<template>
  <div class="solver-control-panel">
    <!-- Control buttons -->
    <div class="button-group">
      <button type="button" class="primary-btn" :disabled="!canStart" @click="handleStart">
        {{ '最適戦略を計算' }}
      </button>
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
}>();

// Computed properties
const isRunning = computed(() => props.status === 'running');
const canStart = computed(() => props.gameTree !== null && !isRunning.value);

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
