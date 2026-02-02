<template>
  <div class="scenario-editor">
    <div class="content">
      <div
        v-show="!isMobile || mobileSubView === 'list'"
        class="left-panel"
        :class="{ 'mobile-full-height': isMobile }"
      >
        <div class="panel-content">
          <!-- Scenario Settings Button -->
          <button
            class="scenario-settings-button"
            :class="{ active: isScenarioSettingsSelected }"
            @click="selectScenarioSettings"
          >
            <v-icon size="18">
              mdi-cog
            </v-icon>
            <span>シナリオ設定</span>
          </button>

          <!-- Situations -->
          <div class="section-group">
            <div class="section-header">
              <h4>状況</h4>
            </div>
            <ul class="section-list">
              <li
                v-for="situation in scenario.situations"
                :key="situation.situationId"
                class="section-item situation-item"
                :class="{
                  active: selectedSituationId === situation.situationId,
                  'is-root': scenario.rootSituationId === situation.situationId
                }"
                @click="selectSituation(situation.situationId)"
              >
                <span
                  v-if="scenario.rootSituationId === situation.situationId"
                  class="root-badge"
                  title="初期状況"
                >★</span>
                <span class="item-name">{{ situation.name || '(説明なし)' }}</span>
                <CircleDeleteButton
                  class="delete-item-btn"
                  @click="confirmDeleteSituation(situation)"
                />
              </li>
              <li
                class="section-item add-button"
                @click="addSituation"
              >
                <span class="add-icon">+</span>
                追加
              </li>
            </ul>
          </div>

          <!-- Terminal Situations -->
          <div class="section-group">
            <div class="section-header">
              <h4>終点状況</h4>
            </div>
            <ul class="section-list">
              <li
                v-for="terminal in scenario.terminalSituations"
                :key="terminal.situationId"
                class="section-item terminal-situation-item"
                :class="{ active: selectedTerminalSituationId === terminal.situationId }"
                @click="selectTerminalSituation(terminal.situationId)"
              >
                <span class="item-name">{{ terminal.name || '(名前なし)' }}</span>
                <CircleDeleteButton
                  class="delete-item-btn"
                  @click="confirmDeleteTerminalSituation(terminal)"
                />
              </li>
              <li
                class="section-item add-button"
                @click="addTerminalSituation"
              >
                <span class="add-icon">+</span>
                追加
              </li>
            </ul>
          </div>

          <!-- Action Library (Combo Starters) -->
          <div class="section-group">
            <div class="section-header">
              <h4>始動技</h4>
            </div>
            <div class="action-library-tabs">
              <button
                class="action-library-tab player-tab"
                :class="{ active: selectedActionLibraryTarget === 'player' }"
                @click="selectActionLibrary('player')"
              >
                プレイヤー
              </button>
              <button
                class="action-library-tab opponent-tab"
                :class="{ active: selectedActionLibraryTarget === 'opponent' }"
                @click="selectActionLibrary('opponent')"
              >
                相手
              </button>
            </div>
          </div>

          <!-- Player Combos -->
          <div class="section-group">
            <div class="section-header player-combo-header">
              <h4>プレイヤーコンボ</h4>
            </div>
            <ul class="section-list">
              <li
                v-for="combo in scenario.player?.comboStarters || []"
                :key="combo.situationId"
                class="section-item player-combo-item"
                :class="{ active: selectedPlayerComboId === combo.situationId }"
                @click="selectPlayerCombo(combo.situationId)"
              >
                <span class="item-name">{{ combo.name || '(名前なし)' }}</span>
                <CircleDeleteButton
                  class="delete-item-btn"
                  @click="confirmDeletePlayerCombo(combo)"
                />
              </li>
              <li
                class="section-item add-button"
                @click="addPlayerCombo"
              >
                <span class="add-icon">+</span>
                追加
              </li>
            </ul>
          </div>

          <!-- Opponent Combos -->
          <div class="section-group">
            <div class="section-header opponent-combo-header">
              <h4>相手コンボ</h4>
            </div>
            <ul class="section-list">
              <li
                v-for="combo in scenario.opponent?.comboStarters || []"
                :key="combo.situationId"
                class="section-item opponent-combo-item"
                :class="{ active: selectedOpponentComboId === combo.situationId }"
                @click="selectOpponentCombo(combo.situationId)"
              >
                <span class="item-name">{{ combo.name || '(名前なし)' }}</span>
                <CircleDeleteButton
                  class="delete-item-btn"
                  @click="confirmDeleteOpponentCombo(combo)"
                />
              </li>
              <li
                class="section-item add-button"
                @click="addOpponentCombo"
              >
                <span class="add-icon">+</span>
                追加
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div
        v-show="!isMobile || mobileSubView === 'detail'"
        class="right-panel"
        :class="{ 'mobile-full-height': isMobile }"
      >
        <div class="panel-content">
          <SingleActionLibraryEditor
            v-if="selectedActionLibraryTarget === 'player' && scenario.player"
            v-model="scenario.player"
            target="player"
          />
          <SingleActionLibraryEditor
            v-else-if="selectedActionLibraryTarget === 'opponent' && scenario.opponent"
            v-model="scenario.opponent"
            target="opponent"
          />
          <ScenarioSettingsEditor
            v-else-if="isScenarioSettingsSelected"
            v-model="scenario"
          />
          <SituationEditor
            v-else-if="selectedSituation"
            :model-value="selectedSituation"
            :available-situations="scenario.situations"
            :available-terminal-situations="scenario.terminalSituations"
            :player-combo-starters="scenario.player?.comboStarters || []"
            :opponent-combo-starters="scenario.opponent?.comboStarters || []"
            :player-actions="scenario.player?.actions || []"
            :opponent-actions="scenario.opponent?.actions || []"
            @update:model-value="updateSituation"
          />
          <TerminalSituationEditor
            v-else-if="selectedTerminalSituation"
            :model-value="selectedTerminalSituation"
            @update:model-value="updateTerminalSituation"
          />
          <ComboStarterEditor
            v-else-if="selectedPlayerCombo"
            :model-value="selectedPlayerCombo"
            :available-situations="scenario.situations"
            :available-terminal-situations="scenario.terminalSituations"
            :available-actions="scenario.player?.actions || []"
            :is-player-combo="true"
            @update:model-value="updatePlayerCombo"
          />
          <ComboStarterEditor
            v-else-if="selectedOpponentCombo"
            :model-value="selectedOpponentCombo"
            :available-situations="scenario.situations"
            :available-terminal-situations="scenario.terminalSituations"
            :available-actions="scenario.opponent?.actions || []"
            :is-player-combo="false"
            @update:model-value="updateOpponentCombo"
          />
          <div
            v-else
            class="no-selection"
          >
            <p>編集する要素を選択してください</p>
          </div>
        </div>
      </div>
    </div>

    <v-dialog
      v-model="showDeleteDialog"
      max-width="400"
    >
      <v-card>
        <v-card-title>削除の確認</v-card-title>
        <v-card-text>
          「{{ deleteTarget?.name || '' }}」を削除しますか？
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn
            variant="text"
            @click="showDeleteDialog = false"
          >
            キャンセル
          </v-btn>
          <v-btn
            color="error"
            variant="flat"
            @click="executeDelete"
          >
            削除
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-bottom-sheet v-model="showValidationErrors">
      <v-card class="validation-errors-sheet">
        <v-card-title class="validation-errors-header">
          <v-icon
            color="warning"
            class="mr-2"
          >
            mdi-alert-circle
          </v-icon>
          バリデーションエラー
          <v-spacer />
          <v-btn
            icon
            variant="text"
            @click="closeValidationErrors"
          >
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="validation-errors-content">
          <v-list density="compact">
            <v-list-item
              v-for="(error, index) in validationErrors"
              :key="index"
              class="validation-error-item"
            >
              <template #prepend>
                <v-icon
                  color="warning"
                  size="small"
                >
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
import { useViewStore } from '@/stores/view-store';
import type {
    Situation,
    TerminalSituation,
    ComboStarter,
} from '@nomari/ts-proto';
import {
    createEmptySituation,
    createEmptyTerminalSituation,
    createEmptyComboStarter,
    getSituationType,
} from '@/utils/scenario-utils';
import SituationEditor from './situation-editor.vue';
import TerminalSituationEditor from './terminal-situation-editor.vue';
import ComboStarterEditor from './combo-starter-editor.vue';
import ScenarioSettingsEditor from './scenario-settings-editor.vue';
import SingleActionLibraryEditor from './single-action-library-editor.vue';
import CircleDeleteButton from '@/components/common/circle-delete-button.vue';
import { useScenarioStore } from '@/stores/scenario-store';

