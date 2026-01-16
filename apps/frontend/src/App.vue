<template>
  <div class="app">
    <header class="app-header">
      <h1>Mari Editor</h1>
      <div class="header-content">
        <!-- View mode toggle -->
        <div class="view-mode-toggle">
          <button v-for="mode in viewModes" :key="mode.id" type="button" class="mode-btn"
            :class="{ active: viewMode === mode.id }" @click="viewMode = mode.id">
            {{ mode.label }}
          </button>
        </div>

        <div class="header-actions">
          <button type="button" @click="exportJSON">
            JSONでエクスポート
          </button>
          <button type="button" @click="exportProto">
            Protoでエクスポート
          </button>
        </div>
      </div>
    </header>

    <div class="app-content">
      <!-- Edit Mode: GameDefinitionEditor | GameTreeBuildPanel -->
      <template v-if="viewMode === 'edit'">
        <div class="editor-section">
          <GameDefinitionEditor v-model="gameDefinition" />
        </div>
        <div class="build-panel-section">
          <GameTreeBuildPanel v-model="gameDefinition" @update="updateGameTree" />
        </div>
      </template>

      <!-- Game Tree Mode: GameTreeBuildPanel | GameTreeVisualization -->
      <template v-else-if="viewMode === 'game-tree'">
        <div class="build-panel-section">
          <GameTreeBuildPanel v-model="gameDefinition" @update="updateGameTree" />
        </div>
        <div class="visualization-section">
          <div v-if="buildError" class="build-error">
            <strong>エラー:</strong> {{ buildError }}
          </div>

          <SolverControlPanel v-if="gameTree" :game-tree="gameTree" :status="solverStatus" :error="solverError"
            @start="handleSolverStart" @pause="handleSolverPause" @resume="handleSolverResume" />

          <GameTreeVisualization v-if="gameTree" :game-tree="gameTree" :selected-node-id="selectedNodeId"
            @node-select="handleNodeSelect" />

          <div v-else-if="!buildError" class="no-tree-message">
            「ゲーム木を更新」ボタンを押してゲーム木を生成してください
          </div>
        </div>
      </template>

      <!-- Strategy Mode: GameTreeVisualization | NodeStrategyPanel -->
      <template v-else-if="viewMode === 'strategy'">
        <div class="visualization-section">
          <div v-if="buildError" class="build-error">
            <strong>エラー:</strong> {{ buildError }}
          </div>

          <SolverControlPanel v-if="gameTree" :game-tree="gameTree" :status="solverStatus" :error="solverError"
            @start="handleSolverStart" @pause="handleSolverPause" @resume="handleSolverResume" />

          <GameTreeVisualization v-if="gameTree" :game-tree="gameTree" :selected-node-id="selectedNodeId"
            @node-select="handleNodeSelect" />

          <div v-else-if="!buildError" class="no-tree-message">
            「ゲーム木を更新」ボタンを押してゲーム木を生成してください
          </div>
        </div>

        <div class="strategy-section">
          <NodeStrategyPanel :selected-node="selectedNode" :strategy-data="selectedNodeStrategy"
            :expected-values="expectedValues" />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { GameDefinition } from '@mari/ts-proto';
import type { GameTree, Node } from '@mari/game-tree/game-tree';
import { buildGameTree } from '@mari/game-tree-builder';
import { exportAsJSON, exportAsProto } from './utils/export';
import { createInitialGameDefinition } from './utils/game-definition-utils';
import { useSolver } from './composables/use-solver';
import { calculateExpectedValues, type ExpectedValuesMap } from './utils/expected-value-calculator';
import GameDefinitionEditor from './components/GameDefinitionEditor.vue';
import GameTreeVisualization from './components/GameTreeVisualization.vue';
import SolverControlPanel from './components/SolverControlPanel.vue';
import NodeStrategyPanel from './components/NodeStrategyPanel.vue';
import GameTreeBuildPanel from './components/GameTreeBuildPanel.vue';

// View mode type definition
type ViewMode = 'edit' | 'game-tree' | 'strategy';

interface ViewModeConfig {
  id: ViewMode;
  label: string;
}

// View mode configuration (easily extensible)
const viewModes: ViewModeConfig[] = [
  { id: 'edit', label: '編集' },
  { id: 'game-tree', label: 'ゲーム木' },
  { id: 'strategy', label: '戦略' },
];

// View mode state
const viewMode = ref<ViewMode>('edit');

// Game definition and tree state
const gameDefinition = ref<GameDefinition>(createInitialGameDefinition());
const gameTree = ref<GameTree | null>(null);
const buildError = ref<string | null>(null);

// Node selection state
const selectedNodeId = ref<string | null>(null);

// Solver composable
const {
  status: solverStatus,
  strategies: solverStrategies,
  error: solverError,
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

// Calculate expected values for all nodes
const expectedValues = computed<ExpectedValuesMap | null>(() => {
  if (!gameTree.value || Object.keys(solverStrategies.value).length === 0) {
    return null;
  }
  try {
    return calculateExpectedValues(gameTree.value, solverStrategies.value);
  } catch (error) {
    console.error('Error calculating expected values:', error);
    return null;
  }
});

// Auto-switch to strategy mode when strategy is computed
watch(
  () => solverStrategies.value,
  (strategies) => {
    if (Object.keys(strategies).length > 0 && viewMode.value !== 'strategy') {
      viewMode.value = 'strategy';
    }
  },
  { deep: true }
);

// Game tree functions
function updateGameTree() {
  buildError.value = null;
  selectedNodeId.value = null;
  const result = buildGameTree(gameDefinition.value);
  if (result.success) {
    gameTree.value = result.gameTree;
    // Auto-switch to game-tree mode after successful build
    viewMode.value = 'game-tree';
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
function handleSolverStart() {
  // Rebuild game tree before starting strategy computation
  updateGameTree();

  // Start solving with the newly built tree
  if (gameTree.value) {
    startSolving(gameTree.value);
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

.header-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.view-mode-toggle {
  display: flex;
  gap: 0;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  padding: 2px;
}

.mode-btn {
  padding: 6px 16px;
  background-color: transparent;
  color: white;
  border: none;
  border-radius: 2px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
  transition: background-color 0.2s;
}

.mode-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.mode-btn.active {
  background-color: white;
  color: #2196F3;
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

/* Common section styles */
.build-panel-section {
  flex: 0 0 350px;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #ddd;
}

.editor-section {
  flex: 1;
  min-width: 0;
  border-right: 1px solid #ddd;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.visualization-section {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.strategy-section {
  flex: 0 0 400px;
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #ddd;
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
</style>
