<template>
  <div class="scenario-settings-editor">
    <div class="editor-header">
      <h3>シナリオ設定</h3>
    </div>

    <div class="editor-content">
      <div class="settings-section">
        <div class="form-group">
          <v-text-field
            v-model="scenario.name"
            label="シナリオ名"
            placeholder="例：弱ディマカイルス後"
            density="compact"
            variant="outlined"
            hide-details
          />
        </div>

        <div class="form-group">
          <v-text-field
            v-model="scenario.description"
            label="説明"
            density="compact"
            variant="outlined"
            hide-details
          />
        </div>

        <div class="form-group">
          <v-select
            v-model="scenario.rootSituationId"
            :items="situationItems"
            item-title="title"
            item-value="value"
            label="開始状況"
            density="compact"
            variant="outlined"
            hide-details
          />
        </div>
      </div>

      <div class="settings-section">
        <h4>ゲーム木構築設定</h4>

        <InitialDynamicStateEditor
          v-if="scenario.initialDynamicState"
          v-model="scenario.initialDynamicState"
        />

        <RewardComputationMethodEditor v-model="scenario.rewardComputationMethod" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Scenario } from '@nomari/ts-proto';
import InitialDynamicStateEditor from './initial-dynamic-state-editor.vue';
import RewardComputationMethodEditor from './reward-computation-method-editor.vue';

const scenario = defineModel<Scenario>({
    required: true
});

const situationItems = computed(() => {
    return [
        {
            title: '選択してください',
            value: 0
        },
        ...scenario.value.situations.map((s) => ({
            title: s.name || '(説明なし)',
            value: s.situationId,
        })),
    ];
});
</script>

<style scoped>
.scenario-settings-editor {
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
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-section h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-secondary);
}

.form-group {
  display: flex;
  flex-direction: column;
}
</style>
