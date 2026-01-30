<template>
  <div class="app">
    <!-- Decorative background texture -->
    <div class="app-texture" />

    <!-- ═══════════════════════════════════════════════════════════
         ARENA HEADER - Roman Banner Style
         ═══════════════════════════════════════════════════════════ -->
    <header class="arena-header">
      <!-- Gold accent line -->
      <div class="header-gold-line" />

      <div class="header-inner">
        <!-- Logo with Roman styling -->
        <div class="header-brand">
          <v-icon
            class="brand-icon-svg"
            icon="mdi-scale-balance"
          />
          <div class="brand-text">
            <h1 class="brand-title">
              NOMARI
            </h1>
            <span class="brand-subtitle">起き攻め計算機 — GTO Solver</span>
          </div>
        </div>

        <!-- Header actions -->
        <nav class="header-nav">
          <button
            type="button"
            class="nav-btn"
            @click="importFile"
          >
            <v-icon
              class="btn-icon"
              icon="mdi-file-upload-outline"
            />
            <span class="btn-label">インポート</span>
          </button>

          <button
            type="button"
            class="nav-btn"
            @click="exportProto"
          >
            <v-icon
              class="btn-icon"
              icon="mdi-file-download-outline"
            />
            <span class="btn-label">エクスポート</span>
          </button>
        </nav>
      </div>

      <!-- Bottom gold accent -->
      <div class="header-gold-line header-gold-line--bottom" />
    </header>

    <!-- ═══════════════════════════════════════════════════════════
         MAIN CONTENT AREA
         ═══════════════════════════════════════════════════════════ -->
    <main class="arena-content">
      <!-- Edit Mode: ScenarioEditor | GameTreeBuildPanel -->
      <template v-if="viewMode === 'edit'">
        <!-- Desktop: Show both panels side by side -->
        <template v-if="!isMobile">
          <section class="panel panel--editor">
            <ScenarioEditor v-model="scenario" />
          </section>
          <section class="panel panel--build">
            <GameTreeBuildPanel v-model="scenario" />
          </section>
        </template>

        <!-- Mobile: Show one panel at a time -->
        <template v-else>
          <section
            v-show="mobileNavIndex === 0 || mobileNavIndex === 1"
            class="panel panel--editor panel--mobile-full"
          >
            <ScenarioEditor
              v-model="scenario"
              :is-mobile="isMobile"
              :mobile-sub-view="mobileNavIndex === 0 ? 'list' : 'detail'"
              @update:mobile-sub-view="mobileNavIndex = $event === 'list' ? 0 : 1"
            />
          </section>
          <section
            v-show="mobileNavIndex === 2"
            class="panel panel--build panel--mobile-full"
          >
            <GameTreeBuildPanel v-model="scenario" />
          </section>
        </template>

        <!-- Desktop only: View Strategy button -->
        <button
          v-if="!isMobile"
          type="button"
          class="arena-fab arena-fab--right"
          @click="switchToStrategyWithValidation()"
        >
          <span class="fab-text">戦略を確認</span>
          <v-icon
            icon="mdi-chevron-right"
            class="fab-icon"
          />
        </button>
      </template>

      <!-- Strategy Mode: GameTreeVisualization | NodeStrategyPanel -->
      <template v-else-if="viewMode === 'strategy'">
        <!-- Desktop: Show both panels side by side -->
        <template v-if="!isMobile">
          <GameTreePanel
            :game-tree="gameTree"
            class="panel panel--tree"
          />
          <section class="panel panel--strategy">
            <NodeStrategyPanel
              :selected-node="selectedNode"
              :strategy-data="selectedNodeStrategy"
              :expected-values="expectedValues"
            />
          </section>
        </template>

        <!-- Mobile: Show one panel at a time -->
        <template v-else>
          <GameTreePanel
            v-show="mobileNavIndex === 3"
            :game-tree="gameTree"
            class="panel--mobile-full"
          />
          <section
            v-show="mobileNavIndex === 4"
            class="panel panel--strategy panel--mobile-full"
          >
            <NodeStrategyPanel
              :selected-node="selectedNode"
              :strategy-data="selectedNodeStrategy"
              :expected-values="expectedValues"
            />
          </section>
        </template>

        <!-- Desktop only: Back to Edit button -->
        <button
          v-if="!isMobile"
          type="button"
          class="arena-fab arena-fab--left"
          @click="viewStore.switchToEdit()"
        >
          <v-icon
            icon="mdi-chevron-left"
            class="fab-icon fab-icon--left"
          />
          <span class="fab-text">編集に戻る</span>
        </button>
      </template>
    </main>

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
import { exportAsProto, importScenario } from '@/utils/export';
import { calculateExpectedValues, type ExpectedValuesMap } from '@/utils/expected-value-calculator';
import { useGameTreeStore } from '@/stores/game-tree-store';
import { useSolverStore } from '@/stores/solver-store';
import { useViewStore } from '@/stores/view-store';
import ScenarioEditor from '@/components/definition/scenario-editor.vue';
import NodeStrategyPanel from '@/components/game-tree/node-strategy-panel.vue';
import GameTreeBuildPanel from '@/components/game-tree/game-tree-build-panel.vue';
import MobileSubNav from '@/components/common/mobile-sub-nav.vue';
import { useScenarioStore } from './stores/scenario-store';
import { useNotificationStore } from './stores/notification-store';
import GameTreePanel from '@/components/game-tree/game-tree-panel.vue';
import { useUrlSync } from '@/composables/use-url-sync';
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
        if (!scenarioStore.validateAndShowErrors()) {
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

// Scenario and tree state
const scenarioStore = useScenarioStore();
const scenario = computed(() => scenarioStore.scenario);

// Notification store
const notificationStore = useNotificationStore();

// URL sync - handles bidirectional sync between URL and stores
useUrlSync();

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
    // Ensure solver has completed for the current game tree
    const isStrategiesForCurrentTree =
        solverStore.status === 'complete' &&
        solverStore.solvedFromGameTreeVersion === gameTreeStore.gameTreeVersion;
    if (!gameTree.value || !isStrategiesForCurrentTree) {
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

function exportProto() {
    exportAsProto(scenarioStore.scenario,
        `scenario_${scenarioStore.scenario.name}.pb`);
}

async function importFile() {
    try {
        const scenario = await importScenario();
        if (scenario) {
            scenarioStore.loadScenario(scenario);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        log.error('Failed to import file:', error);
        notificationStore.showError(`ファイルのインポートに失敗しました: ${message}`);
    }
}

onMounted(() => {
    // Add resize listener for mobile detection
    window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
});

/**
 * Switch to strategy mode with validation.
 * Validates the game definition first and only switches if valid.
 */
function switchToStrategyWithValidation() {
    if (!scenarioStore.validateAndShowErrors()) {
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

// Watch scenario for changes and increment version
// This catches direct mutations to scenario (e.g., scenario.situations.push())
watch(
    () => scenarioStore.scenario,
    () => {
        scenarioStore.incrementVersion();
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
/* ═══════════════════════════════════════════════════════════════════
   GLOBAL RESET & BASE STYLES
   ═══════════════════════════════════════════════════════════════════ */
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  font-family: var(--font-family-ui);
  font-weight: 400;
  line-height: 1.5;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  transition: background-color var(--transition-slow), color var(--transition-slow);
}

/* ═══════════════════════════════════════════════════════════════════
   APP CONTAINER
   ═══════════════════════════════════════════════════════════════════ */
.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background-color: var(--bg-primary);
  position: relative;
}

/* Subtle texture overlay for depth */
.app-texture {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: var(--noise-texture);
  background-repeat: repeat;
  opacity: 1;
  z-index: 0;
}

/* ═══════════════════════════════════════════════════════════════════
   ARENA HEADER - Roman Banner Style
   ═══════════════════════════════════════════════════════════════════ */
.arena-header {
  position: relative;
  z-index: 10;
  background: var(--header-gradient);
  color: var(--color-header-text);
  box-shadow: var(--shadow-lg), 0 4px 0 var(--gold-dark), 0 8px 32px rgba(0, 0, 0, 0.4);
}

/* Gold accent lines */
.header-gold-line {
  height: 3px;
  background: var(--gold-primary);
}

.header-gold-line--bottom {
  height: 2px;
}

.header-inner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 28px;
  max-width: 1800px;
  margin: 0 auto;
}

/* Brand styling */
.header-brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.brand-icon-svg {
  font-size: 36px !important;
  color: var(--gold-light) !important;
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
}

.brand-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.brand-title {
  font-family: var(--font-family-display);
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: 0.15em;
  color: var(--gold-light);
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  line-height: 1.1;
}

.brand-subtitle {
  font-family: var(--font-family-ui);
  font-size: 0.75rem;
  font-weight: 400;
  letter-spacing: 0.05em;
  opacity: 0.9;
  color: rgba(255, 255, 255, 0.85);
}

/* Header navigation */
.header-nav {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--border-radius-md);
  color: white;
  font-family: var(--font-family-ui);
  font-size: 0.8125rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  backdrop-filter: blur(4px);
}

.nav-btn:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

.nav-btn:active {
  transform: translateY(0);
}

.btn-icon {
  font-size: 16px !important;
  flex-shrink: 0;
}

.btn-label {
  white-space: nowrap;
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN CONTENT AREA
   ═══════════════════════════════════════════════════════════════════ */
.arena-content {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
  z-index: 1;
  background: var(--bg-primary);
}

/* Panel styles */
.panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--bg-primary);
  position: relative;
}

.panel--editor {
  flex: 1;
  min-width: 0;
  border-right: 1px solid var(--border-primary);
}

.panel--build {
  flex: 0 0 360px;
  min-width: 0;
  border-left: 1px solid var(--border-primary);
  background: var(--bg-tertiary);
}

.panel--tree {
  flex: 1;
  min-width: 0;
}

.panel--strategy {
  flex: 0 0 420px;
  min-width: 0;
  border-left: 1px solid var(--border-primary);
}

.panel--mobile-full {
  flex: 1 !important;
  width: 100%;
  height: 100%;
  border: none !important;
}

/* ═══════════════════════════════════════════════════════════════════
   FLOATING ACTION BUTTONS - Arena Style
   ═══════════════════════════════════════════════════════════════════ */
.arena-fab {
  position: fixed;
  bottom: 28px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 24px;
  background: var(--header-gradient);
  color: white;
  border: 2px solid var(--gold-primary);
  border-radius: var(--border-radius-lg);
  font-family: var(--font-family-ui);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: var(--shadow-lg);
  transition: all var(--transition-fast);
  z-index: 100;
}

.arena-fab:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-xl);
  border-color: var(--gold-light);
}

