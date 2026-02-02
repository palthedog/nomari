<template>
  <div
    class="combo-starter-editor"
    :class="{ 'player-combo': props.isPlayerCombo, 'opponent-combo': !props.isPlayerCombo }"
  >
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
      <div class="form-group">
        <v-select
          v-model="model.starterActionId"
          :items="starterActionItems"
          item-title="title"
          item-value="value"
          label="始動技"
          density="compact"
          variant="outlined"
          hide-details
          placeholder="遷移テーブルで優先表示"
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
          <CircleDeleteButton
            title="ルートを削除"
            @click="removeRoute(routeIndex)"
          />
        </div>

        <!-- Consumptions (fixed 4 items: damage, OD damage, OD cost, SA cost) -->
        <div class="route-subsection">
          <div class="consumption-row">
            <v-number-input
              type="number"
              label="ダメージ"
              :model-value="getConsumptionValue(routeIndex, damageResourceType)"
              placeholder="0"
              density="compact"
              variant="outlined"
              hide-details
              :step="100"
              :min="0"
              :max="10000"
              @update:model-value="setConsumptionValue(routeIndex, damageResourceType, $event)"
            />
            <v-number-input
              type="number"
              label="Dゲージ削り"
              :model-value="getConsumptionValue(routeIndex, odDamageResourceType)"
              placeholder="0"
              density="compact"
              variant="outlined"
              hide-details
              :step="0.1"
              :min="0"
              :max="6"
              @update:model-value="setConsumptionValue(routeIndex, odDamageResourceType, $event)"
            />
            <v-number-input
              type="number"
              label="OD消費"
              :model-value="getConsumptionValue(routeIndex, odResourceType)"
              placeholder="0"
              density="compact"
              variant="outlined"
              hide-details
              :step="1"
              :min="0"
              :max="6"
              @update:model-value="setConsumptionValue(routeIndex, odResourceType, $event)"
            />
            <v-number-input
              type="number"
              label="SA消費"
              :model-value="getConsumptionValue(routeIndex, saResourceType)"
              placeholder="0"
              density="compact"
              variant="outlined"
              hide-details
              :step="1"
              :min="0"
              :max="3"
              @update:model-value="setConsumptionValue(routeIndex, saResourceType, $event)"
            />
          </div>
        </div>

        <!-- Requirements (fixed 2 items: OD, SA) -->
        <div class="route-subsection">
          <div class="requirement-row">
            <div class="requirement-checkbox-wrapper">
              <v-checkbox
                :model-value="getOverrideFlag(routeIndex, odResourceType) && getOverrideFlag(routeIndex, saResourceType)"
                density="compact"
                hide-details
                label="上書き"
                class="override-checkbox"
                @update:model-value="(value: boolean | null) => {
                  const boolValue = value ?? false;
                  setOverrideFlag(routeIndex, odResourceType, boolValue);
                  setOverrideFlag(routeIndex, saResourceType, boolValue);
                }"
              />
            </div>
            <div class="requirement-field">
              <v-number-input
                type="number"
                label="必要OD"
                :model-value="getEffectiveRequirementValue(routeIndex, odResourceType)"
                placeholder="0"
                density="compact"
                variant="outlined"
                hide-details
                :step="0.1"
                :min="0"
                :max="6"
                :disabled="!getOverrideFlag(routeIndex, odResourceType)"
                @update:model-value="setRequirementValue(routeIndex, odResourceType, $event)"
              />
            </div>
            <div class="requirement-field">
              <v-number-input
                type="number"
                label="必要SA"
                :model-value="getEffectiveRequirementValue(routeIndex, saResourceType)"
                placeholder="0"
                density="compact"
                variant="outlined"
                :step="1"
                :min="0"
                :max="3"
                hide-details
                :disabled="!getOverrideFlag(routeIndex, saResourceType)"
                @update:model-value="setRequirementValue(routeIndex, saResourceType, $event)"
              />
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
import { computed, ref, onMounted, watch } from 'vue';
import type {
    Action,
    ComboStarter,
    Situation,
    TerminalSituation,
} from '@nomari/ts-proto';
import { ResourceType } from '@nomari/ts-proto';
import CircleDeleteButton from '@/components/common/circle-delete-button.vue';

const model = defineModel<ComboStarter>({
    required: true 
});

const props = defineProps<{
    availableSituations: Situation[];
    availableTerminalSituations: TerminalSituation[];
    availableActions: Action[];
    isPlayerCombo: boolean;
}>();

// Starter action dropdown items
const starterActionItems = computed(() => {
    const items: Array<{
        title: string;
        value: string;
    }> = [
        {
            title: '(指定なし)',
            value: ''
        },
    ];
    items.push(...props.availableActions.map(a => ({
        title: a.name || `Action ${a.actionId}`,
        value: String(a.actionId),
    })));
    return items;
});

