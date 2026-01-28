<template>
  <div class="app">
    <header class="app-header">
      <h1>Nomari 起き攻め 計算機</h1>
      <div class="header-content">
        <!-- View mode toggle -->
        <div class="view-mode-toggle">
          <button
            v-for="mode in viewModes"
            :key="mode.id"
            type="button"
            class="mode-btn"
            :class="{ active: viewMode === mode.id }"
            @click="viewStore.setViewMode(mode.id)"
          >
            {{ mode.label }}
          </button>
        </div>

        <div class="header-actions">
          <button
            type="button"
            @click="importFile"
          >
            インポート
          </button>
          <!--
          <button type="button" @click="exportJSON">
            JSONでエクスポート
          </button>
          -->
          <button
            type="button"
            @click="exportProto"
          >
            エクスポート
          </button>
        </div>
      </div>
    </header>

    <div class="app-content">
      <!-- Edit Mode: GameDefinitionEditor | GameTreeBuildPanel -->
      <template v-if="viewMode === 'edit'">
        <!-- Desktop: Show both panels side by side -->
        <template v-if="!isMobile">
          <div class="editor-section">
            <GameDefinitionEditor v-model="gameDefinition" />
          </div>
          <div class="build-panel-section">
            <GameTreeBuildPanel v-model="gameDefinition" />
          </div>
        </template>

        <!-- Mobile: Show one panel at a time -->
        <template v-else>
          <div
            v-show="mobileNavIndex === 0 || mobileNavIndex === 1"
            class="editor-section mobile-full"
          >
            <GameDefinitionEditor
              v-model="gameDefinition"
              :is-mobile="isMobile"
              :mobile-sub-view="mobileNavIndex === 0 ? 'list' : 'detail'"
              @update:mobile-sub-view="mobileNavIndex = $event === 'list' ? 0 : 1"
            />
          </div>
          <div
            v-show="mobileNavIndex === 2"
            class="build-panel-section mobile-full"
          >
            <GameTreeBuildPanel v-model="gameDefinition" />
          </div>
        </template>

        <!-- Desktop only: View Strategy button -->
        <button
          v-if="!isMobile"
          type="button"
          class="floating-btn floating-btn-right"
          @click="switchToStrategyWithValidation()"
        >
          戦略を確認
        </button>
      </template>

      <!-- Strategy Mode: GameTreeVisualization | NodeStrategyPanel -->
      <template v-else-if="viewMode === 'strategy'">
        <!-- Desktop: Show both panels side by side -->
        <template v-if="!isMobile">
          <GameTreePanel :game-tree="gameTree" />
          <div class="strategy-section">
            <NodeStrategyPanel
              :selected-node="selectedNode"
              :strategy-data="selectedNodeStrategy"
              :expected-values="expectedValues"
            />
          </div>
        </template>

        <!-- Mobile: Show one panel at a time -->
        <template v-else>
          <GameTreePanel
            v-show="mobileNavIndex === 3"
            :game-tree="gameTree"
            class="mobile-full"
          />
          <div
            v-show="mobileNavIndex === 4"
            class="strategy-section mobile-full"
          >
            <NodeStrategyPanel
              :selected-node="selectedNode"
              :strategy-data="selectedNodeStrategy"
              :expected-values="expectedValues"
            />
          </div>
        </template>

        <!-- Desktop only: Back to Edit button -->
        <button
          v-if="!isMobile"
          type="button"
          class="floating-btn floating-btn-left"
          @click="viewStore.switchToEdit()"
        >
          編集に戻る
        </button>
      </template>
    </div>

    <!-- Mobile: Unified navigation bar for all 5 pages -->
    <MobileSubNav
      v-if="isMobile"
      :current-index="mobileNavIndex"
      :total-views="5"
      :left-label="mobileNavLeftLabel"
      :right-label="mobileNavRightLabel"
      class="mobile-nav-bar"
      @navigate="handleMobileNavigation"
    />

    <v-snackbar
      v-model="notificationStore.show"
      :color="notificationStore.type"
      :timeout="5000"
      location="bottom"
    >
      {{ notificationStore.message }}
    </v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { Node } from '@nomari/game-tree/game-tree';
import { exportAsJSON, exportAsProto, importGameDefinition, parseAsProto } from '@/utils/export';
import { calculateExpectedValues, type ExpectedValuesMap } from '@/utils/expected-value-calculator';
import { useGameTreeStore } from '@/stores/game-tree-store';
import { useSolverStore } from '@/stores/solver-store';
import { useViewStore, VIEW_MODES } from '@/stores/view-store';
import GameDefinitionEditor from '@/components/definition/game-definition-editor.vue';
import NodeStrategyPanel from '@/components/game-tree/node-strategy-panel.vue';
import GameTreeBuildPanel from '@/components/game-tree/game-tree-build-panel.vue';
import MobileSubNav from '@/components/common/mobile-sub-nav.vue';
import { useDefinitionStore } from './stores/definition-store';
import { useNotificationStore } from './stores/notification-store';
import GameTreePanel from '@/components/game-tree/game-tree-panel.vue';
import log from 'loglevel';