// Props for mobile support
const props = defineProps<{
    isMobile?: boolean;
    mobileSubView?: 'list' | 'detail';
}>();

const emit = defineEmits<{
    (e: 'update:mobileSubView', value: 'list' | 'detail'): void;
}>();

const scenarioStore = useScenarioStore();
const { scenario, validationErrors, showValidationErrors } = storeToRefs(scenarioStore);
const { closeValidationErrors } = scenarioStore;

const viewStore = useViewStore();
const { editSelection } = storeToRefs(viewStore);

// Computed selection state derived from store
const isScenarioSettingsSelected = computed(() => editSelection.value.type === 'scenario');

const selectedSituationId = computed(() => {
    if (editSelection.value.type !== 'situation') {
        return null;
    }
    const id = editSelection.value.situationId;
    const type = getSituationType(scenario.value, id);
    return type === 'situation' ? id : null;
});

const selectedTerminalSituationId = computed(() => {
    if (editSelection.value.type !== 'situation') {
        return null;
    }
    const id = editSelection.value.situationId;
    const type = getSituationType(scenario.value, id);
    return type === 'terminal' ? id : null;
});

const selectedPlayerComboId = computed(() => {
    if (editSelection.value.type !== 'situation') {
        return null;
    }
    const id = editSelection.value.situationId;
    const type = getSituationType(scenario.value, id);
    return type === 'playerCombo' ? id : null;
});

