<template>
  <div class="situation-editor">
    <!-- 基本情報 -->
    <div class="section">
      <div
        class="form-group"
        hidden
      >
        <v-text-field
          v-model="model.situationId"
          label="Situation ID"
          readonly
          density="compact"
          variant="outlined"
          hide-details
        />
      </div>
      <div class="form-group">
        <v-text-field
          v-model="model.name"
          label="名前"
          density="compact"
          placeholder="例: 密着+4F"
          variant="outlined"
          hide-details
        />
      </div>
    </div>

    <!-- プレイヤー選択肢 -->
    <div class="section">
      <h4>プレイヤー選択肢</h4>
      <div
        v-for="(action, index) in model.playerActions?.actions || []"
        :key="index"
        class="form-row"
      >
        <input
          v-model="action.actionId"
          type="hidden"
        >
        <v-text-field
          v-model="action.name"
          class="form-name"
          placeholder="行動"
          density="compact"
          variant="outlined"
          hide-details
        />
        <v-text-field
          v-model="action.description"
          class="form-description"
          placeholder="説明"
          density="compact"
          variant="outlined"
          hide-details
        />
        <button
          type="button"
          @click="removePlayerAction(index)"
        >
          削除
        </button>
      </div>
      <button
        type="button"
        @click="addPlayerAction"
      >
        追加
      </button>
    </div>

    <!-- 相手選択肢 -->
    <div class="section">
      <h4>相手選択肢</h4>
      <div
        v-for="(action, index) in model.opponentActions?.actions || []"
        :key="index"
        class="form-row"
      >
        <input
          v-model="action.actionId"
          type="hidden"
        >
        <v-text-field
          v-model="action.name"
          class="form-name"
          placeholder="行動"
          density="compact"
          variant="outlined"
          hide-details
        />
        <v-text-field
          v-model="action.description"
          class="form-description"
          placeholder="説明"
          density="compact"
          variant="outlined"
          hide-details
        />
        <button
          type="button"
          @click="removeOpponentAction(index)"
        >
          削除
        </button>
      </div>
      <button
        type="button"
        @click="addOpponentAction"
      >
        追加
      </button>
    </div>

    <!-- 遷移テーブル -->
    <div
      v-if="(model.playerActions?.actions?.length || 0) > 0 && (model.opponentActions?.actions?.length || 0) > 0"
      class="section"
    >
      <div class="transition-header">
        <h4>遷移テーブル</h4>
        <div class="bulk-set-controls">
          <v-select
            v-model="bulkNextSituationId"
            :items="nextSituationItems"
            item-title="title"
            item-value="value"
            label="一括設定"
            density="compact"
            variant="outlined"
            hide-details
            class="bulk-select"
          />
          <button
            type="button"
            class="bulk-set-button"
            @click="applyBulkNextSituation"
          >
            全てに適用
          </button>
        </div>
      </div>
      <!-- Matrix view for transitions -->
      <div class="transition-matrix">
        <table>
          <thead>
            <tr>
              <th class="corner-cell">
                P＼O
              </th>
              <th
                v-for="oppAction in model.opponentActions?.actions || []"
                :key="oppAction.actionId"
                class="opponent-header"
              >
                {{ oppAction.name || '?' }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="playerAction in model.playerActions?.actions || []"
              :key="playerAction.actionId"
            >
              <th class="player-header">
                {{ playerAction.name || '?' }}
              </th>
              <td
                v-for="oppAction in model.opponentActions?.actions || []"
                :key="oppAction.actionId"
                class="transition-cell"
              >
                <v-select
                  :model-value="getTransition(playerAction.actionId, oppAction.actionId)?.nextSituationId || 0"
                  :items="nextSituationItems"
                  item-title="title"
                  item-value="value"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="transition-select"
                  @update:model-value="(value: number) => updateNextSituationId(playerAction.actionId, oppAction.actionId, value)"
                />
                <div class="damage-inputs">
                  <div class="damage-field damage-deal">
                    <span class="damage-label">与</span>
                    <input
                      type="number"
                      class="damage-input"
                      :value="getOpponentDamage(playerAction.actionId, oppAction.actionId) || ''"
                      @input="setOpponentDamage(playerAction.actionId, oppAction.actionId, parseFloat(($event.target as HTMLInputElement).value) || 0)"
                    >
                  </div>
                  <div class="damage-field damage-receive">
                    <span class="damage-label">被</span>
                    <input
                      type="number"
                      class="damage-input"
                      :value="getPlayerDamage(playerAction.actionId, oppAction.actionId) || ''"
                      @input="setPlayerDamage(playerAction.actionId, oppAction.actionId, parseFloat(($event.target as HTMLInputElement).value) || 0)"
                    >
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type {
    Situation,
    Transition,
    TerminalSituation,
} from '@nomari/ts-proto';
import { ResourceType } from '@nomari/ts-proto';
import { generateId } from '@/utils/game-definition-utils';

const model = defineModel<Situation>({
    required: true
});

import { ref } from 'vue';

const bulkNextSituationId = ref<number>(0);

const props = defineProps<{
    availableSituations: Situation[];
    availableTerminalSituations: TerminalSituation[];
}>();


const nextSituationItems = computed(() => {
    const items: Array<{ title: string;
        value: number }> = [
        {
            title: '次の状況を選択してください',
            value: 0 
        },
    ];

    if (props.availableSituations.length > 0) {
        items.push(...props.availableSituations.map((s) => ({
            title: `${s.name || '(説明なし)'}`,
            value: s.situationId,
        })));
    }

    if (props.availableTerminalSituations.length > 0) {
        items.push(...props.availableTerminalSituations.map((t) => ({
            title: `${t.name || '(名前なし)'}`,
            value: t.situationId,
        })));
    }

    return items;
});

function addPlayerAction() {
    if (!model.value.playerActions) {
        return;
    }
    model.value.playerActions.actions.push({
        actionId: generateId(),
        name: '',
        description: '',
    });
    updateTransitions();
}

function removePlayerAction(index: number) {
    if (!model.value.playerActions) {
        return;
    }
    const actionId = model.value.playerActions.actions[index].actionId;
    model.value.playerActions.actions.splice(index, 1);
    // Remove transitions for this action
    model.value.transitions = model.value.transitions.filter(
        (t) => t.playerActionId !== actionId
    );
    updateTransitions();
}

function addOpponentAction() {
    if (!model.value.opponentActions) {
        return;
    }
    model.value.opponentActions.actions.push({
        actionId: generateId(),
        name: '',
        description: '',
    });
    updateTransitions();
}

function removeOpponentAction(index: number) {
    if (!model.value.opponentActions) {
        return;
    }
    const actionId = model.value.opponentActions.actions[index].actionId;
    model.value.opponentActions.actions.splice(index, 1);
    // Remove transitions for this action
    model.value.transitions = model.value.transitions.filter(
        (t) => t.opponentActionId !== actionId
    );
    updateTransitions();
}

function updateTransitions() {
    if (!model.value.playerActions || !model.value.opponentActions) {
        return;
    }
    const existingTransitions = new Map<string, Transition>();
    model.value.transitions.forEach((t) => {
        existingTransitions.set(`${t.playerActionId}-${t.opponentActionId}`, t);
    });

    const newTransitions: Transition[] = [];
    for (const playerAction of model.value.playerActions.actions) {
        for (const oppAction of model.value.opponentActions.actions) {
            const key = `${playerAction.actionId}-${oppAction.actionId}`;
            const existing = existingTransitions.get(key);
            if (existing) {
                newTransitions.push(existing);
            } else {
                newTransitions.push({
                    playerActionId: playerAction.actionId,
                    opponentActionId: oppAction.actionId,
                    nextSituationId: 0,
                    resourceConsumptions: [],
                    resourceRequirements: [],
                });
            }
        }
    }
    model.value.transitions = newTransitions;
}

function getTransition(
    playerActionId: number,
    opponentActionId: number
): Transition | undefined {
    return model.value.transitions.find(
        (t) => t.playerActionId === playerActionId && t.opponentActionId === opponentActionId
    );
}

function updateNextSituationId(
    playerActionId: number,
    opponentActionId: number,
    nextSituationId: number
) {
    const transition = getTransition(playerActionId, opponentActionId);
    if (transition) {
        transition.nextSituationId = nextSituationId;
    }
}

function applyBulkNextSituation() {
    if (bulkNextSituationId.value === 0) {
        return;
    }
    for (const transition of model.value.transitions) {
        transition.nextSituationId = bulkNextSituationId.value;
    }
}

function getOpponentDamage(playerActionId: number, opponentActionId: number): number {
    const transition = getTransition(playerActionId, opponentActionId);
    if (!transition?.resourceConsumptions) {
        return 0;
    }
    const consumption = transition.resourceConsumptions.find(
        (c) => c.resourceType === ResourceType.OPPONENT_HEALTH
    );
    return consumption?.value || 0;
}

function setOpponentDamage(playerActionId: number, opponentActionId: number, value: number) {
    const transition = getTransition(playerActionId, opponentActionId);
    if (!transition) {
        return;
    }
    if (!transition.resourceConsumptions) {
        transition.resourceConsumptions = [];
    }
    const existing = transition.resourceConsumptions.find(
        (c) => c.resourceType === ResourceType.OPPONENT_HEALTH
    );
    if (existing) {
        existing.value = value;
    } else if (value !== 0) {
        transition.resourceConsumptions.push({
            resourceType: ResourceType.OPPONENT_HEALTH,
            value: value,
        });
    }
}

function getPlayerDamage(playerActionId: number, opponentActionId: number): number {
    const transition = getTransition(playerActionId, opponentActionId);
    if (!transition?.resourceConsumptions) {
        return 0;
    }
    const consumption = transition.resourceConsumptions.find(
        (c) => c.resourceType === ResourceType.PLAYER_HEALTH
    );
    return consumption?.value || 0;
}

function setPlayerDamage(playerActionId: number, opponentActionId: number, value: number) {
    const transition = getTransition(playerActionId, opponentActionId);
    if (!transition) {
        return;
    }
    if (!transition.resourceConsumptions) {
        transition.resourceConsumptions = [];
    }
    const existing = transition.resourceConsumptions.find(
        (c) => c.resourceType === ResourceType.PLAYER_HEALTH
    );
    if (existing) {
        existing.value = value;
    } else if (value !== 0) {
        transition.resourceConsumptions.push({
            resourceType: ResourceType.PLAYER_HEALTH,
            value: value,
        });
    }
}

</script>

<style scoped>
.situation-editor {
  padding: 20px;
}

.section {
  margin-bottom: 30px;
  padding: 15px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
}

.section h4 {
  margin-top: 0;
  margin-bottom: 15px;
}

.transition-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.transition-header h4 {
  margin: 0;
}

.bulk-set-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.bulk-select {
  min-width: 200px;
}

.bulk-set-button {
  margin-top: 0 !important;
  white-space: nowrap;
}

.transition-matrix {
  overflow-x: auto;
  margin-top: 15px;
}

.transition-matrix table {
  border-collapse: collapse;
  width: 100%;
  min-width: max-content;
}

.transition-matrix th,
.transition-matrix td {
  border: 1px solid var(--border-primary);
  padding: 8px;
  text-align: center;
  vertical-align: top;
}

.transition-matrix .corner-cell {
  background-color: var(--bg-tertiary);
  font-weight: bold;
  min-width: 60px;
}

.transition-matrix .player-header {
  background-color: var(--bg-secondary);
  font-weight: bold;
  text-align: right;
  padding-right: 12px;
  min-width: 80px;
}

.transition-matrix .opponent-header {
  background-color: var(--bg-secondary);
  font-weight: bold;
  min-width: 120px;
}

.transition-matrix .transition-cell {
  min-width: 150px;
  padding: 6px;
}

.transition-matrix .transition-select {
  margin-bottom: 6px;
}

.transition-matrix .damage-inputs {
  display: flex;
  gap: 4px;
  margin-top: 4px;
}

.transition-matrix .damage-field {
  display: flex;
  align-items: center;
  gap: 2px;
}

.transition-matrix .damage-label {
  font-size: 11px;
  font-weight: bold;
  min-width: 14px;
}

.transition-matrix .damage-deal .damage-label {
  color: #2e7d32;
}

.transition-matrix .damage-receive .damage-label {
  color: #c62828;
}

.transition-matrix .damage-input {
  width: 55px;
  padding: 3px 4px;
  border: 1px solid var(--border-input);
  border-radius: 4px;
  font-size: 12px;
  text-align: right;
}

.transition-matrix .damage-deal .damage-input {
  border-color: #81c784;
}

.transition-matrix .damage-receive .damage-input {
  border-color: #e57373;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input[readonly] {
  background-color: var(--bg-quaternary);
  cursor: not-allowed;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-input);
  border-radius: 4px;
}

