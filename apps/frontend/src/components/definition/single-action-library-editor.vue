<template>
  <div class="single-action-library-editor">
    <div class="editor-header">
      <h3>{{ headerTitle }}</h3>
    </div>

    <div class="editor-content">
      <div
        class="section"
        :class="sectionClass"
      >
        <div class="action-list">
          <div
            v-for="(action, index) in character?.actions || []"
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
              @click="removeAction(index)"
            />
          </div>
          <button
            type="button"
            class="add-action-btn"
            :class="addButtonClass"
            @click="addAction"
          >
            + 追加
          </button>
        </div>
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

const props = defineProps<{
    target: 'player' | 'opponent';
}>();

const character = defineModel<Character>({
    required: true
});

const headerTitle = computed(() => {
    return props.target === 'player' ? 'プレイヤー始動技' : '相手始動技';
});

const sectionClass = computed(() => {
    return props.target === 'player' ? 'player-section' : 'opponent-section';
});

const addButtonClass = computed(() => {
    return props.target === 'player' ? 'add-player-action' : 'add-opponent-action';
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

function addAction() {
    if (!character.value) {
        return;
    }
    character.value.actions.push({
        actionId: generateId(),
        name: '',
        description: '',
        actionType: ActionType.NORMAL,
    });
}

function removeAction(index: number) {
    if (!character.value) {
        return;
    }
    character.value.actions.splice(index, 1);
}
</script>

<style scoped>
.single-action-library-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-header {
  padding: 15px;
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-primary);
}

.editor-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--text-primary);
}

.editor-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.section {
  padding: 15px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
}

.player-section {
  border-left: 4px solid var(--player-color);
}

.opponent-section {
  border-left: 4px solid var(--opponent-color);
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