const selectedOpponentComboId = computed(() => {
    if (editSelection.value.type !== 'situation') {
        return null;
    }
    const id = editSelection.value.situationId;
    const type = getSituationType(scenario.value, id);
    return type === 'opponentCombo' ? id : null;
});

const playerComboStarters = computed(() => scenario.value.player?.comboStarters || []);
const opponentComboStarters = computed(() => scenario.value.opponent?.comboStarters || []);

// Action library selection derived from route
const selectedActionLibraryTarget = computed(() =>
    editSelection.value.type === 'actions' ? editSelection.value.target : null
);

// Delete confirmation dialog state
const showDeleteDialog = ref(false);
const deleteTarget = ref<{
    name: string;
    onConfirm: () => void;
} | null>(null);

const selectedSituation = computed(() => {
    if (!selectedSituationId.value) {
        return null;
    }
    return (
        scenario.value.situations.find(
            (s) => s.situationId === selectedSituationId.value
        ) || null
    );
});

const selectedTerminalSituation = computed(() => {
    if (!selectedTerminalSituationId.value) {
        return null;
    }
    return (
        scenario.value.terminalSituations.find(
            (t) => t.situationId === selectedTerminalSituationId.value
        ) || null
    );
});

const selectedPlayerCombo = computed(() => {
    if (!selectedPlayerComboId.value) {
        return null;
    }
    return (
        playerComboStarters.value.find(
            (c) => c.situationId === selectedPlayerComboId.value
        ) || null
    );
});

const selectedOpponentCombo = computed(() => {
    if (!selectedOpponentComboId.value) {
        return null;
    }
    return (
        opponentComboStarters.value.find(
            (c) => c.situationId === selectedOpponentComboId.value
        ) || null
    );
});

function switchToDetailIfMobile() {
    if (props.isMobile) {
        emit('update:mobileSubView', 'detail');
    }
}

function selectScenarioSettings() {
    viewStore.selectScenarioSettings();
    switchToDetailIfMobile();
}

function selectActionLibrary(target: 'player' | 'opponent') {
    viewStore.selectActionLibrary(target);
    switchToDetailIfMobile();
}

function selectSituation(situationId: number) {
    viewStore.selectEditSituation(situationId);
    switchToDetailIfMobile();
}

function selectTerminalSituation(terminalSituationId: number) {
    viewStore.selectEditSituation(terminalSituationId);
    switchToDetailIfMobile();
}

function selectPlayerCombo(comboId: number) {
    viewStore.selectEditSituation(comboId);
    switchToDetailIfMobile();
}

function selectOpponentCombo(comboId: number) {
    viewStore.selectEditSituation(comboId);
    switchToDetailIfMobile();
}

