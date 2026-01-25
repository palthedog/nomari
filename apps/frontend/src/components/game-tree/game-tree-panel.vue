<template>
  <div class="visualization-section">
    <GameTreeVisualization
      v-if="gameTree"
      :game-tree="gameTree"
    />

    <SolverControlPanel v-if="gameTree" />

    <div
      v-if="!gameTree"
      class="no-tree-message"
    >
      「ゲーム木を更新」ボタンを押してゲーム木を生成してください
    </div>
  </div>
</template>

<script setup lang="ts">
    import GameTreeVisualization from '@/components/game-tree/game-tree-visualization.vue';
    import SolverControlPanel from '@/components/solver/solver-control-panel.vue';
    import { useGameTreeStore } from '@/stores/game-tree-store';
    import { computed } from 'vue';

    const gameTreeStore = useGameTreeStore();

    const gameTree = computed(() => gameTreeStore.gameTree);
</script>

<style scoped></style>