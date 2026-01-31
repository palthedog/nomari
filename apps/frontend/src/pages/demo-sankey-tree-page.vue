<template>
  <div class="demo-sankey-tree-page">
    <header class="demo-header">
      <div class="header-gold-line" />
      <div class="header-inner">
        <div class="header-brand">
          <v-icon
            class="brand-icon"
            icon="mdi-chart-sankey"
          />
          <div class="brand-text">
            <h1 class="brand-title">
              Sankey Tree Demo
            </h1>
            <span class="brand-subtitle">戦略遷移可視化</span>
          </div>
        </div>
        <div class="status-text">
          <span v-if="loading">読み込み中...</span>
          <span
            v-else-if="error"
            class="error-text"
          >{{ error }}</span>
          <span v-else>{{ nodeCount }} ノード</span>
        </div>
      </div>
      <div class="header-gold-line header-gold-line--bottom" />
    </header>

    <main class="demo-content">
      <aside class="left-panel">
        <SituationListPanel
          v-if="gameTree"
          :game-tree="gameTree"
          :selected-node-id="selectedNodeId"
          @select-node="selectNode"
        />
      </aside>

      <section class="right-panel">
        <SankeyTreeView
          v-if="selectedNode && strategy"
          :selected-node="selectedNode"
          :game-tree="gameTree!"
          :strategy="strategy"
          :all-strategies="strategies"
          @select-node="selectNode"
        />
        <div
          v-else-if="!loading"
          class="no-selection"
        >
          左のリストからノードを選択してください
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { parseAsProto } from '@/utils/export';
import { buildGameTree } from '@nomari/game-tree-builder';
import type { GameTree, Node } from '@nomari/game-tree/game-tree';
import type { StrategyData, SolverResult } from '@/workers/solver-types';
import SituationListPanel from '@/components/sankey-tree/situation-list-panel.vue';
import SankeyTreeView from '@/components/sankey-tree/sankey-tree-view.vue';
import LpWorker from '@/workers/lp-worker?worker';

const loading = ref(true);
const error = ref<string | null>(null);
const gameTree = ref<GameTree | null>(null);
const strategies = ref<Record<string, StrategyData>>({});
const selectedNodeId = ref<string | null>(null);

const selectedNode = computed<Node | null>(() => {
    if (!gameTree.value || !selectedNodeId.value) {
        return null;
    }
    return gameTree.value.nodes[selectedNodeId.value] ?? null;
});

const strategy = computed<StrategyData | null>(() => {
    if (!selectedNodeId.value) {
        return null;
    }
    return strategies.value[selectedNodeId.value] ?? null;
});

const nodeCount = computed(() =>
    gameTree.value ? Object.keys(gameTree.value.nodes).length : 0
);

function selectNode(nodeId: string) {
    selectedNodeId.value = nodeId;
}

async function loadAndSolve() {
    try {
        loading.value = true;
        error.value = null;

        const response = await fetch(`${import.meta.env.BASE_URL}static/examples/marisa.pb`);
        if (!response.ok) {
            throw new Error('Failed to load marisa.pb');
        }
        const buffer = await response.arrayBuffer();
        const scenario = parseAsProto(buffer);

        const result = buildGameTree(scenario);
        if (!result.success) {
            throw new Error(result.error.message);
        }
        gameTree.value = result.gameTree;
        selectedNodeId.value = result.gameTree.root;

        await solveGameTree(result.gameTree);
    } catch (e) {
        error.value = e instanceof Error ? e.message : 'Unknown error';
    } finally {
        loading.value = false;
    }
}

function solveGameTree(tree: GameTree): Promise<void> {
    return new Promise((resolve, reject) => {
        const worker = new LpWorker();

        worker.onmessage = (event: MessageEvent<SolverResult>) => {
            const result = event.data;
            if (result.type === 'complete') {
                strategies.value = result.strategies;
                worker.terminate();
                resolve();
            } else if (result.type === 'error') {
                worker.terminate();
                reject(new Error(result.message));
            }
        };

        worker.onerror = (e) => {
            worker.terminate();
            reject(new Error(e.message));
        };

        worker.postMessage({
            type: 'start',
            gameTree: JSON.parse(JSON.stringify(tree))
        });
    });
}

onMounted(() => {
    loadAndSolve();
});
</script>

<style scoped>
.demo-sankey-tree-page {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background-color: var(--bg-primary);
    color: var(--text-primary);
}

.demo-header {
    position: relative;
    z-index: 10;
    background: var(--header-gradient);
    color: var(--color-header-text);
    box-shadow: var(--shadow-lg);
}

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
    padding: 12px 24px;
}

.header-brand {
    display: flex;
    align-items: center;
    gap: 12px;
}

.brand-icon {
    font-size: 28px !important;
    color: var(--gold-light) !important;
}

.brand-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.brand-title {
    font-family: var(--font-family-display);
    font-size: 1.25rem;
    font-weight: 600;
    letter-spacing: 0.1em;
    color: var(--gold-light);
    margin: 0;
}

.brand-subtitle {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.85);
}

.status-text {
    font-size: 0.8125rem;
    color: rgba(255, 255, 255, 0.9);
}

.error-text {
    color: var(--color-error);
}

.demo-content {
    display: flex;
    flex: 1;
    overflow: hidden;
}

.left-panel {
    width: 280px;
    border-right: 1px solid var(--border-primary);
    overflow-y: auto;
    background: var(--bg-secondary);
}

.right-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 20px;
    overflow: auto;
}

.no-selection {
    color: var(--text-tertiary);
    font-size: 0.875rem;
}
</style>