function addSituation() {
    const newSituation = createEmptySituation();
    scenario.value.situations.push(newSituation);
    selectSituation(newSituation.situationId);
}

function updateSituation(updatedSituation: Situation) {
    const index = scenario.value.situations.findIndex(
        (s) => s.situationId === updatedSituation.situationId
    );
    if (index !== -1) {
        scenario.value.situations.splice(index, 1, updatedSituation);
    }
}

function deleteSituation(targetSituationId: number) {
    const situationId = targetSituationId;
    const index = scenario.value.situations.findIndex((s) => s.situationId === situationId);
    if (index !== -1) {
        scenario.value.situations.splice(index, 1);

        // Remove references from transitions
        for (const situation of scenario.value.situations) {
            situation.transitions = situation.transitions.filter(
                (t) => t.nextSituationId !== situationId
            );
        }

        // Update rootSituationId if it was deleted
        if (scenario.value.rootSituationId === situationId) {
            if (scenario.value.situations.length > 0) {
                scenario.value.rootSituationId = scenario.value.situations[0].situationId;
            } else if (scenario.value.terminalSituations.length > 0) {
                scenario.value.rootSituationId =
                    scenario.value.terminalSituations[0].situationId;
            } else {
                scenario.value.rootSituationId = 0;
            }
        }

        // Select next situation
        if (scenario.value.situations.length > 0) {
            selectSituation(scenario.value.situations[0].situationId);
        } else if (scenario.value.terminalSituations.length > 0) {
            selectTerminalSituation(scenario.value.terminalSituations[0].situationId);
        } else {
            selectScenarioSettings();
        }
    }
}

function addTerminalSituation() {
    const newTerminalSituation = createEmptyTerminalSituation();
    scenario.value.terminalSituations.push(newTerminalSituation);
    selectTerminalSituation(newTerminalSituation.situationId);
}

function updateTerminalSituation(updatedTerminalSituation: TerminalSituation) {
    const index = scenario.value.terminalSituations.findIndex(
        (t) => t.situationId === updatedTerminalSituation.situationId
    );
    if (index !== -1) {
        scenario.value.terminalSituations.splice(index, 1, updatedTerminalSituation);
    }
}

function deleteTerminalSituation(targetTerminalSituationId: number) {
    const terminalSituationId = targetTerminalSituationId;
    const index = scenario.value.terminalSituations.findIndex(
        (t) => t.situationId === terminalSituationId
    );
    if (index !== -1) {
        scenario.value.terminalSituations.splice(index, 1);

        // Remove references from transitions
        for (const situation of scenario.value.situations) {
            situation.transitions = situation.transitions.filter(
                (t) => t.nextSituationId !== terminalSituationId
            );
        }

        // Update rootSituationId if it was deleted
        if (scenario.value.rootSituationId === terminalSituationId) {
            if (scenario.value.situations.length > 0) {
                scenario.value.rootSituationId = scenario.value.situations[0].situationId;
            } else if (scenario.value.terminalSituations.length > 0) {
                scenario.value.rootSituationId =
                    scenario.value.terminalSituations[0].situationId;
            } else {
                scenario.value.rootSituationId = 0;
            }
        }

        // Select next terminal situation
        if (scenario.value.terminalSituations.length > 0) {
            selectTerminalSituation(scenario.value.terminalSituations[0].situationId);
        } else if (scenario.value.situations.length > 0) {
            selectSituation(scenario.value.situations[0].situationId);
        } else {
            selectScenarioSettings();
        }
    }
}

// Player Combo functions
function addPlayerCombo() {
    if (!scenario.value.player) {
        return;
    }
    const newCombo = createEmptyComboStarter();
    scenario.value.player.comboStarters.push(newCombo);
    selectPlayerCombo(newCombo.situationId);
}

function updatePlayerCombo(updatedCombo: ComboStarter) {
    if (!scenario.value.player) {
        return;
    }
    const index = scenario.value.player.comboStarters.findIndex(
        (c) => c.situationId === updatedCombo.situationId
    );
    if (index !== -1) {
        scenario.value.player.comboStarters.splice(index, 1, updatedCombo);
    }
}

