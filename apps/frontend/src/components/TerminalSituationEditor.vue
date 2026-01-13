<template>
  <div class="terminal-situation-editor">
    <div class="header-actions">
      <button @click="handleDelete" type="button" class="delete-btn">
        Terminal Situationを削除
      </button>
    </div>

    <!-- 基本情報 -->
    <div class="section">
      <div class="form-group" hidden>
        <label>Situation ID:</label>
        <input v-model="editedTerminalSituation.situationId" type="text" readonly />
      </div>
      <div class="form-group">
        <label>Type:</label>
        <select v-model="editedTerminalSituation.type">
          <option :value="TerminalSituationType.TERMINAL_SITUATION_TYPE_UNKNOWN">Unknown</option>
          <option :value="TerminalSituationType.TERMINAL_SITUATION_TYPE_NEUTRAL">Neutral</option>
        </select>
      </div>
      <div class="form-group">
        <label>Name:</label>
        <input v-model="editedTerminalSituation.name" type="text" />
      </div>
      <div class="form-group">
        <label>Description:</label>
        <textarea v-model="editedTerminalSituation.description" rows="3"></textarea>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import type { TerminalSituation } from '@mari/game-definition/types';
import { TerminalSituationType } from '@mari/game-definition/types';

const props = defineProps<{
    terminalSituation: TerminalSituation;
}>();

const emit = defineEmits<{
    (e: 'update:terminal-situation', terminalSituation: TerminalSituation): void;
    (e: 'delete'): void;
}>();

const editedTerminalSituation = ref<TerminalSituation>(JSON.parse(JSON.stringify(props.terminalSituation)));
let isUpdating = false;
let isExternalUpdate = false;

watch(
    () => props.terminalSituation,
    (newTerminalSituation) => {
        if (isUpdating) return;
        isExternalUpdate = true;
        editedTerminalSituation.value = JSON.parse(JSON.stringify(newTerminalSituation));
        nextTick(() => {
            isExternalUpdate = false;
        });
    },
    { deep: true }
);

watch(
    editedTerminalSituation,
    (newTerminalSituation) => {
        if (isUpdating || isExternalUpdate) return;
        isUpdating = true;
        nextTick(() => {
            emit('update:terminal-situation', JSON.parse(JSON.stringify(newTerminalSituation)));
            nextTick(() => {
                isUpdating = false;
            });
        });
    },
    { deep: true, flush: 'post' }
);

function handleDelete() {
    emit('delete');
}
</script>

<style scoped>
.terminal-situation-editor {
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
</style>
