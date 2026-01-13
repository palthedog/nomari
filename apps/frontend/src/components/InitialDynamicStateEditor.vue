<template>
  <div class="initial-dynamic-state-editor">
    <h4>初期状態</h4>
    <div class="resources-section">
      <div
        v-for="(resource, index) in editedDynamicState.resources"
        :key="index"
        class="resource-row"
      >
        <select
          v-model="resource.resourceType"
          @change="updateResource(index, 'type', parseInt(($event.target as HTMLSelectElement).value, 10))"
        >
          <option :value="ResourceType.RESOURCE_TYPE_UNKNOWN">Unknown</option>
          <option :value="ResourceType.RESOURCE_TYPE_PLAYER_HEALTH">Player Health</option>
          <option :value="ResourceType.RESOURCE_TYPE_OPPONENT_HEALTH">Opponent Health</option>
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
import { ref, watch, nextTick } from 'vue';
import type { DynamicState, DynamicStateResource } from '@mari/game-definition/types';
import { ResourceType } from '@mari/game-definition/types';
import { generateId } from '../utils/game-definition-utils';

const props = defineProps<{
    dynamicState: DynamicState;
}>();

const emit = defineEmits<{
    (e: 'update:dynamic-state', dynamicState: DynamicState): void;
}>();

const editedDynamicState = ref<DynamicState>(JSON.parse(JSON.stringify(props.dynamicState)));
let isUpdating = false;
let isExternalUpdate = false;

watch(
    () => props.dynamicState,
    (newState) => {
        if (isUpdating) return;
        isExternalUpdate = true;
        editedDynamicState.value = JSON.parse(JSON.stringify(newState));
        nextTick(() => {
            isExternalUpdate = false;
        });
    },
    { deep: true }
);

watch(
    editedDynamicState,
    (newState) => {
        if (isUpdating || isExternalUpdate) return;
        isUpdating = true;
        nextTick(() => {
            emit('update:dynamic-state', JSON.parse(JSON.stringify(newState)));
            nextTick(() => {
                isUpdating = false;
            });
        });
    },
    { deep: true, flush: 'post' }
);

function addResource() {
    // Create a new array to avoid direct mutation
    editedDynamicState.value = {
        ...editedDynamicState.value,
        resources: [
            ...editedDynamicState.value.resources,
            {
                resourceType: ResourceType.RESOURCE_TYPE_UNKNOWN,
                value: 0,
            },
        ],
    };
}

function removeResource(index: number) {
    // Create a new array to avoid direct mutation
    editedDynamicState.value = {
        ...editedDynamicState.value,
        resources: editedDynamicState.value.resources.filter((_, i) => i !== index),
    };
}

function updateResource(index: number, field: 'type' | 'value', value: number) {
    if (editedDynamicState.value.resources[index]) {
        // Create a new array to avoid direct mutation
        const newResources = [...editedDynamicState.value.resources];
        newResources[index] = {
            ...newResources[index],
            [field === 'type' ? 'resourceType' : 'value']: field === 'type' ? (value as ResourceType) : value,
        };
        editedDynamicState.value = {
            ...editedDynamicState.value,
            resources: newResources,
        };
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
