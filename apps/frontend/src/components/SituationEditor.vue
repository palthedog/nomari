<template>
  <div class="situation-editor">
    <div class="header-actions">
      <button @click="handleDelete" type="button" class="delete-btn">
        削除
      </button>
    </div>

    <!-- 基本情報 -->
    <div class="section">
      <div class="form-group" hidden>
        <label>Situation ID:</label>
        <input v-model="model.situationId" type="text" readonly />
      </div>
      <div class="form-group">
        <label>名前:</label>
        <textarea v-model="model.description" placeholder="例: 密着+4F" rows="3"></textarea>
      </div>
    </div>

    <!-- プレイヤー選択肢 -->
    <div class="section">
      <h4>プレイヤー選択肢</h4>
      <div v-for="(action, index) in model.playerActions?.actions || []" :key="index" class="form-row">
        <input type="hidden" v-model="action.id" />
        <input v-model="action.description" placeholder="行動の説明" />
        <button @click="removePlayerAction(index)" type="button">削除</button>
      </div>
      <button @click="addPlayerAction" type="button">追加</button>
    </div>

    <!-- 相手選択肢 -->
    <div class="section">
      <h4>相手選択肢</h4>
      <div v-for="(action, index) in model.opponentActions?.actions || []" :key="index" class="form-row">
        <input type="hidden" v-model="action.id" />
        <input v-model="action.description" placeholder="行動の説明" />
        <button @click="removeOpponentAction(index)" type="button">削除</button>
      </div>
      <button @click="addOpponentAction" type="button">追加</button>
    </div>

    <!-- 遷移テーブル -->
    <div class="section" v-if="(model.playerActions?.actions?.length || 0) > 0 && (model.opponentActions?.actions?.length || 0) > 0">
      <h4>遷移テーブル</h4>
      <div class="player-actions-list">
        <div
          v-for="playerAction in model.playerActions?.actions || []"
          :key="playerAction.id"
          class="player-action-section"
        >
          <div class="player-action-header">
            <strong>{{ playerAction.description || '(説明なし)' }}</strong>
          </div>
          <div class="opponent-actions-list">
            <div
              v-for="oppAction in model.opponentActions?.actions || []"
              :key="oppAction.id"
              class="opponent-action-item"
            >
              <div class="opponent-action-label">
                {{ oppAction.description || '(説明なし)' }}
              </div>
              <div class="transition-inputs">
                <div class="next-situation-row">
                  <label>次の状況:</label>
                  <select
                    :value="getTransition(playerAction.id, oppAction.id)?.nextSituationId || ''"
                    @change="updateNextSituationId(playerAction.id, oppAction.id, ($event.target as HTMLSelectElement).value)"
                  >
                    <option value="">次の状況を選択してください</option>
                    <optgroup label="Situations">
                      <option
                        v-for="situation in availableSituations"
                        :key="situation.situationId"
                        :value="situation.situationId"
                      >
                      <!-- {{ situation.situationId }} -->
                      {{ situation.description || '(説明なし)' }}
                      </option>
                    </optgroup>
                    <optgroup label="Terminal Situations">
                      <option
                        v-for="terminal in availableTerminalSituations"
                        :key="terminal.situationId"
                        :value="terminal.situationId"
                      >
                      <!-- {{ terminal.situationId }} -->
                      {{ terminal.name || '(名前なし)' }}
                      </option>
                    </optgroup>
                  </select>
                </div>
                <div class="resource-consumptions">
                  <!--label>Resource Consumptions:</label-->
                  <div
                    v-for="(consumption, idx) in getTransition(playerAction.id, oppAction.id)?.resourceConsumptions || []"
                    :key="idx"
                    class="consumption-row"
                  >
                    <select
                      :value="consumption.resourceType"
                      @change="updateResourceConsumption(playerAction.id, oppAction.id, idx, 'type', parseInt(($event.target as HTMLSelectElement).value, 10))"
                    >
                      <option :value="ResourceType.UNKNOWN">Unknown</option>
                      <option :value="ResourceType.PLAYER_HEALTH">プレイヤーのダメージ</option>
                      <option :value="ResourceType.OPPONENT_HEALTH">相手のダメージ</option>
                    </select>
                    <input
                      type="number"
                      :value="consumption.value"
                      @input="updateResourceConsumption(playerAction.id, oppAction.id, idx, 'value', parseFloat(($event.target as HTMLInputElement).value) || 0)"
                      placeholder="Value"
                    />
                    <button @click="removeResourceConsumption(playerAction.id, oppAction.id, idx)" type="button">削除</button>
                  </div>
                  <button
                    @click="addResourceConsumption(playerAction.id, oppAction.id)"
                    type="button"
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
import type {
    Situation,
    Transition,
    TerminalSituation,
} from '@mari/ts-proto';
import { ResourceType } from '@mari/ts-proto';
import { generateId } from '../utils/game-definition-utils';