// Mobile detection
const MOBILE_BREAKPOINT = 768;
const windowWidth = ref(typeof window !== 'undefined' ? window.innerWidth : 1024);
const isMobile = computed(() => windowWidth.value <= MOBILE_BREAKPOINT);


// Mobile unified navigation: 5 pages across edit and strategy modes
// 0: list, 1: detail, 2: settings, 3: tree, 4: strategy
const mobileNavIndex = ref(0);

function handleResize() {
    windowWidth.value = window.innerWidth;
}

// Labels for mobile unified navigation (5 pages)
const mobileNavLabels = ['一覧', '編集', '初期状態', 'ゲーム木', '最適戦略'];

const mobileNavLeftLabel = computed(() => {
    if (mobileNavIndex.value === 0) {
        return '';
    }
    return mobileNavLabels[mobileNavIndex.value - 1];
});

const mobileNavRightLabel = computed(() => {
    if (mobileNavIndex.value === 4) {
        return '';
    }
    return mobileNavLabels[mobileNavIndex.value + 1];
});

function handleMobileNavigation(index: number) {
    // Validate before switching to strategy pages (index 3 or 4)
    if (index >= 3 && mobileNavIndex.value < 3) {
        if (!definitionStore.validateAndShowErrors()) {
            return;
        }
    }

    mobileNavIndex.value = index;

    // Update viewMode based on index
    if (index <= 2) {
        viewStore.setViewMode('edit');
    } else {
        viewStore.setViewMode('strategy');
    }
}

// View store
const viewStore = useViewStore();
const viewMode = computed(() => viewStore.viewMode);
const viewModes = VIEW_MODES;

// Game definition and tree state
const definitionStore = useDefinitionStore();
const gameDefinition = computed(() => definitionStore.gameDefinition);

// Notification store
const notificationStore = useNotificationStore();

const gameTree = computed(() => gameTreeStore.gameTree);

// Game tree store
const gameTreeStore = useGameTreeStore();

// Solver store
const solverStore = useSolverStore();
const solverStrategies = computed(() => solverStore.strategies);

// Computed properties
const selectedNode = computed<Node | null>(() => {
    if (!gameTree.value || !gameTreeStore.selectedNodeId) {
        return null;
    }
    return gameTree.value.nodes[gameTreeStore.selectedNodeId] ?? null;
});

const selectedNodeStrategy = computed(() => {
    log.info('selectedNodeId', gameTreeStore.selectedNodeId);
    if (!gameTreeStore.selectedNodeId) {
        return null;
    }
    log.info('solverStrategies', solverStrategies.value);
    log.info('solverStrategies[gameTreeStore.selectedNodeId]', solverStrategies.value[gameTreeStore.selectedNodeId]);
    return solverStrategies.value[gameTreeStore.selectedNodeId] ?? null;
});

// Calculate expected values for all nodes
const expectedValues = computed<ExpectedValuesMap | null>(() => {
    if (!gameTree.value || Object.keys(solverStrategies.value).length === 0) {
        return null;
    }
    try {
        return calculateExpectedValues(gameTree.value, solverStrategies.value);
    } catch (error) {
        log.error('Error calculating expected values:', error);
        notificationStore.showError('期待値の計算中にエラーが発生しました');
        return null;
    }
});

function _exportJSON() {
    exportAsJSON(definitionStore.gameDefinition,
        `gamedefinition_${definitionStore.gameDefinition.name}.json`);
}

function exportProto() {
    exportAsProto(definitionStore.gameDefinition,
        `gamedefinition_${definitionStore.gameDefinition.name}.pb`);
}

async function importFile() {
    try {
        const gameDefinition = await importGameDefinition();
        if (gameDefinition) {
            definitionStore.loadGameDefinition(gameDefinition);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        log.error('Failed to import file:', error);
        notificationStore.showError(`ファイルのインポートに失敗しました: ${message}`);
    }
}

// Validate example name to prevent path traversal (alphanumeric and underscore only)
function isValidExampleName(name: string): boolean {
    return /^[a-zA-Z0-9_]+$/.test(name);
}

async function loadExample(exampleName: string) {
    if (!isValidExampleName(exampleName)) {
        notificationStore.showError(`Invalid example name: ${exampleName}`);
        return;
    }
    try {
        const response = await fetch(`${import.meta.env.BASE_URL}static/examples/${exampleName}.pb`);
        // Check response status and content type (Vite may return HTML for 404)
        const contentType = response.headers.get('content-type') ?? '';
        if (!response.ok || contentType.includes('text/html')) {
            notificationStore.showError(`Failed to load example: ${exampleName}`);
            return;
        }
        const buffer = await response.arrayBuffer();
        const gameDefinition = parseAsProto(buffer);
        definitionStore.loadGameDefinition(gameDefinition);
    } catch (error) {
        log.error('Failed to load example:', error);
        notificationStore.showError(`Failed to load example: ${exampleName}`);
    }
}

onMounted(async () => {
    // Add resize listener for mobile detection
    window.addEventListener('resize', handleResize);

    const params = new URLSearchParams(window.location.search);
    const exampleName = params.get('example');
    if (!exampleName) {
        return;
    }
    await loadExample(exampleName);
});

onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
});

