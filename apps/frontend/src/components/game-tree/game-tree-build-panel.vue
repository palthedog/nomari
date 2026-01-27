<template>
  <div class="game-tree-build-panel">
    <div class="panel-header">
      <h3>ゲーム木構築設定</h3>
    </div>
    <div class="panel-content">
      <InitialDynamicStateEditor
        v-if="gameDefinition.initialDynamicState"
        v-model="gameDefinition.initialDynamicState"
      />

      <RewardComputationMethodEditor v-model="gameDefinition.rewardComputationMethod" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GameDefinition } from '@nomari/ts-proto';
import InitialDynamicStateEditor from '../definition/initial-dynamic-state-editor.vue';
import RewardComputationMethodEditor from '../definition/reward-computation-method-editor.vue';

const gameDefinition = defineModel<GameDefinition>({ required: true });
</script>

<style scoped>
.game-tree-build-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    border-right: 1px solid var(--border-primary);
    background-color: var(--bg-tertiary);
}

.panel-header {
    padding: 15px;
    background-color: var(--bg-primary);
    border-bottom: 1px solid var(--border-primary);
}

.panel-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
}

.panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 15px;
    padding-bottom: 80px; /* Space for floating button */
    display: flex;
    flex-direction: column;
    gap: 20px;
}
</style>
