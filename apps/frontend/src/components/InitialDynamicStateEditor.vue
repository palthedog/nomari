<template>
  <div class="initial-dynamic-state-editor">
    <h4>初期状態</h4>
    <div class="resources-section">
      <div
        v-for="(resource, index) in model.resources"
        :key="index"
        class="resource-row"
      >
        <select
          v-model="resource.resourceType"
          @change="updateResource(index, 'type', parseInt(($event.target as HTMLSelectElement).value, 10))"
        >
          <option :value="ResourceType.UNKNOWN">Unknown</option>
          <option :value="ResourceType.PLAYER_HEALTH">Player Health</option>
          <option :value="ResourceType.OPPONENT_HEALTH">Opponent Health</option>
        </select>
        <input
          type="number"
          :value="resource.value"
          @input="updateResource(index, 'value', parseFloat(($event.target as HTMLInputElement).value))"
          placeholder="Value"
        />
        <button @click="removeResource(index)" type="button">削除</button>
      </div>
      <button @click="addResource" type="button">Resourceを追加</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DynamicState } from '@mari/ts-proto';
import { ResourceType } from '@mari/ts-proto';

const model = defineModel<DynamicState>({ required: true });

function addResource() {
    model.value.resources.push({
        resourceType: ResourceType.UNKNOWN,
        value: 0,
    });
}

function removeResource(index: number) {
    model.value.resources.splice(index, 1);
}

function updateResource(index: number, field: 'type' | 'value', value: number) {
    if (model.value.resources[index]) {
        const resource = model.value.resources[index];
        if (field === 'type') {
            resource.resourceType = value as ResourceType;
        } else {
            resource.value = value;
        }
    }
}
</script>

<style scoped>
.initial-dynamic-state-editor {
    padding: 15px;
    border: 1px solid #ddd;
    border-radius: 4px;
    background-color: white;
}

.initial-dynamic-state-editor h4 {
    margin-top: 0;
    margin-bottom: 15px;
}

.resources-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.resource-row {
    display: flex;
    gap: 10px;
    align-items: center;
}

.resource-row select,
.resource-row input {
    flex: 1;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.resource-row button {
    padding: 8px 15px;
    background-color: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.resource-row button:hover {
    opacity: 0.8;
}

.resources-section > button {
    padding: 8px 15px;
    background-color: #4CAF50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin-top: 10px;
}

.resources-section > button:hover {
    opacity: 0.8;
}
</style>