// Override flags for requirements (routeIndex -> { od: boolean, sa: boolean })
const requirementOverrides = ref<Map<number, {
    od: boolean;
    sa: boolean;
}>>(new Map());

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
    
    // Auto-sync requirement if override is false
    const override = requirementOverrides.value.get(routeIndex);
    if (override) {
        const isOD = resourceType === odResourceType.value;
        const isSA = resourceType === saResourceType.value;
        
        if (isOD && !override.od) {
            setRequirementValue(routeIndex, odResourceType.value, value);
        }
        if (isSA && !override.sa) {
            setRequirementValue(routeIndex, saResourceType.value, value);
        }
    } else {
        // If no override flag exists, auto-sync both
        if (resourceType === odResourceType.value) {
            setRequirementValue(routeIndex, odResourceType.value, value);
        }
        if (resourceType === saResourceType.value) {
            setRequirementValue(routeIndex, saResourceType.value, value);
        }
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

// Get effective requirement value (consumption value if override is false, requirement value if true)
function getEffectiveRequirementValue(routeIndex: number, resourceType: ResourceType): number {
    const override = requirementOverrides.value.get(routeIndex);
    if (!override) {
        // If no override flag exists, use consumption value
        return getConsumptionValue(routeIndex, resourceType);
    }
    
    const isOD = resourceType === odResourceType.value;
    const isSA = resourceType === saResourceType.value;
    
    if (isOD && !override.od) {
        return getConsumptionValue(routeIndex, resourceType);
    }
    if (isSA && !override.sa) {
        return getConsumptionValue(routeIndex, resourceType);
    }
    
    return getRequirementValue(routeIndex, resourceType);
}

// Check if requirements match consumptions for a route
// Returns false (auto-sync) if they match, true (override) if they don't match
function checkRequirementsMatchConsumptions(routeIndex: number): {
    od: boolean;
    sa: boolean;
} {
    const odConsumption = getConsumptionValue(routeIndex, odResourceType.value);
    const saConsumption = getConsumptionValue(routeIndex, saResourceType.value);
    const odRequirement = getRequirementValue(routeIndex, odResourceType.value);
    const saRequirement = getRequirementValue(routeIndex, saResourceType.value);
    
    return {
        od: odConsumption !== odRequirement,
        sa: saConsumption !== saRequirement,
    };
}

// Initialize override flags for all routes
function initializeOverrideFlags(): void {
    requirementOverrides.value.clear();
    model.value.routes.forEach((_, index) => {
        const matches = checkRequirementsMatchConsumptions(index);
        requirementOverrides.value.set(index, matches);
    });
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
    const newIndex = model.value.routes.length;
    model.value.routes.push({
        name: '',
        requirements: [],
        consumptions: [],
        nextSituationId: 0,
    });
    // Initialize override flags for new route (default: false, meaning auto-sync)
    requirementOverrides.value.set(newIndex, {
        od: false,
        sa: false,
    });
}

function removeRoute(index: number) {
    model.value.routes.splice(index, 1);
    // Remove override flags for deleted route and reindex
    requirementOverrides.value.delete(index);
    // Reindex remaining routes
    const newMap = new Map<number, {
        od: boolean;
        sa: boolean;
    }>();
    requirementOverrides.value.forEach((value, key) => {
        if (key > index) {
            newMap.set(key - 1, value);
        } else if (key < index) {
            newMap.set(key, value);
        }
    });
    requirementOverrides.value = newMap;
}

function updateNextSituation(routeIndex: number, value: number) {
    model.value.routes[routeIndex].nextSituationId = value;
}

// Get override flag for a specific resource type
function getOverrideFlag(routeIndex: number, resourceType: ResourceType): boolean {
    const override = requirementOverrides.value.get(routeIndex);
    if (!override) {
        return false;
    }
    const isOD = resourceType === odResourceType.value;
    const isSA = resourceType === saResourceType.value;
    if (isOD) {
        return override.od;
    }
    if (isSA) {
        return override.sa;
    }
    return false;
}

// Set override flag for a specific resource type
function setOverrideFlag(routeIndex: number, resourceType: ResourceType, value: boolean): void {
    const current = requirementOverrides.value.get(routeIndex) || {
        od: false,
        sa: false,
    };
    const isOD = resourceType === odResourceType.value;
    const isSA = resourceType === saResourceType.value;
    
    if (isOD) {
        current.od = value;
        // When enabling override, copy current consumption value to requirement
        if (value) {
            const consumptionValue = getConsumptionValue(routeIndex, odResourceType.value);
            setRequirementValue(routeIndex, odResourceType.value, consumptionValue);
        }
    }
    if (isSA) {
        current.sa = value;
        // When enabling override, copy current consumption value to requirement
        if (value) {
            const consumptionValue = getConsumptionValue(routeIndex, saResourceType.value);
            setRequirementValue(routeIndex, saResourceType.value, consumptionValue);
        }
    }
    
    requirementOverrides.value.set(routeIndex, current);
}

// Initialize on mount
onMounted(() => {
    initializeOverrideFlags();
});

// Watch for route changes and reinitialize
watch(() => model.value.routes.length, () => {
    initializeOverrideFlags();
});
</script>

<style scoped>
.combo-starter-editor {
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

.player-combo .section {
  border-left: 4px solid var(--player-color);
}

.player-combo .section h4 {
  color: var(--player-color-dark);
}

.opponent-combo .section {
  border-left: 4px solid var(--opponent-color);
}

.opponent-combo .section h4 {
  color: var(--opponent-color-dark);
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

.requirement-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.requirement-checkbox-wrapper {
  flex: 2;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.requirement-field {
  flex: 1;
}

.requirement-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.override-checkbox {
  flex-shrink: 0;
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
