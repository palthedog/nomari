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
      <div class="editor-section">
        <GameDefinitionEditor v-model="gameDefinition" />
      </div>
      <div class="visualization-section">
        <div v-if="buildError" class="build-error">
          <strong>エラー:</strong> {{ buildError }}
        </div>
        <GameTreeVisualization v-if="gameTree" :game-tree="gameTree" />
        <div v-else-if="!buildError" class="no-tree-message">
          「ゲーム木を更新」ボタンを押してゲーム木を生成してください
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { GameDefinition } from '@mari/ts-proto';
import type { GameTree } from '@mari/game-tree/game-tree';
import { buildGameTree } from '@mari/game-tree-builder';
import { exportAsJSON, exportAsProto } from './utils/export';
import { createInitialGameDefinition } from './utils/game-definition-utils';
import GameDefinitionEditor from './components/GameDefinitionEditor.vue';
import GameTreeVisualization from './components/GameTreeVisualization.vue';

const gameDefinition = ref<GameDefinition>(createInitialGameDefinition());
const gameTree = ref<GameTree | null>(null);
const buildError = ref<string | null>(null);

function updateGameTree() {
  buildError.value = null;
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
