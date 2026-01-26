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
          <template v-else-if="resource.resourceType === ResourceType.PLAYER_OD_GAUGE">
            プレイヤーのODゲージ
          </template>
          <template v-else-if="resource.resourceType === ResourceType.OPPONENT_OD_GAUGE">
            相手のODゲージ
          </template>
          <template v-else-if="resource.resourceType === ResourceType.PLAYER_SA_GAUGE">
            プレイヤーのSAゲージ
          </template>
          <template v-else-if="resource.resourceType === ResourceType.OPPONENT_SA_GAUGE">
            相手のSAゲージ
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { DynamicState, DynamicState_Resource } from '@nomari/ts-proto';
import { ResourceType } from '@nomari/ts-proto';

const model = defineModel<DynamicState>({ required: true });

fillDefaultResources();

function fillDefaultResources(): void {
    const defaultResources: DynamicState_Resource[] = [
        {
            resourceType: ResourceType.PLAYER_HEALTH,
            value: 10000 
        },
        {
            resourceType: ResourceType.OPPONENT_HEALTH,
            value: 10000 
        },
        {
            resourceType: ResourceType.PLAYER_OD_GAUGE,
            value: 6 
        },
        {
            resourceType: ResourceType.OPPONENT_OD_GAUGE,
            value: 6 
        },
        {
            resourceType: ResourceType.PLAYER_SA_GAUGE,
            value: 0 
        },
        {
            resourceType: ResourceType.OPPONENT_SA_GAUGE,
            value: 0 
        },
    ];
    for (const defResource of defaultResources) {
        if (model.value.resources.some(r => r.resourceType === defResource.resourceType)) {
            continue;
        }
        model.value.resources.push(defResource);
    }
}

/**
     * Update the value of a resource at the specified index.
     * @param {number} index - The index of the resource in the array.
     * @param {number} value - The new value for the resource.
     */
function updateResourceValue(index: number, value: number) {
    if (!model.value.resources[index]) {
        return;
    }
    model.value.resources[index].value = value;
}
</script>

<style scoped>
.initial-dynamic-state-editor {
  padding: 15px;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  background-color: white;
}

.initial-dynamic-state-editor h4 {
  margin-top: 0;
  margin-bottom: 15px;
}

.resources-section {
  display: grid;
  grid-template-columns: max-content auto;
  gap: 10px;
  align-items: center;
}

.resource-row {
  display: contents;
}

.resource-checkbox {
  display: flex;
  padding: 8px;
}

.resource-label {
  padding: 8px;
}

.resource-value {
  display: flex;
  min-width: 0;
}

.resource-value input {
  flex: 1;
  min-width: 0;
  width: 100%;
  padding: 8px;
  border: 1px solid var(--border-input);
  border-radius: 4px;
  box-sizing: border-box;
}

.resources-section>button {
  grid-column: 1 / -1;
  padding: 8px 15px;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

.resources-section>button:hover {
  opacity: 0.8;
}
</style>