.arena-fab:active {
  transform: translateY(-1px);
}

.arena-fab--right {
  right: 28px;
}

.arena-fab--left {
  left: 28px;
}

.fab-icon {
  font-size: 18px !important;
}

.fab-icon--left {
  order: -1;
}

.fab-text {
  white-space: nowrap;
}

/* ═══════════════════════════════════════════════════════════════════
   MOBILE NAVIGATION
   ═══════════════════════════════════════════════════════════════════ */
.mobile-nav-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 99;
}

/* ═══════════════════════════════════════════════════════════════════
   MOBILE RESPONSIVE STYLES
   ═══════════════════════════════════════════════════════════════════ */
@media (max-width: 768px) {
  .header-inner {
    flex-direction: column;
    gap: 12px;
    padding: 10px 16px;
  }

  .header-brand {
    gap: 10px;
  }

  .brand-icon-svg {
    font-size: 28px !important;
  }

  .brand-title {
    font-size: 1.25rem;
  }

  .brand-subtitle {
    font-size: 0.6875rem;
  }

  .header-nav {
    width: 100%;
    justify-content: center;
    gap: 6px;
  }

  .nav-btn {
    padding: 6px 12px;
    font-size: 0.75rem;
  }

  .btn-label {
    display: none;
  }

  .nav-btn .btn-icon {
    font-size: 18px !important;
  }

  .arena-content {
    flex-direction: column;
    padding-bottom: 60px;
  }

  .arena-fab {
    padding: 12px 18px;
    font-size: 0.8125rem;
    bottom: 76px;
  }

  .arena-fab--right {
    right: 16px;
  }

  .arena-fab--left {
    left: 16px;
  }
}

/* ═══════════════════════════════════════════════════════════════════
   TABLET RESPONSIVE STYLES
   ═══════════════════════════════════════════════════════════════════ */
@media (min-width: 769px) and (max-width: 1024px) {
  .panel--build {
    flex: 0 0 300px;
  }

  .panel--strategy {
    flex: 0 0 340px;
  }
}
</style>
