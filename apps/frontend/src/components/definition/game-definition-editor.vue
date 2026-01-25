<template>
  <div class="game-definition-editor">
    <div class="header">
      <div class="header-controls">
        <!-- Game ID-->
        <div v-show="false" class="form-group">
          <v-text-field v-model="gameDefinition.gameId" label="Game ID" density="compact" variant="outlined"
            hide-details />
        </div>

        <!-- Name-->
        <div class="form-group">
          <v-text-field v-model="gameDefinition.name" label="名前" placeholder="例:" density="compact" variant="outlined"
            hide-details />
        </div>

        <!-- Root Situation-->
        <div class="form-group">
          <v-select v-model="gameDefinition.rootSituationId" :items="situationItems" item-title="title"
            item-value="value" label="初期状況" density="compact" variant="outlined" hide-details />
        </div>

        <!-- Description-->
        <div class="form-group form-description">
          <v-text-field v-model="gameDefinition.description" label="説明" density="compact" variant="outlined"
            hide-details />
        </div>
      </div>
    </div>

    <div class="content">
      <div class="left-panel">
        <div class="panel-content">
          <!-- 状況(Situation) -->
          <div class="section-group">
            <div class="section-header">
              <h4>状況</h4>
            </div>
            <ul class="section-list">
              <li v-for="situation in gameDefinition.situations" :key="situation.situationId"
                class="section-item situation-item" :class="{ active: selectedSituationId === situation.situationId }"
                @click="selectSituation(situation.situationId)">
                {{ situation.name || '(説明なし)' }}
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

          <!-- プレイヤーコンボ -->
          <div class="section-group">
            <div class="section-header">
              <h4>プレイヤーコンボ</h4>
            </div>
            <ul class="section-list">
              <li v-for="combo in gameDefinition.playerComboStarters" :key="combo.situationId"
                class="section-item player-combo-item" :class="{ active: selectedPlayerComboId === combo.situationId }"
                @click="selectPlayerCombo(combo.situationId)">
                {{ combo.name || '(名前なし)' }}
              </li>
              <li class="section-item add-button" @click="addPlayerCombo">
                <span class="add-icon">+</span>
                追加
              </li>
            </ul>
          </div>

          <!-- 相手コンボ -->
          <div class="section-group">
            <div class="section-header">
              <h4>相手コンボ</h4>
            </div>
            <ul class="section-list">
              <li v-for="combo in gameDefinition.opponentComboStarters" :key="combo.situationId"
                class="section-item opponent-combo-item"
                :class="{ active: selectedOpponentComboId === combo.situationId }"
                @click="selectOpponentCombo(combo.situationId)">
                {{ combo.name || '(名前なし)' }}
              </li>
              <li class="section-item add-button" @click="addOpponentCombo">
                <span class="add-icon">+</span>
                追加
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div class="right-panel">
        <div class="panel-content">
          <SituationEditor v-if="selectedSituation" :model-value="selectedSituation"
            :available-situations="availableSituationsForTransition"
            :available-terminal-situations="gameDefinition.terminalSituations" @update:model-value="updateSituation"
            @delete="deleteSituation" />
          <TerminalSituationEditor v-else-if="selectedTerminalSituation" :model-value="selectedTerminalSituation"
            @update:model-value="updateTerminalSituation" @delete="deleteTerminalSituation" />
          <ComboStarterEditor v-else-if="selectedPlayerCombo" :model-value="selectedPlayerCombo"
            :available-situations="gameDefinition.situations"
            :available-terminal-situations="gameDefinition.terminalSituations" :is-player-combo="true"
            @update:model-value="updatePlayerCombo" @delete="deletePlayerCombo" />
          <ComboStarterEditor v-else-if="selectedOpponentCombo" :model-value="selectedOpponentCombo"
            :available-situations="gameDefinition.situations"
            :available-terminal-situations="gameDefinition.terminalSituations" :is-player-combo="false"
            @update:model-value="updateOpponentCombo" @delete="deleteOpponentCombo" />
          <div v-else class="no-selection">
            <p>編集する要素を選択してください</p>
          </div>
        </div>
      </div>
    </div>

    <v-bottom-sheet v-model="showValidationErrors">
      <v-card class="validation-errors-sheet">
        <v-card-title class="validation-errors-header">
          <v-icon color="error" class="mr-2">
            mdi-alert-circle
          </v-icon>
          バリデーションエラー
          <v-spacer />
          <v-btn icon variant="text" @click="closeValidationErrors">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="validation-errors-content">
          <v-list density="compact">
            <v-list-item v-for="(error, index) in validationErrors" :key="index" class="validation-error-item">
              <template #prepend>
                <v-icon color="error" size="small">
                  mdi-alert
                </v-icon>
              </template>
              <v-list-item-title class="error-field">
                {{ error.field }}
              </v-list-item-title>
              <v-list-item-subtitle class="error-message">
                {{ error.message }}
              </v-list-item-subtitle>
            </v-list-item>
          </v-list>
        </v-card-text>
      </v-card>
    </v-bottom-sheet>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { storeToRefs } from 'pinia';
