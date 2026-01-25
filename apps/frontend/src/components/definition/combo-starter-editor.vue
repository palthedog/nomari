<template>
  <div class="combo-starter-editor">
    <div class="header-actions">
      <button
        type="button"
        class="delete-btn"
        @click="handleDelete"
      >
        このコンボを削除
      </button>
    </div>

    <!-- Basic Info -->
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
          placeholder="例: 中パン始動"
          variant="outlined"
          hide-details
        />
      </div>
      <div class="form-group">
        <v-text-field
          v-model="model.description"
          label="説明"
          density="compact"
          placeholder="例: 中パンヒット確認からのコンボ"
          variant="outlined"
          hide-details
        />
      </div>
    </div>

    <!-- Combo Routes -->
    <div class="section">
      <h4>コンボルート</h4>
      <div
        v-for="(route, routeIndex) in model.routes"
        :key="routeIndex"
        class="route-section"
      >
        <div class="route-header">
          <v-text-field
            v-model="route.name"
            label="ルート名"
            density="compact"
            placeholder="例: ノーゲージ, OD確認, SA〆"
            variant="outlined"
            hide-details
            class="route-name-input"
          />
          <button
            type="button"
            class="delete-route-btn"
            @click="removeRoute(routeIndex)"
          >
            削除
          </button>
        </div>

        <!-- Requirements (fixed 2 items: OD, SA) -->
        <div class="route-subsection">
          <div class="subsection-header">
            必要ゲージ
          </div>
          <div class="consumption-row">
            <div class="consumption-item">
              <label>OD</label>
              <input
                type="number"
                :value="getRequirementValue(routeIndex, odResourceType)"
                placeholder="0"
                @input="setRequirementValue(routeIndex, odResourceType, parseFloat(($event.target as HTMLInputElement).value) || 0)"
              >
            </div>
            <div class="consumption-item">
              <label>SA</label>
              <input
                type="number"
                :value="getRequirementValue(routeIndex, saResourceType)"
                placeholder="0"
                @input="setRequirementValue(routeIndex, saResourceType, parseFloat(($event.target as HTMLInputElement).value) || 0)"
              >
            </div>
          </div>
        </div>

        <!-- Consumptions (fixed 4 items: damage, OD damage, OD cost, SA cost) -->
        <div class="route-subsection">
          <div class="consumption-row">
            <div class="consumption-item">
              <label>ダメージ</label>
              <input
                type="number"
                :value="getConsumptionValue(routeIndex, damageResourceType)"
                placeholder="0"
                @input="setConsumptionValue(routeIndex, damageResourceType, parseFloat(($event.target as HTMLInputElement).value) || 0)"
              >
            </div>
            <div class="consumption-item">
              <label>Dゲージ削り</label>
              <input
                type="number"
                :value="getConsumptionValue(routeIndex, odDamageResourceType)"
                placeholder="0"
                @input="setConsumptionValue(routeIndex, odDamageResourceType, parseFloat(($event.target as HTMLInputElement).value) || 0)"
              >
            </div>
            <div class="consumption-item">
              <label>OD消費</label>
              <input
                type="number"
                :value="getConsumptionValue(routeIndex, odResourceType)"
                placeholder="0"
                @input="setConsumptionValue(routeIndex, odResourceType, parseFloat(($event.target as HTMLInputElement).value) || 0)"
              >
            </div>
            <div class="consumption-item">
              <label>SA消費</label>
              <input
                type="number"
                :value="getConsumptionValue(routeIndex, saResourceType)"
                placeholder="0"
                @input="setConsumptionValue(routeIndex, saResourceType, parseFloat(($event.target as HTMLInputElement).value) || 0)"
              >
            </div>
          </div>
        </div>

        <!-- Next Situation -->
        <div class="route-subsection">
          <div class="subsection-header">
            遷移先
          </div>
          <v-select
            :model-value="route.nextSituationId"
            :items="nextSituationItems"
            item-title="title"
            item-value="value"
            density="compact"
            variant="outlined"
            hide-details
            @update:model-value="(value: number) => updateNextSituation(routeIndex, value)"
          />
        </div>
      </div>

      <button
        type="button"
        @click="addRoute"
      >
        ルートを追加
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type {
    ComboStarter,
    Situation,
    TerminalSituation,
} from '@nomari/ts-proto';
import { ResourceType } from '@nomari/ts-proto';

const model = defineModel<ComboStarter>({
    required: true 
});

const props = defineProps<{
    availableSituations: Situation[];
    availableTerminalSituations: TerminalSituation[];
    isPlayerCombo: boolean;
}>();

const emit = defineEmits<{
    (e: 'delete'): void;
}>();

// Fixed resource types for requirements and consumptions
const damageResourceType = computed(() =>
    props.isPlayerCombo ? ResourceType.OPPONENT_HEALTH : ResourceType.PLAYER_HEALTH
);

// OD damage: reduces opponent's OD gauge
const odDamageResourceType = computed(() =>
    props.isPlayerCombo ? ResourceType.OPPONENT_OD_GAUGE : ResourceType.PLAYER_OD_GAUGE
);

