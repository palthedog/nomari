<template>
  <div class="terminal-situation-editor">
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
          variant="outlined"
          hide-details
        />
      </div>
      <div class="form-group">
        <label>説明:</label>
        <textarea
          v-model="model.description"
          rows="3"
        />
      </div>
      <div class="form-group">
        <v-select
          v-model="model.cornerState"
          :items="cornerStateItems"
          item-title="title"
          item-value="value"
          label="画面端の状態"
          density="compact"
          variant="outlined"
          hide-details
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { TerminalSituation } from '@nomari/ts-proto';
import { CornerState } from '@nomari/ts-proto';

const model = defineModel<TerminalSituation>({
    required: true 
});

const cornerStateItems = [
    {
        title: 'どちらも画面端にいない',
        value: CornerState.NONE 
    },
    {
        title: 'プレイヤーが画面端にいる',
        value: CornerState.PLAYER_IN_CORNER 
    },
    {
        title: '相手が画面端にいる',
        value: CornerState.OPPONENT_IN_CORNER 
    },
];

</script>

<style scoped>
.terminal-situation-editor {
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
</style>