function deletePlayerCombo(targetComboId: number) {
    if (!scenario.value.player) {
        return;
    }

    const comboId = targetComboId;
    const index = scenario.value.player.comboStarters.findIndex(
        (c) => c.situationId === comboId
    );
    if (index !== -1) {
        scenario.value.player.comboStarters.splice(index, 1);

        // Remove references from transitions
        for (const situation of scenario.value.situations) {
            situation.transitions = situation.transitions.filter(
                (t) => t.nextSituationId !== comboId
            );
        }

        // Select next item
        if (playerComboStarters.value.length > 0) {
            selectPlayerCombo(playerComboStarters.value[0].situationId);
        } else if (scenario.value.situations.length > 0) {
            selectSituation(scenario.value.situations[0].situationId);
        } else {
            selectScenarioSettings();
        }
    }
}

// Opponent Combo functions
function addOpponentCombo() {
    if (!scenario.value.opponent) {
        return;
    }
    const newCombo = createEmptyComboStarter();
    scenario.value.opponent.comboStarters.push(newCombo);
    selectOpponentCombo(newCombo.situationId);
}

function updateOpponentCombo(updatedCombo: ComboStarter) {
    if (!scenario.value.opponent) {
        return;
    }
    const index = scenario.value.opponent.comboStarters.findIndex(
        (c) => c.situationId === updatedCombo.situationId
    );
    if (index !== -1) {
        scenario.value.opponent.comboStarters.splice(index, 1, updatedCombo);
    }
}

function deleteOpponentCombo(targetComboId: number) {
    if (!scenario.value.opponent) {
        return;
    }

    const comboId = targetComboId;
    const index = scenario.value.opponent.comboStarters.findIndex(
        (c) => c.situationId === comboId
    );
    if (index !== -1) {
        scenario.value.opponent.comboStarters.splice(index, 1);

        // Remove references from transitions
        for (const situation of scenario.value.situations) {
            situation.transitions = situation.transitions.filter(
                (t) => t.nextSituationId !== comboId
            );
        }

        // Select next item
        if (opponentComboStarters.value.length > 0) {
            selectOpponentCombo(opponentComboStarters.value[0].situationId);
        } else if (scenario.value.situations.length > 0) {
            selectSituation(scenario.value.situations[0].situationId);
        } else {
            selectScenarioSettings();
        }
    }
}

// Delete confirmation functions
function confirmDeleteSituation(situation: Situation) {
    deleteTarget.value = {
        name: situation.name || '(説明なし)',
        onConfirm: () => {
            deleteSituation(situation.situationId);
        },
    };
    showDeleteDialog.value = true;
}

function confirmDeleteTerminalSituation(terminal: TerminalSituation) {
    deleteTarget.value = {
        name: terminal.name || '(名前なし)',
        onConfirm: () => {
            deleteTerminalSituation(terminal.situationId);
        },
    };
    showDeleteDialog.value = true;
}

function confirmDeletePlayerCombo(combo: ComboStarter) {
    deleteTarget.value = {
        name: combo.name || '(名前なし)',
        onConfirm: () => {
            deletePlayerCombo(combo.situationId);
        },
    };
    showDeleteDialog.value = true;
}

function confirmDeleteOpponentCombo(combo: ComboStarter) {
    deleteTarget.value = {
        name: combo.name || '(名前なし)',
        onConfirm: () => {
            deleteOpponentCombo(combo.situationId);
        },
    };
    showDeleteDialog.value = true;
}

function executeDelete() {
    if (!deleteTarget.value) {
        return;
    }

    deleteTarget.value.onConfirm();
    showDeleteDialog.value = false;
    deleteTarget.value = null;
}
</script>

<style scoped>
/* ═══════════════════════════════════════════════════════════════════
   GAME DEFINITION EDITOR - Roman Arena Style
   ═══════════════════════════════════════════════════════════════════ */

.scenario-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  font-family: var(--font-family-ui);
  background-color: var(--bg-primary);
}

/* ───────────────────────────────────────────────────────────────────
   CONTENT LAYOUT
   ─────────────────────────────────────────────────────────────────── */

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
  background-color: var(--bg-primary);
}

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: var(--bg-primary);
}