import type {
  Situation,
  TerminalSituation,
  ComboStarter,
} from '@nomari/ts-proto';
import {
  createEmptySituation,
  createEmptyTerminalSituation,
  createEmptyComboStarter,
} from '@/utils/game-definition-utils';
import SituationEditor from './situation-editor.vue';
import TerminalSituationEditor from './terminal-situation-editor.vue';
import ComboStarterEditor from './combo-starter-editor.vue';
import { useDefinitionStore } from '@/stores/definition-store';

const definitionStore = useDefinitionStore();
const { gameDefinition, validationErrors, showValidationErrors } = storeToRefs(definitionStore);
const { closeValidationErrors } = definitionStore;

type SelectionType = 'situation' | 'terminal-situation' | 'player-combo' | 'opponent-combo' | null;
const selectedItemType = ref<SelectionType>(null);
const selectedSituationId = ref<number | null>(null);
const selectedTerminalSituationId = ref<number | null>(null);
const selectedPlayerComboId = ref<number | null>(null);
const selectedOpponentComboId = ref<number | null>(null);

const situationItems = computed(() => {
  return [
    { title: '選択してください', value: 0 },
    ...gameDefinition.value.situations.map((s) => ({
      title: s.name || '(説明なし)',
      value: s.situationId,
    })),
  ];
});

const selectedSituation = computed(() => {
  if (!selectedSituationId.value) { return null; }
  return (
    gameDefinition.value.situations.find(
      (s) => s.situationId === selectedSituationId.value
    ) || null
  );
});

const selectedTerminalSituation = computed(() => {
  if (!selectedTerminalSituationId.value) { return null; }
  return (
    gameDefinition.value.terminalSituations.find(
      (t) => t.situationId === selectedTerminalSituationId.value
    ) || null
  );
});

const selectedPlayerCombo = computed(() => {
  if (!selectedPlayerComboId.value) { return null; }
  return (
    gameDefinition.value.playerComboStarters.find(
      (c) => c.situationId === selectedPlayerComboId.value
    ) || null
  );
});

const selectedOpponentCombo = computed(() => {
  if (!selectedOpponentComboId.value) { return null; }
  return (
    gameDefinition.value.opponentComboStarters.find(
      (c) => c.situationId === selectedOpponentComboId.value
    ) || null
  );
});

// Available situations for transition includes situations and combo starters
const availableSituationsForTransition = computed(() => {
  const situations = [...gameDefinition.value.situations];
  // Add combo starters as virtual situations (they share the same ID space)
  for (const combo of gameDefinition.value.playerComboStarters) {
    situations.push({
      situationId: combo.situationId,
      name: `[コンボ] ${combo.name || '(名前なし)'}`,
      playerActions: { actions: [] },
      opponentActions: { actions: [] },
      transitions: [],
    });
  }
  for (const combo of gameDefinition.value.opponentComboStarters) {
    situations.push({
      situationId: combo.situationId,
      name: `[相手コンボ] ${combo.name || '(名前なし)'}`,
      playerActions: { actions: [] },
      opponentActions: { actions: [] },
      transitions: [],
    });
  }
  return situations;
});

