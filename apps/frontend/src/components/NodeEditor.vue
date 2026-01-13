<template>
  <div class="node-editor">
    <div class="header-actions">
      <h3>ノード編集</h3>
      <button
        v-if="!isRootNode"
        @click="handleDelete"
        type="button"
        class="delete-btn"
      >
        ノードを削除
      </button>
    </div>
    
    <!-- 基本情報 -->
    <div class="section">
      <h4>基本情報</h4>
      <div class="form-group">
        <label>説明:</label>
        <textarea v-model="editedNode.description" rows="3"></textarea>
      </div>
    </div>

    <!-- Situation -->
    <div class="section">
      <h4>Situation</h4>
      <div v-for="(cell, index) in editedNode.situation?.cells || []" :key="index" class="form-row">
        <input type="hidden" v-model="cell.id" placeholder="ID" />
        <input v-model="cell.value" placeholder="Value" />
        <button @click="removeSituationCell(index)" type="button">削除</button>
      </div>
      <button @click="addSituationCell" type="button">Cell追加</button>
    </div>

    <!-- プレイヤーアクション -->
    <div class="section">
      <h4>プレイヤーアクション</h4>
      <div v-if="!editedNode.playerActions">
        <button @click="initPlayerActions" type="button">行動を追加</button>
      </div>
      <div v-else>
        <div v-for="(action, index) in editedNode.playerActions.actions" :key="index" class="form-row">
          <input type="hidden" v-model="action.id" placeholder="アクションID" />
          <input v-model="action.description" placeholder="説明" />
          <button @click="removePlayerAction(index)" type="button">削除</button>
        </div>
        <button @click="addPlayerAction" type="button">行動を追加</button>
      </div>
    </div>

    <!-- 対戦相手アクション -->
    <div class="section">
      <h4>対戦相手アクション</h4>
      <div v-if="!editedNode.opponentActions">
        <button @click="initOpponentActions" type="button">行動を追加</button>
      </div>
      <div v-else>
        <div v-for="(action, index) in editedNode.opponentActions.actions" :key="index" class="form-row">
          <input type="hidden" v-model="action.id" placeholder="アクションID" />
          <input v-model="action.description" placeholder="説明" />
          <button @click="removeOpponentAction(index)" type="button">削除</button>
        </div>
        <button @click="addOpponentAction" type="button">行動を追加</button>
      </div>
    </div>

    <!-- 遷移テーブル -->
    <div class="section" v-if="editedNode.playerActions && editedNode.opponentActions">
      <h4>遷移テーブル</h4>
      <table class="transition-table">
        <thead>
          <tr>
            <th></th>
            <th v-for="oppAction in editedNode.opponentActions.actions" :key="oppAction.id">
              {{ oppAction.description }}<br/><!-- {{ oppAction.id }} -->
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="playerAction in editedNode.playerActions.actions" :key="playerAction.id">
            <td class="action-label">
              {{ playerAction.description }}<br/><!-- {{ playerAction.id }} -->
            </td>
            <td v-for="oppAction in editedNode.opponentActions.actions" :key="oppAction.id" class="transition-cell">
              <div class="transition-inputs">
                <label>
                  <input
                    type="checkbox"
                    :checked="getTransition(playerAction.id, oppAction.id)?.isTerminal || false"
                    @change="updateTerminal(playerAction.id, oppAction.id, ($event.target as HTMLInputElement).checked)"
                  />
                  終端
                </label>
                <select
                  v-if="!getTransition(playerAction.id, oppAction.id)?.isTerminal"
                  :value="getTransition(playerAction.id, oppAction.id)?.nextNodeId || ''"
                  @change="updateNextNode(playerAction.id, oppAction.id, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="">選択してください</option>
                  <option v-for="availableNode in availableNodes" :key="availableNode.id" :value="availableNode.id">
                    {{ availableNode.description || '(新規ノード)' }}
                  </option>
                </select>
                <div v-if="getTransition(playerAction.id, oppAction.id)?.isTerminal" class="rewards">
                  <input
                    type="number"
                    :value="getTransition(playerAction.id, oppAction.id)?.playerReward?.value || 0"
                    @input="updateReward(playerAction.id, oppAction.id, 'player', parseInt(($event.target as HTMLInputElement).value))"
                    placeholder="プレイヤー報酬"
                  />
                  <input
                    type="number"
                    :value="getTransition(playerAction.id, oppAction.id)?.opponentReward?.value || 0"
                    @input="updateReward(playerAction.id, oppAction.id, 'opponent', parseInt(($event.target as HTMLInputElement).value))"
                    placeholder="対戦相手報酬"
                  />
                </div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { Node, NodeTransition } from '@mari/game-tree/game-tree';
import { generateNodeId } from '../utils/treeUtils';

const props = defineProps<{
  node: Node;
  availableNodes: Node[];
  isRootNode: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:node', node: Node): void;
  (e: 'delete'): void;
}>();

const editedNode = ref<Node>({ ...props.node });

watch(() => props.node, (newNode) => {
  editedNode.value = { ...newNode };
}, { deep: true });