.panel-header {
  padding: 12px 16px;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-header h3 {
  margin: 0;
  color: var(--text-primary);
  font-family: var(--font-family-display);
}

.header-buttons {
  display: flex;
  gap: 8px;
}

.panel-header button {
  padding: 8px 16px;
  background-color: var(--color-header);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all var(--transition-fast);
}

.panel-header button:hover {
  background-color: var(--color-header-hover);
  transform: translateY(-1px);
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ───────────────────────────────────────────────────────────────────
   SCENARIO SETTINGS BUTTON
   ─────────────────────────────────────────────────────────────────── */

.scenario-settings-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.scenario-settings-button:hover {
  background-color: var(--bg-hover);
  border-color: var(--color-primary);
}

.scenario-settings-button.active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

/* ───────────────────────────────────────────────────────────────────
   SECTION GROUPS - Arena Categories
   ─────────────────────────────────────────────────────────────────── */

.section-group {
  margin-bottom: 16px;
}

.section-header {
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-secondary);
}

.section-header h4 {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 1px;
}

.player-combo-header {
  border-color: var(--player-combo);
}

.player-combo-header h4 {
  color: var(--player-color);
}

.opponent-combo-header {
  border-color: var(--opponent-combo);
}

.opponent-combo-header h4 {
  color: var(--opponent-color);
}

/* ───────────────────────────────────────────────────────────────────
   ACTION LIBRARY TABS
   ─────────────────────────────────────────────────────────────────── */

.action-library-tabs {
  display: flex;
  gap: 8px;
}

.action-library-tab {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  background-color: var(--bg-elevated);
  color: var(--text-secondary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.action-library-tab:hover {
  background-color: var(--bg-hover);
}

.action-library-tab.player-tab.active {
  background-color: var(--player-color);
  border-color: var(--player-color);
  color: white;
}

.action-library-tab.opponent-tab.active {
  background-color: var(--opponent-color);
  border-color: var(--opponent-color);
  color: white;
}

/* ───────────────────────────────────────────────────────────────────
   SECTION LIST - Battle Roster
   ─────────────────────────────────────────────────────────────────── */

.section-list {
  list-style: none;
  padding: 0;
  margin: 0;
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  overflow: hidden;
  background-color: var(--bg-elevated);
  box-shadow: var(--shadow-sm);
}

.section-item {
  padding: 10px 12px;
  border-bottom: 1px solid var(--border-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: background-color var(--transition-fast);
  font-size: 13px;
  color: var(--text-primary);
}

.section-item:last-child {
  border-bottom: none;
}

.section-item:hover {
  background-color: var(--bg-hover);
}

.item-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

/* Delete button visibility */
.delete-item-btn {
  opacity: 0;
  transition: opacity var(--transition-fast);
}

.section-item:hover .delete-item-btn {
  opacity: 1;
}

.section-item.active .delete-item-btn {
  opacity: 1;
}

.section-item.active .delete-item-btn {
  --btn-color: rgba(255, 255, 255, 0.7);
}

.section-item.active .delete-item-btn:hover {
  --btn-color: white;
}

.section-item.active .delete-item-btn:hover :deep(.circle-delete-btn) {
  background-color: rgba(255, 255, 255, 0.2);
}

.section-icon {
  font-size: 16px;
}

.initial-state-item {
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-md);
  background-color: var(--bg-secondary);
}

.initial-state-item:hover {
  background-color: var(--bg-hover);
}

.initial-state-item.active {
  background-color: var(--color-accent-blue);
  color: white;
}

/* ───────────────────────────────────────────────────────────────────
   SITUATION ITEMS - Imperial Blue
   ─────────────────────────────────────────────────────────────────── */

.situation-item {
  background-color: var(--situation-bg);
  border-left: 3px solid var(--situation);
}

.situation-item:hover {
  background-color: var(--bg-hover);
}

.situation-item.active {
  background-color: var(--situation);
  color: white;
  border-left-color: var(--color-gold);
}

.situation-item.is-root {
  font-weight: 600;
}

/* Gold star for root badge - Marisa accent */
.root-badge {
  color: var(--color-gold);
  margin-right: 4px;
  font-size: 14px;
}

.situation-item.active .root-badge {
  color: var(--color-gold-light);
}

/* ───────────────────────────────────────────────────────────────────
   TERMINAL ITEMS - Victory Bronze
   ─────────────────────────────────────────────────────────────────── */

.terminal-situation-item {
  background-color: var(--terminal-bg);
  border-left: 3px solid var(--terminal);
}

.terminal-situation-item:hover {
  background-color: var(--bg-hover);
}

.terminal-situation-item.active {
  background-color: var(--terminal);
  color: white;
  border-left-color: var(--color-gold);
}

.terminal-badge {
  display: inline-block;
  padding: 2px 8px;
  background-color: var(--terminal);
  color: white;
  border-radius: 12px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.terminal-situation-item.active .terminal-badge {
  background-color: rgba(255, 255, 255, 0.25);
}

/* ───────────────────────────────────────────────────────────────────
   PLAYER COMBO ITEMS - Triumphant Green
   ─────────────────────────────────────────────────────────────────── */

.player-combo-item {
  background-color: var(--player-combo-bg);
  border-left: 3px solid var(--player-combo);
}

.player-combo-item:hover {
  background-color: var(--bg-hover);
}

.player-combo-item.active {
  background-color: var(--player-combo);
  color: white;
  border-left-color: var(--color-gold);
}

/* ───────────────────────────────────────────────────────────────────
   OPPONENT COMBO ITEMS - Challenger Red
   ─────────────────────────────────────────────────────────────────── */

.opponent-combo-item {
  background-color: var(--opponent-combo-bg);
  border-left: 3px solid var(--opponent-combo);
}

.opponent-combo-item:hover {
  background-color: var(--bg-hover);
}

.opponent-combo-item.active {
  background-color: var(--opponent-combo);
  color: white;
  border-left-color: var(--color-gold);
}

/* ───────────────────────────────────────────────────────────────────
   ADD BUTTON
   ─────────────────────────────────────────────────────────────────── */

.add-button {
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  font-weight: 500;
  justify-content: center;
  border-left: 3px solid transparent;
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.add-button:hover {
  background-color: var(--color-primary);
  color: white;
}

.add-icon {
  font-size: 16px;
  font-weight: 600;
  line-height: 1;
  margin-right: 4px;
}

/* ───────────────────────────────────────────────────────────────────
   NO SELECTION STATE
   ─────────────────────────────────────────────────────────────────── */

.no-selection {
  padding: 40px;
  text-align: center;
  color: var(--text-tertiary);
}

.no-selection p {
  font-size: 13px;
}

/* ───────────────────────────────────────────────────────────────────
   VALIDATION ERRORS
   ─────────────────────────────────────────────────────────────────── */

.validation-errors-sheet {
  max-height: 50vh;
  display: flex;
  flex-direction: column;
}

.validation-errors-header {
  display: flex;
  align-items: center;
  background-color: var(--bg-warning);
  color: var(--gold-primary);
  padding: 12px 16px;
  font-weight: 500;
  border-bottom: 1px solid var(--gold-dark);
}

.validation-errors-content {
  overflow-y: auto;
  padding: 8px 0;
}

.validation-error-item {
  border-bottom: 1px solid var(--border-primary);
  transition: background-color var(--transition-fast);
}

.validation-error-item:hover {
  background-color: var(--bg-hover);
}

.validation-error-item:last-child {
  border-bottom: none;
}

.error-field {
  font-weight: 600;
  color: var(--gold-primary);
  font-family: var(--font-family-mono);
}

.error-message {
  color: var(--text-secondary);
}

/* ───────────────────────────────────────────────────────────────────
   MOBILE STYLES
   ─────────────────────────────────────────────────────────────────── */

.mobile-full-height {
  flex: 1 !important;
  max-height: none !important;
  height: 100%;
}

@media (max-width: 768px) {
  .content {
    flex-direction: column;
  }

  .left-panel {
    flex: 0 0 auto;
    max-height: 35vh;
    border-right: none;
    border-bottom: 1px solid var(--border-primary);
  }

  .left-panel.mobile-full-height {
    border-bottom: none;
  }

  .right-panel {
    flex: 1;
    min-height: 0;
  }

  .panel-header {
    padding: 10px 15px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .panel-header h3 {
    font-size: 14px;
  }

  .panel-header button {
    padding: 6px 12px;
    font-size: 12px;
  }

  .panel-content {
    padding: 12px;
  }

  .section-header {
    padding: 6px 10px;
  }

  .section-header h4 {
    font-size: 10px;
  }

  .section-item {
    font-size: 12px;
    padding: 10px 12px;
  }

  .section-item:hover {
    padding-left: 14px;
  }
}
</style>
