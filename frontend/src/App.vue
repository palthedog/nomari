<template>
  <div class="app">
    <header class="app-header">
      <h1>Mari Editor</h1>
      <div class="header-actions">
        <button @click="exportJSON" type="button">JSONでエクスポート</button>
        <button @click="exportProto" type="button">Protoでエクスポート</button>
      </div>
    </header>

    <div class="app-content">
      <div class="editor-section">
        <GameTreeEditor v-model="gameTree" />
      </div>
      <div class="visualization-section">
        <GameTreeVisualization :game-tree="gameTree" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { GameTree, Node } from './game-tree';
import { exportAsJSON, exportAsProto } from './utils/export';
import GameTreeEditor from './components/GameTreeEditor.vue';
import GameTreeVisualization from './components/GameTreeVisualization.vue';

// 初期GameTreeを作成
const createInitialGameTree = (): GameTree => {
  const rootNode: Node = {
    id: 'root',
    description: 'ルートノード',
    transitions: []
  };

  return {
    id: 'game1',
    root: rootNode
  };
};

const gameTree = ref<GameTree>(createInitialGameTree());

function exportJSON() {
  exportAsJSON(gameTree.value, `gametree_${gameTree.value.id}.json`);
}

function exportProto() {
  exportAsProto(gameTree.value, `gametree_${gameTree.value.id}.proto`);
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
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
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
  border-right: 1px solid #ddd;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.visualization-section {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