.form-row {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
  align-items: center;
}

.form-row input {
  flex: 1;
  padding: 8px;
  border: 1px solid var(--border-input);
  border-radius: 4px;
}

.form-row .form-name {
  flex: 1;
}

.form-row .form-description {
  flex: 3;
}

.form-row .v-text-field {
  flex: 1;
}

.form-row .v-text-field.form-description {
  flex: 3;
}

.form-row button {
  padding: 8px 15px;
  background-color: var(--color-error);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

button {
  padding: 8px 15px;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

button:hover {
  opacity: 0.8;
}

.player-actions-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
  margin-top: 15px;
}

.player-action-section {
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  padding: 15px;
  background-color: var(--bg-secondary);
}

.player-action-header {
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid var(--border-primary);
  font-size: 16px;
}

.opponent-actions-list {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-left: 20px;
}

.opponent-action-item {
  border: 1px solid var(--border-secondary);
  border-radius: 4px;
  padding: 12px;
  background-color: var(--bg-primary);
}

.opponent-action-label {
  font-weight: bold;
  margin-bottom: 10px;
  color: var(--text-primary);
  font-size: 14px;
}

.transition-inputs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.next-situation-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.next-situation-row label {
  white-space: nowrap;
  margin: 0;
  font-weight: bold;
  font-size: 14px;
}

.transition-inputs select {
  flex: 1;
  padding: 6px;
  border: 1px solid var(--border-input);
  border-radius: 4px;
}

.resource-consumptions {
  padding: 10px;
  background-color: var(--bg-tertiary);
  border-radius: 4px;
}

.resource-consumptions label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  font-size: 12px;
}

.consumption-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.consumption-row select,
.consumption-row input {
  flex: 1;
  padding: 6px;
  border: 1px solid var(--border-input);
  border-radius: 4px;
}

.consumption-row button {
  padding: 6px 12px;
  background-color: var(--color-error);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  margin-top: 0;
}

.consumption-row button:hover {
  opacity: 0.8;
}

.resource-consumptions>button {
  margin-top: 0;
  font-size: 12px;
  padding: 6px 12px;
}
</style>