// OD cost: consumes own OD gauge
const odResourceType = computed(() =>
    props.isPlayerCombo ? ResourceType.PLAYER_OD_GAUGE : ResourceType.OPPONENT_OD_GAUGE
);

const saResourceType = computed(() =>
    props.isPlayerCombo ? ResourceType.PLAYER_SA_GAUGE : ResourceType.OPPONENT_SA_GAUGE
);

// Get consumption value for a specific resource type
function getConsumptionValue(routeIndex: number, resourceType: ResourceType): number {
    const route = model.value.routes[routeIndex];
    if (!route.consumptions) {
        return 0;
    }
    const consumption = route.consumptions.find(c => c.resourceType === resourceType);
    return consumption?.value ?? 0;
}

// Set consumption value for a specific resource type
function setConsumptionValue(routeIndex: number, resourceType: ResourceType, value: number): void {
    const route = model.value.routes[routeIndex];
    if (!route.consumptions) {
        route.consumptions = [];
    }

    const existingIndex = route.consumptions.findIndex(c => c.resourceType === resourceType);

    if (value === 0) {
        // Remove if value is 0
        if (existingIndex !== -1) {
            route.consumptions.splice(existingIndex, 1);
        }
    } else if (existingIndex !== -1) {
        // Update existing
        route.consumptions[existingIndex].value = value;
    } else {
        // Add new
        route.consumptions.push({
            resourceType,
            value 
        });
    }
}

// Get requirement value for a specific resource type
function getRequirementValue(routeIndex: number, resourceType: ResourceType): number {
    const route = model.value.routes[routeIndex];
    if (!route.requirements) {
        return 0;
    }
    const requirement = route.requirements.find(r => r.resourceType === resourceType);
    return requirement?.value ?? 0;
}

// Set requirement value for a specific resource type
function setRequirementValue(routeIndex: number, resourceType: ResourceType, value: number): void {
    const route = model.value.routes[routeIndex];
    if (!route.requirements) {
        route.requirements = [];
    }

    const existingIndex = route.requirements.findIndex(r => r.resourceType === resourceType);

    if (value === 0) {
        // Remove if value is 0
        if (existingIndex !== -1) {
            route.requirements.splice(existingIndex, 1);
        }
    } else if (existingIndex !== -1) {
        // Update existing
        route.requirements[existingIndex].value = value;
    } else {
        // Add new
        route.requirements.push({
            resourceType,
            value 
        });
    }
}

const nextSituationItems = computed(() => {
    const items: Array<{ title: string;
        value: number }> = [
        {
            title: '次の状況を選択してください',
            value: 0 
        },
    ];

    if (props.availableSituations.length > 0) {
        items.push(...props.availableSituations.map((s) => ({
            title: `${s.name || '(説明なし)'}`,
            value: s.situationId,
        })));
    }

    if (props.availableTerminalSituations.length > 0) {
        items.push(...props.availableTerminalSituations.map((t) => ({
            title: `${t.name || '(名前なし)'}`,
            value: t.situationId,
        })));
    }

    return items;
});

function addRoute() {
    model.value.routes.push({
        name: '',
        requirements: [],
        consumptions: [],
        nextSituationId: 0,
    });
}

function removeRoute(index: number) {
    model.value.routes.splice(index, 1);
}

function updateNextSituation(routeIndex: number, value: number) {
    model.value.routes[routeIndex].nextSituationId = value;
}

function handleDelete() {
    emit('delete');
}
</script>

<style scoped>
.combo-starter-editor {
  padding: 20px;
}

.header-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.delete-btn {
  padding: 8px 16px;
  background-color: var(--color-error);
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

.route-section {
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  padding: 15px;
  margin-bottom: 15px;
  background-color: var(--bg-secondary);
}

.route-header {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-primary);
}

.route-name-input {
  flex: 1;
}

.delete-route-btn {
  padding: 8px 16px;
  background-color: var(--color-error);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
}

.route-subsection {
  margin-bottom: 15px;
  padding: 10px;
  background-color: var(--bg-tertiary);
  border-radius: 4px;
}

.subsection-header {
  font-weight: bold;
  font-size: 12px;
  margin-bottom: 10px;
  color: var(--text-secondary);
}

.resource-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.resource-select {
  flex: 2;
}

.resource-row input {
  flex: 1;
  padding: 8px;
  border: 1px solid var(--border-input);
  border-radius: 4px;
}

.delete-row-btn {
  padding: 6px 12px;
  background-color: var(--color-error);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

.add-row-btn {
  padding: 6px 12px;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  margin-top: 5px;
}

.consumption-row {
  display: flex;
  gap: 12px;
}

.consumption-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.consumption-item label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.consumption-item input {
  padding: 8px;
  border: 1px solid var(--border-input);
  border-radius: 4px;
  width: 100%;
  box-sizing: border-box;
}

button {
  padding: 8px 15px;
  background-color: var(--color-primary);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 10px;
}

button:hover {
  opacity: 0.8;
}
</style>