function clearSelection() {
  selectedSituationId.value = null;
  selectedTerminalSituationId.value = null;
  selectedPlayerComboId.value = null;
  selectedOpponentComboId.value = null;
}

function selectSituation(situationId: number) {
  clearSelection();
  selectedItemType.value = 'situation';
  selectedSituationId.value = situationId;
}

function selectTerminalSituation(terminalSituationId: number) {
  clearSelection();
  selectedItemType.value = 'terminal-situation';
  selectedTerminalSituationId.value = terminalSituationId;
}

function selectPlayerCombo(comboId: number) {
  clearSelection();
  selectedItemType.value = 'player-combo';
  selectedPlayerComboId.value = comboId;
}

function selectOpponentCombo(comboId: number) {
  clearSelection();
  selectedItemType.value = 'opponent-combo';
  selectedOpponentComboId.value = comboId;
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
  if (!selectedSituationId.value) { return; }

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
        gameDefinition.value.rootSituationId = 0;
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
  if (!selectedTerminalSituationId.value) { return; }

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
        gameDefinition.value.rootSituationId = 0;
      }
    }

    // Select next terminal situation
    if (gameDefinition.value.terminalSituations.length > 0) {
      selectTerminalSituation(gameDefinition.value.terminalSituations[0].situationId);
    } else if (gameDefinition.value.situations.length > 0) {
      selectSituation(gameDefinition.value.situations[0].situationId);
    } else {
      clearSelection();
      selectedItemType.value = null;
    }
  }
}

// Player Combo functions
function addPlayerCombo() {
  const newCombo = createEmptyComboStarter();
  gameDefinition.value.playerComboStarters.push(newCombo);
  selectPlayerCombo(newCombo.situationId);
}

function updatePlayerCombo(updatedCombo: ComboStarter) {
  const index = gameDefinition.value.playerComboStarters.findIndex(
    (c) => c.situationId === updatedCombo.situationId
  );
  if (index !== -1) {
    gameDefinition.value.playerComboStarters.splice(index, 1, updatedCombo);
  }
}

function deletePlayerCombo() {
  if (!selectedPlayerComboId.value) { return; }

  const comboId = selectedPlayerComboId.value;
  const index = gameDefinition.value.playerComboStarters.findIndex(
    (c) => c.situationId === comboId
  );
  if (index !== -1) {
    gameDefinition.value.playerComboStarters.splice(index, 1);

    // Remove references from transitions
    for (const situation of gameDefinition.value.situations) {
      situation.transitions = situation.transitions.filter(
        (t) => t.nextSituationId !== comboId
      );
    }

    // Select next item
    if (gameDefinition.value.playerComboStarters.length > 0) {
      selectPlayerCombo(gameDefinition.value.playerComboStarters[0].situationId);
    } else if (gameDefinition.value.situations.length > 0) {
      selectSituation(gameDefinition.value.situations[0].situationId);
    } else {
      clearSelection();
      selectedItemType.value = null;
    }
  }
}

// Opponent Combo functions
function addOpponentCombo() {
  const newCombo = createEmptyComboStarter();
  gameDefinition.value.opponentComboStarters.push(newCombo);
  selectOpponentCombo(newCombo.situationId);
}

function updateOpponentCombo(updatedCombo: ComboStarter) {
  const index = gameDefinition.value.opponentComboStarters.findIndex(
    (c) => c.situationId === updatedCombo.situationId
  );
  if (index !== -1) {
    gameDefinition.value.opponentComboStarters.splice(index, 1, updatedCombo);
  }
}

