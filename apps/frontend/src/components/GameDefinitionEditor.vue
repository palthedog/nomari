<template>
  <div class="game-definition-editor">
    <div class="header">
      <h2>GameDefinition エディタ</h2>
      <div v-if="validationErrors.length > 0" class="validation-errors">
        <h4>バリデーションエラー:</h4>
        <ul>
          <li v-for="(error, index) in validationErrors" :key="index">
            <strong>{{ error.field }}:</strong> {{ error.message }}
          </li>
        </ul>
      </div>
      <div class="header-controls">
        <div class="form-group">
          <label>Game ID:</label>
          <input v-model="gameDefinition.id" type="text">
        </div>
        <div class="form-group">
          <label>Name:</label>
          <input v-model="gameDefinition.name" type="text">
        </div>
        <div class="form-group">
          <label>Description:</label>
          <input v-model="gameDefinition.description" type="text">
        </div>
        <div class="form-group">
          <label>開始状況:</label>
          <select v-model="gameDefinition.rootSituationId">
            <option value="">
              選択してください
            </option>
            <option v-for="situation in gameDefinition.situations" :key="situation.situationId"
              :value="situation.situationId">
              <!--{{ situation.situationId }} -->
              {{ situation.description || '(説明なし)' }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <div class="content">
      <div class="left-panel">
        <div class="panel-header">
          <h3>編集可能な要素</h3>
        </div>
        <div class="panel-content">
          <!-- 初期状態 -->
          <div class="section-group">
            <div class="section-item initial-state-item" :class="{ active: selectedItemType === 'initial-state' }"
              @click="selectInitialState">
              <span class="section-icon">⚙️</span>
              初期状態(InitialDynamicState)
            </div>
          </div>

          <!-- 状況(Situation) -->
          <div class="section-group">
            <div class="section-header">
              <h4>状況(Situation)</h4>
            </div>
            <ul class="section-list">
              <li v-for="situation in gameDefinition.situations" :key="situation.situationId"
                class="section-item situation-item" :class="{ active: selectedSituationId === situation.situationId }"
                @click="selectSituation(situation.situationId)">
                {{ situation.description || '(説明なし)' }}
              </li>
              <li class="section-item add-button" @click="addSituation">
                <span class="add-icon">+</span>
                追加
              </li>
            </ul>
          </div>

          <!-- 終了条件 -->
          <div class="section-group">
            <div class="section-header">
              <h4>終了条件</h4>
            </div>
            <ul class="section-list">
              <li v-for="terminal in gameDefinition.terminalSituations" :key="terminal.situationId"
                class="section-item terminal-situation-item"
                :class="{ active: selectedTerminalSituationId === terminal.situationId }"
                @click="selectTerminalSituation(terminal.situationId)">
                {{ terminal.name || '(名前なし)' }}
              </li>
              <li class="section-item add-button" @click="addTerminalSituation">
                <span class="add-icon">+</span>
                追加
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div class="panel-header">
          <h3>編集</h3>
        </div>
        <div class="panel-content">
          <InitialDynamicStateEditor v-if="selectedItemType === 'initial-state' && gameDefinition.initialDynamicState"
            v-model="gameDefinition.initialDynamicState" />
          <SituationEditor v-else-if="selectedSituation" :model-value="selectedSituation"
            :available-situations="gameDefinition.situations"
            :available-terminal-situations="gameDefinition.terminalSituations" @update:model-value="updateSituation"
            @delete="deleteSituation" />
          <TerminalSituationEditor v-else-if="selectedTerminalSituation" :model-value="selectedTerminalSituation"
            @update:model-value="updateTerminalSituation" @delete="deleteTerminalSituation" />
          <div v-else class="no-selection">
            <p>編集する要素を選択してください</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type {
  GameDefinition,
  Situation,
  TerminalSituation,
} from '@mari/ts-proto';
import {
  createEmptySituation,
  createEmptyTerminalSituation,
} from '../utils/game-definition-utils';
import { validateGameDefinition, type ValidationError } from '../utils/validation';
import SituationEditor from './SituationEditor.vue';
import TerminalSituationEditor from './TerminalSituationEditor.vue';
import InitialDynamicStateEditor from './InitialDynamicStateEditor.vue';

const gameDefinition = defineModel<GameDefinition>({ required: true });

const selectedItemType = ref<'initial-state' | 'situation' | 'terminal-situation' | null>(null);
const selectedSituationId = ref<string | null>(null);
const selectedTerminalSituationId = ref<string | null>(null);

const validationErrors = computed<ValidationError[]>(() => {
  return validateGameDefinition(gameDefinition.value);
});

const selectedSituation = computed(() => {
  if (!selectedSituationId.value) return null;
  return (
    gameDefinition.value.situations.find(
      (s) => s.situationId === selectedSituationId.value
    ) || null
  );
});

const selectedTerminalSituation = computed(() => {
  if (!selectedTerminalSituationId.value) return null;
  return (
    gameDefinition.value.terminalSituations.find(
      (t) => t.situationId === selectedTerminalSituationId.value
    ) || null
  );
});

function selectInitialState() {
  selectedItemType.value = 'initial-state';
  selectedSituationId.value = null;
  selectedTerminalSituationId.value = null;
}

function selectSituation(situationId: string) {
  selectedItemType.value = 'situation';
  selectedSituationId.value = situationId;
  selectedTerminalSituationId.value = null;
}

function selectTerminalSituation(terminalSituationId: string) {
  selectedItemType.value = 'terminal-situation';
  selectedTerminalSituationId.value = terminalSituationId;
  selectedSituationId.value = null;
}

function addSituation() {
  const newSituation = createEmptySituation();
  gameDefinition.value.situations.push(newSituation);
  selectSituation(newSituation.situationId);
}

function updateSituation(updatedSituation: Situation) {
  const index = gameDefinition.value.situations.findIndex(
    (s) => s.situationId === updatedSituation.situationId
  );
  if (index !== -1) {
    gameDefinition.value.situations.splice(index, 1, updatedSituation);
  }
}

function deleteSituation() {
  if (!selectedSituationId.value) return;

  const situationId = selectedSituationId.value;
  const index = gameDefinition.value.situations.findIndex((s) => s.situationId === situationId);
  if (index !== -1) {
    gameDefinition.value.situations.splice(index, 1);

    // Remove references from transitions
    for (const situation of gameDefinition.value.situations) {
      situation.transitions = situation.transitions.filter(
        (t) => t.nextSituationId !== situationId
      );
    }

    // Update rootSituationId if it was deleted
    if (gameDefinition.value.rootSituationId === situationId) {
      if (gameDefinition.value.situations.length > 0) {
        gameDefinition.value.rootSituationId = gameDefinition.value.situations[0].situationId;
      } else if (gameDefinition.value.terminalSituations.length > 0) {
        gameDefinition.value.rootSituationId =
          gameDefinition.value.terminalSituations[0].situationId;
      } else {
        gameDefinition.value.rootSituationId = '';
      }
    }

    // Select next situation
    if (gameDefinition.value.situations.length > 0) {
      selectSituation(gameDefinition.value.situations[0].situationId);
    } else if (gameDefinition.value.terminalSituations.length > 0) {
      selectTerminalSituation(gameDefinition.value.terminalSituations[0].situationId);
    } else {
      selectedItemType.value = null;
      selectedSituationId.value = null;
      selectedTerminalSituationId.value = null;
    }
  }
}

function addTerminalSituation() {
  const newTerminalSituation = createEmptyTerminalSituation();
  gameDefinition.value.terminalSituations.push(newTerminalSituation);
  selectTerminalSituation(newTerminalSituation.situationId);
}

function updateTerminalSituation(updatedTerminalSituation: TerminalSituation) {
  const index = gameDefinition.value.terminalSituations.findIndex(
    (t) => t.situationId === updatedTerminalSituation.situationId
  );
  if (index !== -1) {
    gameDefinition.value.terminalSituations.splice(index, 1, updatedTerminalSituation);
  }
}

function deleteTerminalSituation() {
  if (!selectedTerminalSituationId.value) return;

  const terminalSituationId = selectedTerminalSituationId.value;
  const index = gameDefinition.value.terminalSituations.findIndex(
    (t) => t.situationId === terminalSituationId
  );
  if (index !== -1) {
    gameDefinition.value.terminalSituations.splice(index, 1);

    // Remove references from transitions
    for (const situation of gameDefinition.value.situations) {
      situation.transitions = situation.transitions.filter(
        (t) => t.nextSituationId !== terminalSituationId
      );
    }

    // Update rootSituationId if it was deleted
    if (gameDefinition.value.rootSituationId === terminalSituationId) {
      if (gameDefinition.value.situations.length > 0) {
        gameDefinition.value.rootSituationId = gameDefinition.value.situations[0].situationId;
      } else if (gameDefinition.value.terminalSituations.length > 0) {
        gameDefinition.value.rootSituationId =
          gameDefinition.value.terminalSituations[0].situationId;
      } else {
        gameDefinition.value.rootSituationId = '';
      }
    }

    // Select next terminal situation
    if (gameDefinition.value.terminalSituations.length > 0) {
      selectTerminalSituation(gameDefinition.value.terminalSituations[0].situationId);
    } else if (gameDefinition.value.situations.length > 0) {
      selectSituation(gameDefinition.value.situations[0].situationId);
    } else {
      selectedItemType.value = null;
      selectedSituationId.value = null;
      selectedTerminalSituationId.value = null;
    }
  }
}

// updateInitialDynamicState is no longer needed - v-model handles it automatically
</script>

<style scoped>
.game-definition-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header {
  padding: 20px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.header h2 {
  margin: 0 0 15px 0;
}

.header-controls {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.form-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.form-group label {
  font-weight: bold;
  white-space: nowrap;
}

.form-group input,
.form-group select {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  min-width: 150px;
}

.content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.left-panel {
  flex: 0 0 300px;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #ddd;
  overflow: hidden;
}

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 15px 20px;
  background-color: #f9f9f9;
  border-bottom: 1px solid #ddd;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
}

.header-buttons {
  display: flex;
  gap: 10px;
}

.panel-header button {
  padding: 8px 16px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.panel-header button:hover {
  opacity: 0.8;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-group {
  margin-bottom: 20px;
}

.section-header {
  margin-bottom: 8px;
}

.section-header h4 {
  margin: 0;
  font-size: 14px;
  font-weight: bold;
  color: #666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-list {
  list-style: none;
  padding: 0;
  margin: 0;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: hidden;
}

.section-item {
  padding: 10px 12px;
  border-bottom: 1px solid #ddd;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color 0.2s;
}

.section-item:last-child {
  border-bottom: none;
}

.section-item:hover {
  background-color: #f0f0f0;
}

.section-item.active {
  background-color: #2196F3;
  color: white;
}

.section-icon {
  font-size: 16px;
}

.initial-state-item {
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: #f9f9f9;
}

.initial-state-item:hover {
  background-color: #e8e8e8;
}

.initial-state-item.active {
  background-color: #2196F3;
  color: white;
}


.terminal-situation-item {
  background-color: #fff3e0;
  border-left: 4px solid #ff9800;
}

.terminal-situation-item:hover {
  background-color: #ffe0b2;
}

.terminal-situation-item.active {
  background-color: #ff9800;
  color: white;
  border-left-color: #f57c00;
}

.terminal-badge {
  display: inline-block;
  padding: 2px 8px;
  background-color: #ff9800;
  color: white;
  border-radius: 12px;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
}

.terminal-situation-item.active .terminal-badge {
  background-color: rgba(255, 255, 255, 0.3);
}

.add-button {
  background-color: #f5f5f5;
  color: #666;
  font-weight: 500;
  justify-content: center;
  border-top: 2px solid #ddd;
}

.add-button:hover {
  background-color: #4CAF50;
  color: white;
}

.add-icon {
  font-size: 18px;
  font-weight: bold;
  line-height: 1;
}

.no-selection {
  padding: 40px;
  text-align: center;
  color: #999;
}

.validation-errors {
  margin: 15px 0;
  padding: 15px;
  background-color: #ffebee;
  border: 1px solid #f44336;
  border-radius: 4px;
}

.validation-errors h4 {
  margin-top: 0;
  margin-bottom: 10px;
  color: #c62828;
}

.validation-errors ul {
  margin: 0;
  padding-left: 20px;
}

.validation-errors li {
  margin-bottom: 5px;
  color: #c62828;
}
</style>
