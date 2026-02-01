<template>
  <div class="action-library-editor">
    <h3>アクションライブラリ</h3>

    <!-- Player Actions -->
    <div class="section player-section">
      <div class="section-header">
        <h4>プレイヤーアクション</h4>
        <span class="character-name">{{ player?.name || 'プレイヤー' }}</span>
      </div>
      <div class="action-list">
        <div
          v-for="(action, index) in player?.actions || []"
          :key="action.actionId"
          class="action-item"
        >
          <v-text-field
            v-model="action.name"
            class="action-name"
            placeholder="行動名"
            density="compact"
            variant="outlined"
            hide-details
          />
          <v-select
            v-model="action.actionType"
            :items="actionTypeItems"
            item-title="title"
            item-value="value"
            class="action-resource"
            density="compact"
            variant="outlined"
            hide-details
          />
          <CircleDeleteButton
            title="アクションを削除"
            @click="removePlayerAction(index)"
          />
        </div>
        <button
          type="button"
          class="add-action-btn add-player-action"
          @click="addPlayerAction"
        >
          + 追加
        </button>
      </div>
    </div>

    <!-- Opponent Actions -->
    <div class="section opponent-section">
      <div class="section-header">
        <h4>相手アクション</h4>
        <span class="character-name">{{ opponent?.name || '相手' }}</span>
      </div>
      <div class="action-list">
        <div
          v-for="(action, index) in opponent?.actions || []"
          :key="action.actionId"
          class="action-item"
        >
          <v-text-field
            v-model="action.name"
            class="action-name"
            placeholder="行動名"
            density="compact"
            variant="outlined"
            hide-details
          />
          <v-select
            v-model="action.actionType"
            :items="actionTypeItems"
            item-title="title"
            item-value="value"
            class="action-resource"
            density="compact"
            variant="outlined"
            hide-details
          />
          <CircleDeleteButton
            title="アクションを削除"
            @click="removeOpponentAction(index)"
          />
        </div>
        <button
          type="button"
          class="add-action-btn add-opponent-action"
          @click="addOpponentAction"
        >
          + 追加
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Character } from '@nomari/ts-proto';
import { ActionType } from '@nomari/ts-proto';
import { generateId } from '@/utils/scenario-utils';
import CircleDeleteButton from '@/components/common/circle-delete-button.vue';

const player = defineModel<Character>('player', {
    required: true 
});
const opponent = defineModel<Character>('opponent', {
    required: true 
});

const actionTypeItems = computed(() => [
    {
        title: '消費なし',
        value: ActionType.NORMAL
    },
    {
        title: 'OD技',
        value: ActionType.OD
    },
    {
        title: 'SA1',
        value: ActionType.SA1
    },
    {
        title: 'SA2',
        value: ActionType.SA2
    },
    {
        title: 'SA3',
        value: ActionType.SA3
    },
    {
        title: 'ラッシュ',
        value: ActionType.DRIVE_RUSH
    },
    {
        title: 'パリィ',
        value: ActionType.PARRY
    },
]);

function addPlayerAction() {
    if (!player.value) {
        return;
    }
    player.value.actions.push({
        actionId: generateId(),
        name: '',
        description: '',
        actionType: ActionType.NORMAL,
    });
}

function removePlayerAction(index: number) {
    if (!player.value) {
        return;
    }
    player.value.actions.splice(index, 1);
}

function addOpponentAction() {
    if (!opponent.value) {
        return;
    }
    opponent.value.actions.push({
        actionId: generateId(),
        name: '',
        description: '',
        actionType: ActionType.NORMAL,
    });
}

function removeOpponentAction(index: number) {
    if (!opponent.value) {
        return;
    }
    opponent.value.actions.splice(index, 1);
}
</script>

<style scoped>
.action-library-editor {
  padding: 20px;
}

.action-library-editor h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: var(--text-primary);
}

.section {
  margin-bottom: 30px;
  padding: 15px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 15px;
}

.section-header h4 {
  margin: 0;
}

.character-name {
  font-size: 12px;
  color: var(--text-tertiary);
}

.player-section {
  border-left: 4px solid var(--player-color);
}

.player-section h4 {
  color: var(--player-color-dark);
}

.opponent-section {
  border-left: 4px solid var(--opponent-color);
}

.opponent-section h4 {
  color: var(--opponent-color-dark);
}

.action-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.action-item {
  display: flex;
  gap: 10px;
  align-items: center;
}

.action-name {
  flex: 1;
}

.action-resource {
  width: 160px;
  flex-shrink: 0;
}

.add-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  width: fit-content;
}

.add-player-action {
  border-color: var(--player-border);
  color: var(--player-color-dark);
  background-color: var(--player-bg);
}

.add-player-action:hover {
  background-color: var(--player-color);
  border-color: var(--player-color);
  color: white;
}

.add-opponent-action {
  border-color: var(--opponent-border);
  color: var(--opponent-color-dark);
  background-color: var(--opponent-bg);
}

.add-opponent-action:hover {
  background-color: var(--opponent-color);
  border-color: var(--opponent-color);
  color: white;
}
</style>
