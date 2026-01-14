<template>
  <div class="initial-dynamic-state-editor">
    <h4>初期状態</h4>
    
    <div class="resources-section">
      <div
        v-for="(resource, index) in model.resources"
        :key="index"
        class="resource-row"
      >
        <div class="resource-label">
            <template v-if="resource.resourceType === ResourceType.PLAYER_HEALTH">
            プレイヤーの体力
            </template>
            <template v-else-if="resource.resourceType === ResourceType.OPPONENT_HEALTH">
            相手の体力
            </template>
        </div>
        
        <div class="resource-value">
            <input
            type="number"
            :value="resource.value"
            placeholder="Value"
            @input="updateResourceValue(index, parseFloat(($event.target as HTMLInputElement).value))"
            >
        </div>
        
        <button
          type="button"
          class="resource-delete-button"
          @click="removeResource(index)"
        >
          削除
        </button>
      </div>
    <button
    type="button"
    @click="addResource"
    >
    Resourceを追加
    </button>
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

/**
 * Update the type of a resource at the specified index.
 * @param {number} index - The index of the resource in the array.
 * @param {number} resourceType - The new resource type (ResourceType).
 */
function updateResourceType(index: number, resourceType: number) {
    if (model.value.resources[index]) {
        model.value.resources[index].resourceType = resourceType as ResourceType;
    }
}

/**
 * Update the value of a resource at the specified index.
 * @param {number} index - The index of the resource in the array.
 * @param {number} value - The new value for the resource.
 */
function updateResourceValue(index: number, value: number) {
    if (model.value.resources[index]) {
        model.value.resources[index].value = value;
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
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 10px;
    align-items: center;
}

.resource-row {
    display: contents;
}

.resource-label {
    padding: 8px;
}

.resource-value {
    display: flex;
}

.resource-value input {
    flex: 1;
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
}

.resource-delete-button {
    padding: 8px 15px;
    background-color: #f44336;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.resource-delete-button:hover {
    opacity: 0.8;
}

.resources-section > button {
    grid-column: 1 / -1;
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