watch(editedNode, (newNode) => {
  emit('update:node', newNode);
}, { deep: true });

function initPlayerActions() {
  editedNode.value.playerActions = {
    id: 'player',
    actions: []
  };
}

function initOpponentActions() {
  editedNode.value.opponentActions = {
    id: 'opponent',
    actions: []
  };
}

function addPlayerAction() {
  if (!editedNode.value.playerActions) {
    initPlayerActions();
  }
  editedNode.value.playerActions!.actions.push({
    id: generateNodeId('action'),
    description: ''
  });
  updateTransitions();
}

function removePlayerAction(index: number) {
  if (editedNode.value.playerActions) {
    const actionId = editedNode.value.playerActions.actions[index].id;
    editedNode.value.playerActions.actions.splice(index, 1);
    // Remove transitions for this action
    editedNode.value.transitions = editedNode.value.transitions.filter(
      t => t.playerActionId !== actionId
    );
  }
}

function addOpponentAction() {
  if (!editedNode.value.opponentActions) {
    initOpponentActions();
  }
  editedNode.value.opponentActions!.actions.push({
    id: generateNodeId('action'),
    description: ''
  });
  updateTransitions();
}

function removeOpponentAction(index: number) {
  if (editedNode.value.opponentActions) {
    const actionId = editedNode.value.opponentActions.actions[index].id;
    editedNode.value.opponentActions.actions.splice(index, 1);
    // Remove transitions for this action
    editedNode.value.transitions = editedNode.value.transitions.filter(
      t => t.opponentActionId !== actionId
    );
  }
}

function updateTransitions() {
  if (!editedNode.value.playerActions || !editedNode.value.opponentActions) {
    return;
  }

  const existingTransitions = new Map<string, NodeTransition>();
  editedNode.value.transitions.forEach(t => {
    existingTransitions.set(`${t.playerActionId}-${t.opponentActionId}`, t);
  });

  const newTransitions: NodeTransition[] = [];
  for (const playerAction of editedNode.value.playerActions.actions) {
    for (const oppAction of editedNode.value.opponentActions.actions) {
      const key = `${playerAction.id}-${oppAction.id}`;
      const existing = existingTransitions.get(key);
      if (existing) {
        newTransitions.push(existing);
      } else {
        newTransitions.push({
          playerActionId: playerAction.id,
          opponentActionId: oppAction.id,
          nextNodeId: ''
        });
      }
    }
  }
  editedNode.value.transitions = newTransitions;
}

function getTransition(playerActionId: string, opponentActionId: string): NodeTransition | undefined {
  return editedNode.value.transitions.find(
    t => t.playerActionId === playerActionId && t.opponentActionId === opponentActionId
  );
}

function updateNextNode(playerActionId: string, opponentActionId: string, nextNodeId: string) {
  const transition = getTransition(playerActionId, opponentActionId);
  if (transition) {
    transition.nextNodeId = nextNodeId;
    transition.isTerminal = false;
  }
}

function updateTerminal(playerActionId: string, opponentActionId: string, isTerminal: boolean) {
  const transition = getTransition(playerActionId, opponentActionId);
  if (transition) {
    transition.isTerminal = isTerminal;
    if (isTerminal) {
      transition.nextNodeId = '';
      if (!transition.playerReward) {
        transition.playerReward = { value: 0 };
      }
      if (!transition.opponentReward) {
        transition.opponentReward = { value: 0 };
      }
    }
  }
}

function updateReward(playerActionId: string, opponentActionId: string, player: 'player' | 'opponent', value: number) {
  const transition = getTransition(playerActionId, opponentActionId);
  if (transition) {
    if (player === 'player') {
      if (!transition.playerReward) {
        transition.playerReward = { value: 0 };
      }
      transition.playerReward.value = value;
    } else {
      if (!transition.opponentReward) {
        transition.opponentReward = { value: 0 };
      }
      transition.opponentReward.value = value;
    }
  }
}

function addSituationCell() {
  if (!editedNode.value.situation) {
    editedNode.value.situation = { cells: [] };
  }
  editedNode.value.situation.cells.push({ id: '', value: '' });
}

function removeSituationCell(index: number) {
  if (editedNode.value.situation) {
    editedNode.value.situation.cells.splice(index, 1);
  }
}

function handleDelete() {
  emit('delete');
}
</script>

<style scoped>
.node-editor {
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

.form-group input,
.form-group textarea {
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

.transition-table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 15px;
}

.transition-table th,
.transition-table td {
  border: 1px solid #ddd;
  padding: 8px;
  text-align: left;
}

.transition-table th {
  background-color: #f2f2f2;
  font-weight: bold;
}

.action-label {
  font-weight: bold;
  background-color: #f9f9f9;
}

.transition-cell {
  vertical-align: top;
}

.transition-inputs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.transition-inputs label {
  display: flex;
  align-items: center;
  gap: 5px;
}

.transition-inputs select {
  width: 100%;
  padding: 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.rewards {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.rewards input {
  width: 100%;
  padding: 6px;
  border: 1px solid #ccc;
  border-radius: 4px;
}
</style>
