<template>
    <div class="visualization-section">
        <GameTreeVisualization v-if="gameTree" :game-tree="gameTree" />

        <div v-if="buildError" class="build-error">
            <strong>エラー:</strong> {{ buildError }}
        </div>
        <SolverControlPanel v-if="gameTree" :game-tree="gameTree" :status="solverStore.status"
            :error="solverStore.error" @start="$emit('start')" />

        <div v-else-if="!buildError" class="no-tree-message">
            「ゲーム木を更新」ボタンを押してゲーム木を生成してください
        </div>
    </div>
</template>

<script setup lang="ts">
import GameTreeVisualization from '@/components/game-tree/game-tree-visualization.vue';
import SolverControlPanel from '@/components/solver/solver-control-panel.vue';
import { useGameTreeStore } from '@/stores/game-tree-store';
import { useSolverStore } from '@/stores/solver-store';
import { computed } from 'vue';

const emit = defineEmits<{
    start: [];
}>();

const gameTreeStore = useGameTreeStore();
const solverStore = useSolverStore();

const gameTree = computed(() => gameTreeStore.gameTree);
const buildError = computed(() => gameTreeStore.buildError);


</script>

<style scoped></style>