const model = defineModel<Situation>({ required: true });

const props = defineProps<{
    availableSituations: Situation[];
    availableTerminalSituations: TerminalSituation[];
}>();

const emit = defineEmits<{
    (e: 'delete'): void;
}>();

function addPlayerAction() {
    if (!model.value.playerActions) return;
    // Create a new array to avoid direct mutation
    model.value.playerActions = {
        ...model.value.playerActions,
        actions: [
            ...model.value.playerActions.actions,
            {
                id: generateId('action'),
                description: '',
            },
        ],
    };
    updateTransitions();
}

function removePlayerAction(index: number) {
    if (!model.value.playerActions) return;
    const actionId = model.value.playerActions.actions[index].id;
    // Create new arrays to avoid direct mutation
    model.value.playerActions = {
        ...model.value.playerActions,
        actions: model.value.playerActions.actions.filter((_, i) => i !== index),
    };
    model.value.transitions = model.value.transitions.filter(
        (t) => t.playerActionId !== actionId
    );
    updateTransitions();
}

function addOpponentAction() {
    if (!model.value.opponentActions) return;
    // Create a new array to avoid direct mutation
    model.value.opponentActions = {
        ...model.value.opponentActions,
        actions: [
            ...model.value.opponentActions.actions,
            {
                id: generateId('action'),
                description: '',
            },
        ],
    };
    updateTransitions();
}

function removeOpponentAction(index: number) {
    if (!model.value.opponentActions) return;
    const actionId = model.value.opponentActions.actions[index].id;
    // Create new arrays to avoid direct mutation
    model.value.opponentActions = {
        ...model.value.opponentActions,
        actions: model.value.opponentActions.actions.filter((_, i) => i !== index),
    };
    model.value.transitions = model.value.transitions.filter(
        (t) => t.opponentActionId !== actionId
    );
    updateTransitions();
}

function updateTransitions() {
    if (!model.value.playerActions || !model.value.opponentActions) return;
    const existingTransitions = new Map<string, Transition>();
    model.value.transitions.forEach((t) => {
        existingTransitions.set(`${t.playerActionId}-${t.opponentActionId}`, t);
    });

    const newTransitions: Transition[] = [];
    for (const playerAction of model.value.playerActions.actions) {
        for (const oppAction of model.value.opponentActions.actions) {
            const key = `${playerAction.id}-${oppAction.id}`;
            const existing = existingTransitions.get(key);
            if (existing) {
                newTransitions.push(existing);
            } else {
                newTransitions.push({
                    playerActionId: playerAction.id,
                    opponentActionId: oppAction.id,
                    nextSituationId: '',
                    resourceConsumptions: [],
                });
            }
        }
    }
    model.value.transitions = newTransitions;
}