/**
 * Switch to strategy mode with validation.
 * Validates the game definition first and only switches if valid.
 */
function switchToStrategyWithValidation() {
    if (!definitionStore.validateAndShowErrors()) {
        return;
    }
    viewStore.switchToStrategy();
}

// Watch viewMode and auto-solve when switching to strategy mode
watch(viewMode, (newMode) => {
    if (newMode === 'strategy') {
        solverStore.ensureSolved();
    }
});

// Watch gameDefinition for changes and increment version
// This catches direct mutations to gameDefinition (e.g., gameDefinition.situations.push())
watch(
    () => definitionStore.gameDefinition,
    () => {
        definitionStore.incrementVersion();
    },
    {
        deep: true 
    }
);

// Auto-switch to strategy panel when node is selected on mobile
watch(
    () => gameTreeStore.selectedNodeId,
    (newNodeId) => {
        if (isMobile.value && newNodeId && viewMode.value === 'strategy') {
            mobileNavIndex.value = 4; // Switch to strategy panel
        }
    }
);

// Sync mobileNavIndex when viewMode changes (e.g., from header tabs)
watch(viewMode, (newMode) => {
    if (!isMobile.value) {
        return;
    }
    if (newMode === 'strategy' && mobileNavIndex.value < 3) {
        mobileNavIndex.value = 3; // Switch to tree view
    } else if (newMode === 'edit' && mobileNavIndex.value >= 3) {
        mobileNavIndex.value = 0; // Switch to list view
    }
});

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
  background-color: var(--color-accent-coral);
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
  color: var(--color-accent-blue);
}

.header-actions {
  display: flex;
  gap: 10px;
}

.header-actions button {
  padding: 8px 16px;
  background-color: white;
  color: var(--color-accent-blue);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}

.header-actions button:hover {
  background-color: var(--bg-hover);
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
  border-right: 1px solid var(--border-primary);
}

.editor-section {
  flex: 1;
  min-width: 0;
  border-right: 1px solid var(--border-primary);
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
  border-left: 1px solid var(--border-primary);
}

.build-error {
  padding: 15px;
  background-color: var(--bg-error);
  color: var(--color-error-dark);
  border-bottom: 1px solid var(--color-error-border);
}

.no-tree-message {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-secondary);
  font-size: 14px;
}

/* Floating action buttons */
.floating-btn {
  position: fixed;
  bottom: 24px;
  padding: 14px 28px;
  background-color: var(--color-accent-coral);
  color: white !important;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  font-size: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s, box-shadow 0.2s, background-color 0.2s;
  z-index: 100;
}

.floating-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
  background-color: var(--color-accent-coral-hover);
}

.floating-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.floating-btn-right {
  right: 24px;
}

.floating-btn-left {
  left: 24px;
}

/* Mobile navigation bar */
.mobile-nav-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 99;
}

/* Mobile responsive styles */
@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    gap: 10px;
    padding: 10px 15px;
  }

  .app-header h1 {
    font-size: 18px;
  }

  .header-content {
    width: 100%;
    justify-content: space-between;
    gap: 10px;
  }

  .mode-btn {
    padding: 6px 12px;
    font-size: 13px;
  }

  .header-actions button {
    padding: 6px 12px;
    font-size: 13px;
  }

  .app-content {
    flex-direction: column;
    padding-bottom: 60px; /* Space for mobile nav bar */
  }

  /* Mobile full-screen panel */
  .mobile-full {
    flex: 1 !important;
    width: 100%;
    height: 100%;
    border: none !important;
  }

  /* Edit mode on mobile */
  .editor-section.mobile-full {
    border-bottom: none;
  }

  .build-panel-section.mobile-full {
    max-height: none;
  }

  /* Strategy mode on mobile */
  .strategy-section.mobile-full {
    border-top: none;
  }

  .visualization-section {
    flex: 1;
  }

  /* Floating buttons - position above nav bar */
  .floating-btn {
    padding: 12px 20px;
    font-size: 14px;
    bottom: 76px; /* Above the 60px nav bar + 16px margin */
  }

  .floating-btn-right {
    right: 16px;
  }

  .floating-btn-left {
    left: 16px;
  }
}

/* Tablet responsive styles */
@media (min-width: 769px) and (max-width: 1024px) {
  .build-panel-section {
    flex: 0 0 280px;
  }

  .strategy-section {
    flex: 0 0 320px;
  }
}
</style>
