<template>
  <div class="terminal-situation-editor">
    <div class="header-actions">
      <button
        type="button"
        class="delete-btn"
        @click="handleDelete"
      >
        Terminal Situationを削除
      </button>
    </div>

    <!-- 基本情報 -->
    <div class="section">
      <div
        class="form-group"
        hidden
      >
        <label>Situation ID:</label>
        <input
          v-model="model.situationId"
          type="text"
          readonly
        >
      </div>
      <div class="form-group">
        <label>Type:</label>
        <select v-model="model.type">
          <option :value="TerminalSituationType.UNKNOWN">
            Unknown
          </option>
          <option :value="TerminalSituationType.NEUTRAL">
            Neutral
          </option>
        </select>
      </div>
      <div class="form-group">
        <label>Name:</label>
        <input
          v-model="model.name"
          type="text"
        >
      </div>
      <div class="form-group">
        <label>Description:</label>
        <textarea
          v-model="model.description"
          rows="3"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TerminalSituation } from '@mari/ts-proto';
import { TerminalSituationType } from '@mari/ts-proto';

const model = defineModel<TerminalSituation>({ required: true });

const emit = defineEmits<{
    (e: 'delete'): void;
}>();

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