function getTransition(
    playerActionId: string,
    opponentActionId: string
): Transition | undefined {
    return model.value.transitions.find(
        (t) => t.playerActionId === playerActionId && t.opponentActionId === opponentActionId
    );
}

function updateNextSituationId(
    playerActionId: string,
    opponentActionId: string,
    nextSituationId: string
) {
    const transition = getTransition(playerActionId, opponentActionId);
    if (transition) {
        transition.nextSituationId = nextSituationId;
    }
}

function addResourceConsumption(playerActionId: string, opponentActionId: string) {
    const transition = getTransition(playerActionId, opponentActionId);
    if (transition) {
        if (!transition.resourceConsumptions) {
            transition.resourceConsumptions = [];
        }
        // Create a new array to avoid direct mutation
        transition.resourceConsumptions = [
            ...transition.resourceConsumptions,
            {
            resourceType: ResourceType.UNKNOWN,
            value: 0,
            },
        ];
    }
}

function removeResourceConsumption(
    playerActionId: string,
    opponentActionId: string,
    index: number
) {
    const transition = getTransition(playerActionId, opponentActionId);
    if (transition && transition.resourceConsumptions) {
        // Create a new array to avoid direct mutation
        transition.resourceConsumptions = transition.resourceConsumptions.filter((_, i) => i !== index);
    }
}

function updateResourceConsumption(
    playerActionId: string,
    opponentActionId: string,
    index: number,
    field: 'type' | 'value',
    value: number
) {
    const transition = getTransition(playerActionId, opponentActionId);
    if (transition && transition.resourceConsumptions && transition.resourceConsumptions[index]) {
        // Create a new array to avoid direct mutation that triggers infinite loops
        const newConsumptions = [...transition.resourceConsumptions];
        newConsumptions[index] = {
            ...newConsumptions[index],
            [field === 'type' ? 'resourceType' : 'value']: field === 'type' ? (value as ResourceType) : value,
        };
        transition.resourceConsumptions = newConsumptions;
    }
}

function handleDelete() {
    emit('delete');
}
</script>

<style scoped>
.situation-editor {
    padding: 20px;
}

.header-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.header-actions h3 {
    margin: 0;
}

.delete-btn {
    padding: 8px 16px;
    background-color: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
}

.delete-btn:hover {
    opacity: 0.8;
}

.section {
    margin-bottom: 30px;
    padding: 15px;
    border: 1px solid #ddd;
    border-radius: 4px;
}

.section h4 {
    margin-top: 0;
    margin-bottom: 15px;
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
    background-color: #f5f5f5;
    cursor: not-allowed;
}

.form-group input,
.form-group textarea,
.form-group select {
    width: 100%;
    padding: 8px;
    border: 1px solid #ccc;
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
    border: 1px solid #ccc;
    border-radius: 4px;
}

.form-row button {
    padding: 8px 15px;
    background-color: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

button {
    padding: 8px 15px;
    background-color: #4CAF50;
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
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 15px;
    background-color: #fafafa;
}

.player-action-header {
    margin-bottom: 15px;
    padding-bottom: 10px;
    border-bottom: 2px solid #ddd;
    font-size: 16px;
}

.opponent-actions-list {
    display: flex;
    flex-direction: column;
    gap: 15px;
    margin-left: 20px;
}

.opponent-action-item {
    border: 1px solid #e0e0e0;
    border-radius: 4px;
    padding: 12px;
    background-color: white;
}

.opponent-action-label {
    font-weight: bold;
    margin-bottom: 10px;
    color: #555;
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
    border: 1px solid #ccc;
    border-radius: 4px;
}

.resource-consumptions {
    padding: 10px;
    background-color: #f9f9f9;
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
    border: 1px solid #ccc;
    border-radius: 4px;
}

.consumption-row button {
    padding: 6px 12px;
    background-color: #f44336;
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

.resource-consumptions > button {
    margin-top: 0;
    font-size: 12px;
    padding: 6px 12px;
}
</style>