function deleteOpponentCombo() {
  if (!selectedOpponentComboId.value) { return; }

  const comboId = selectedOpponentComboId.value;
  const index = gameDefinition.value.opponentComboStarters.findIndex(
    (c) => c.situationId === comboId
  );
  if (index !== -1) {
    gameDefinition.value.opponentComboStarters.splice(index, 1);

    // Remove references from transitions
    for (const situation of gameDefinition.value.situations) {
      situation.transitions = situation.transitions.filter(
        (t) => t.nextSituationId !== comboId
      );
    }

    // Select next item
    if (gameDefinition.value.opponentComboStarters.length > 0) {
      selectOpponentCombo(gameDefinition.value.opponentComboStarters[0].situationId);
    } else if (gameDefinition.value.situations.length > 0) {
      selectSituation(gameDefinition.value.situations[0].situationId);
    } else {
      clearSelection();
      selectedItemType.value = null;
    }
  }
}
</script>

<style scoped>
.game-definition-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header {
  padding: 20px;
  background-color: var(--bg-quaternary);
  border-bottom: 1px solid var(--border-primary);
}

.header h2 {
  margin: 0 0 15px 0;
}

.header-controls {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.header-controls .form-group {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 200px;
}

.header-controls .form-group.form-description {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: auto;
}

.header-controls .form-group .v-text-field,
.header-controls .form-group .v-select {
  flex: 1;
  min-width: 200px;
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
  border: 1px solid var(--border-input);
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
  border-right: 1px solid var(--border-primary);
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
  background-color: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-primary);
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
  background-color: var(--color-primary);
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
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.section-list {
  list-style: none;
  padding: 0;
  margin: 0;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  overflow: hidden;
}

.section-item {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-primary);
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
  background-color: var(--bg-hover);
}

.section-item.active {
  background-color: var(--color-accent-orange);
  color: white;
}

.section-icon {
  font-size: 16px;
}

.initial-state-item {
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background-color: var(--bg-tertiary);
}

.initial-state-item:hover {
  background-color: var(--bg-hover);
}

.initial-state-item.active {
  background-color: var(--color-accent-blue);
  color: white;
}


.terminal-situation-item {
  background-color: var(--bg-warning);
  border-left: 4px solid var(--color-warning);
}

.terminal-situation-item:hover {
  background-color: var(--bg-hover);
}

.terminal-situation-item.active {
  background-color: var(--color-warning);
  color: white;
  border-left-color: var(--color-warning);
}

.terminal-badge {
  display: inline-block;
  padding: 2px 8px;
  background-color: var(--color-warning);
  color: white;
  border-radius: 12px;
  font-size: 11px;
  font-weight: bold;
  text-transform: uppercase;
}

.terminal-situation-item.active .terminal-badge {
  background-color: rgba(255, 255, 255, 0.3);
}

.player-combo-item {
  background-color: var(--bg-success);
  border-left: 4px solid var(--color-success);
}

.player-combo-item:hover {
  background-color: var(--bg-hover);
}

.player-combo-item.active {
  background-color: var(--color-success);
  color: white;
  border-left-color: var(--color-success);
}

.opponent-combo-item {
  background-color: var(--bg-error);
  border-left: 4px solid var(--color-error);
}

.opponent-combo-item:hover {
  background-color: var(--bg-hover);
}

.opponent-combo-item.active {
  background-color: var(--color-error);
  color: white;
  border-left-color: var(--color-error);
}

.add-button {
  background-color: var(--bg-quaternary);
  color: var(--text-secondary);
  font-weight: 500;
  justify-content: center;
  border-top: 2px solid var(--border-primary);
}

.add-button:hover {
  background-color: var(--color-primary);
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
  color: var(--text-tertiary);
}

.validation-errors-sheet {
  max-height: 50vh;
  display: flex;
  flex-direction: column;
}

.validation-errors-header {
  display: flex;
  align-items: center;
  background-color: var(--bg-error);
  color: var(--color-error-dark);
  padding: 12px 16px;
  font-weight: 500;
  border-bottom: 1px solid var(--color-error);
}

.validation-errors-content {
  overflow-y: auto;
  padding: 8px 0;
}

.validation-error-item {
  border-bottom: 1px solid var(--border-primary);
}

.validation-error-item:last-child {
  border-bottom: none;
}

.error-field {
  font-weight: 600;
  color: var(--color-error-dark);
}

.error-message {
  color: var(--text-secondary);
}
</style>
