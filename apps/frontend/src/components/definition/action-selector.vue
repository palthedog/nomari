<template>
  <div
    class="section action-selector"
    :class="sectionClass"
  >
    <h4>{{ title }}</h4>
    <v-chip-group
      v-model="model"
      column
      multiple
      mandatory="force"
    >
      <v-chip
        v-for="action in actions"
        :key="action.actionId"
        :value="action.actionId"
        size="default"
      >
        {{ action.name || `Action ${action.actionId}` }}
      </v-chip>
    </v-chip-group>
    <v-chip
      size="default"
      variant="outlined"
      prepend-icon="mdi-pencil-plus"
      class="edit-chip"
      @click="emit('edit')"
    >
      追加
    </v-chip>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { Action } from '@nomari/ts-proto';

const model = defineModel<number[]>({
    required: true
});

const props = defineProps<{
    actions: Action[];
    title: string;
    variant: 'player' | 'opponent';
}>();

const emit = defineEmits<{
    (e: 'edit'): void;
}>();

const sectionClass = computed(() =>
    props.variant === 'player' ? 'player-section' : 'opponent-section'
);
</script>

<style scoped>
.action-selector {
  margin-bottom: 30px;
  padding: 15px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
}

.action-selector h4 {
  margin-top: 0;
  margin-bottom: 15px;
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

.edit-chip {
  margin-top: 8px;
}

.player-section :deep(.v-chip--selected) {
  background-color: var(--player-color) !important;
  color: white !important;
}

.opponent-section :deep(.v-chip--selected) {
  background-color: var(--opponent-color) !important;
  color: white !important;
}
</style>
