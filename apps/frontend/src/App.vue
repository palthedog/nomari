<template>
  <div class="app">
    <header class="app-header">
      <h1>Mari Editor</h1>
      <div class="header-actions">
        <button type="button" class="update-tree-btn" @click="updateGameTree">
          ゲーム木を更新
        </button>
        <button type="button" @click="exportJSON">
          JSONでエクスポート
        </button>
        <button type="button" @click="exportProto">
          Protoでエクスポート
        </button>
      </div>
    </header>

    <div class="app-content">
      <!-- Left: Game Definition Editor -->
      <div class="editor-section">
        <GameDefinitionEditor v-model="gameDefinition" />
      </div>

      <!-- Center: Game Tree Visualization + Solver Controls -->
      <div class="visualization-section">
        <div v-if="buildError" class="build-error">
          <strong>エラー:</strong> {{ buildError }}
        </div>

        <!-- Solver Control Panel (shown when game tree exists) -->
        <SolverControlPanel
          v-if="gameTree"
          :game-tree="gameTree"
          :status="solverStatus"
          :progress="solverProgress"
          :total-iterations="solverTotalIterations"
          :error="solverError"
          :exploitability-history="exploitabilityHistory"
          @start="handleSolverStart"
          @pause="handleSolverPause"
          @resume="handleSolverResume"
        />

        <!-- Game Tree Visualization -->
        <GameTreeVisualization
          v-if="gameTree"
          :game-tree="gameTree"
          :selected-node-id="selectedNodeId"
          @node-select="handleNodeSelect"
        />

        <div v-else-if="!buildError" class="no-tree-message">
          「ゲーム木を更新」ボタンを押してゲーム木を生成してください
        </div>
      </div>

      <!-- Right: Node Strategy Panel -->
      <div class="strategy-section">
        <NodeStrategyPanel
          :selected-node="selectedNode"
          :strategy-data="selectedNodeStrategy"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { GameDefinition } from '@mari/ts-proto';
import type { GameTree, Node } from '@mari/game-tree/game-tree';
import { buildGameTree } from '@mari/game-tree-builder';
import { exportAsJSON, exportAsProto } from './utils/export';
import { createInitialGameDefinition } from './utils/game-definition-utils';
import { useSolver } from './composables/use-solver';
import GameDefinitionEditor from './components/GameDefinitionEditor.vue';
import GameTreeVisualization from './components/GameTreeVisualization.vue';
import SolverControlPanel from './components/SolverControlPanel.vue';
import NodeStrategyPanel from './components/NodeStrategyPanel.vue';

// Game definition and tree state
const gameDefinition = ref<GameDefinition>(createInitialGameDefinition());
const gameTree = ref<GameTree | null>(null);
const buildError = ref<string | null>(null);

// Node selection state
const selectedNodeId = ref<string | null>(null);

// Solver composable
const {
  status: solverStatus,
  progress: solverProgress,
  totalIterations: solverTotalIterations,
  strategies: solverStrategies,
  error: solverError,
  exploitabilityHistory,
  startSolving,
  pause: pauseSolver,
  resume: resumeSolver,
} = useSolver();

// Computed properties
const selectedNode = computed<Node | null>(() => {
  if (!gameTree.value || !selectedNodeId.value) {
    return null;
  }
  return gameTree.value.nodes[selectedNodeId.value] ?? null;
});

const selectedNodeStrategy = computed(() => {
  if (!selectedNodeId.value) {
    return null;
  }
  return solverStrategies.value[selectedNodeId.value] ?? null;
});

// Game tree functions
function updateGameTree() {
  buildError.value = null;
  selectedNodeId.value = null;
  const result = buildGameTree(gameDefinition.value);
  if (result.success) {
    gameTree.value = result.gameTree;
  } else {
    gameTree.value = null;
    buildError.value = result.error.message;
  }
}

function exportJSON() {
  exportAsJSON(gameDefinition.value, `gamedefinition_${gameDefinition.value.gameId}.json`);
}

function exportProto() {
  exportAsProto(gameDefinition.value, `gamedefinition_${gameDefinition.value.gameId}.proto`);
}

// Node selection handler
function handleNodeSelect(nodeId: string) {
  selectedNodeId.value = nodeId;
}

// Solver handlers
function handleSolverStart(iterations: number) {
  if (gameTree.value) {
    startSolving(gameTree.value, iterations);
  }
}

function handleSolverPause() {
  pauseSolver();
}

function handleSolverResume() {
  resumeSolver();
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 30px;
  background-color: #2196F3;
  color: white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.app-header h1 {
  font-size: 24px;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.header-actions button {
  padding: 8px 16px;
  background-color: white;
  color: #2196F3;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.header-actions button:hover {
  background-color: #f0f0f0;
}

.app-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.editor-section {
  flex: 1;
  min-width: 300px;
  max-width: 400px;
  border-right: 1px solid #ddd;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.visualization-section {
  flex: 2;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.strategy-section {
  flex: 1;
  min-width: 280px;
  max-width: 350px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.build-error {
  padding: 15px;
  background-color: #ffebee;
  color: #c62828;
  border-bottom: 1px solid #ef9a9a;
}

.no-tree-message {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #666;
  font-size: 14px;
}

.update-tree-btn {
  background-color: #4CAF50 !important;
  color: white !important;
}

.update-tree-btn:hover {
  background-color: #45a049 !important;
}
</style>
