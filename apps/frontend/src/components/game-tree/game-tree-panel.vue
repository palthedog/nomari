<template>
    <div class="visualization-section">
        <GameTreeVisualization v-if="gameTree" :game-tree="gameTree" />

        <div v-if="buildError" class="build-error">
            <strong>エラー:</strong> {{ buildError }}
        </div>
        <SolverControlPanel v-if="gameTree" :game-tree="gameTree" :status="solverStatus" :error="solverError"
            @start="handleSolverStart" />

        <div v-else-if="!buildError" class="no-tree-message">
            「ゲーム木を更新」ボタンを押してゲーム木を生成してください
        </div>
    </div>
</template>

<script setup lang="ts">
import GameTreeVisualization from '@/components/game-tree/game-tree-visualization.vue';
import SolverControlPanel from '@/components/solver/solver-control-panel.vue';
import { useSolver } from '@/composables/use-solver';
import { useGameTreeStore } from '@/stores/game-tree-store';
import { computed } from 'vue';

// Solver composable
const {
    status: solverStatus,
    strategies: solverStrategies,
    error: solverError,
    startSolving,
    pause: pauseSolver,
    resume: resumeSolver,
} = useSolver();

const gameTreeStore = useGameTreeStore();

const gameTree = computed(() => gameTreeStore.gameTree);
const buildError = computed(() => gameTreeStore.buildError);

// Solver handlers
function handleSolverStart() {
    // Rebuild game tree before starting strategy computation
    gameTreeStore.updateGameTree();

    // Start solving with the newly built tree
    if (gameTreeStore.gameTree) {
        startSolving(gameTreeStore.gameTree);
    }
}


</script>

<style scoped></style>