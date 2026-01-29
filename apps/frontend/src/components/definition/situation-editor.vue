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
      <div class="player-actions-list">
        <div
          v-for="playerAction in model.playerActions?.actions || []"
          :key="playerAction.actionId"
          class="player-action-section"
        >
          <div class="player-action-header">
            <strong>{{ playerAction.name || '(行動名説明なし)' }}</strong>
          </div>
          <div class="opponent-actions-list">
            <div
              v-for="oppAction in model.opponentActions?.actions || []"
              :key="oppAction.actionId"
              class="opponent-action-item"
            >
              <div class="opponent-action-label">
                {{ playerAction.name || '(行動名なし)' }} v.s. {{ oppAction.name || '(行動名なし)' }}
              </div>
              <div class="transition-inputs">
                <div class="next-situation-row">
                  <v-select
                    :model-value="getTransition(playerAction.actionId, oppAction.actionId)?.nextSituationId || 0"
                    :items="nextSituationItems"
                    item-title="title"
                    item-value="value"
                    label="次の状況"
                    density="compact"
                    variant="outlined"
                    hide-details
                    @update:model-value="(value: number) => updateNextSituationId(playerAction.actionId, oppAction.actionId, value)"
                  />
                </div>
                <div class="resource-consumptions">
                  <!--label>Resource Consumptions:</label-->
                  <div
                    v-for="(consumption, idx) in getTransition(playerAction.actionId, oppAction.actionId)?.resourceConsumptions || []"
                    :key="idx"
                    class="consumption-row"
                  >
                    <v-select
                      :model-value="consumption.resourceType"
                      :items="resourceTypeItems"
                      item-title="title"
                      item-value="value"
                      density="compact"
                      variant="outlined"
                      hide-details
                      @update:model-value="(value: number) => updateResourceConsumption(playerAction.actionId, oppAction.actionId, idx, 'type', value)"
                    />
                    <input
                      type="number"
                      :value="consumption.value"
                      placeholder="Value"
                      @input="updateResourceConsumption(playerAction.actionId, oppAction.actionId, idx, 'value', parseFloat(($event.target as HTMLInputElement).value) || 0)"
                    >
                    <button
                      type="button"
                      @click="removeResourceConsumption(playerAction.actionId, oppAction.actionId, idx)"
                    >
                      削除
                    </button>
                  </div>
                  <button
                    type="button"
                    @click="addResourceConsumption(playerAction.actionId, oppAction.actionId)"
                  >
                    ダメージ等を追加
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
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

const resourceTypeItems = computed(() => [
    {
        title: 'プレイヤーのダメージ',
        value: ResourceType.PLAYER_HEALTH 
    },
    {
        title: '相手のダメージ',
        value: ResourceType.OPPONENT_HEALTH 
    },
]);

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

function addResourceConsumption(playerActionId: number, opponentActionId: number) {
    const transition = getTransition(playerActionId, opponentActionId);
    if (transition) {
        if (!transition.resourceConsumptions) {
            transition.resourceConsumptions = [];
        }
        transition.resourceConsumptions.push({
            resourceType: ResourceType.OPPONENT_HEALTH,
            value: 1000,
        });
    }
}

function removeResourceConsumption(
    playerActionId: number,
    opponentActionId: number,
    index: number
) {
    const transition = getTransition(playerActionId, opponentActionId);
    if (transition && transition.resourceConsumptions) {
        transition.resourceConsumptions.splice(index, 1);
    }
}

function updateResourceConsumption(
    playerActionId: number,
    opponentActionId: number,
    index: number,
    field: 'type' | 'value',
    value: number
) {
    const transition = getTransition(playerActionId, opponentActionId);
    if (transition && transition.resourceConsumptions && transition.resourceConsumptions[index]) {
        const consumption = transition.resourceConsumptions[index];
        if (field === 'type') {
            consumption.resourceType = value as ResourceType;
        } else {
            consumption.value = value;
        }
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
