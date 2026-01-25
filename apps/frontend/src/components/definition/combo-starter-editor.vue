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

        <!-- Requirements -->
        <div class="route-subsection">
          <div class="subsection-header">
            必要ゲージ
          </div>
          <div
            v-for="(req, reqIndex) in route.requirements"
            :key="reqIndex"
            class="resource-row"
          >
            <v-select
              :model-value="req.resourceType"
              :items="gaugeTypeItems"
              item-title="title"
              item-value="value"
              density="compact"
              variant="outlined"
              hide-details
              class="resource-select"
              @update:model-value="(value: number) => updateRequirement(routeIndex, reqIndex, 'type', value)"
            />
            <input
              type="number"
              :value="req.value"
              placeholder="必要量"
              @input="updateRequirement(routeIndex, reqIndex, 'value', parseFloat(($event.target as HTMLInputElement).value) || 0)"
            >
            <button
              type="button"
              class="delete-row-btn"
              @click="removeRequirement(routeIndex, reqIndex)"
            >
              削除
            </button>
          </div>
          <button
            type="button"
            class="add-row-btn"
            @click="addRequirement(routeIndex)"
          >
            必要ゲージを追加
          </button>
        </div>

        <!-- Consumptions -->
        <div class="route-subsection">
          <div class="subsection-header">
            消費リソース
          </div>
          <div
            v-for="(cons, consIndex) in route.consumptions"
            :key="consIndex"
            class="resource-row"
          >
            <v-select
              :model-value="cons.resourceType"
              :items="consumptionTypeItems"
              item-title="title"
              item-value="value"
              density="compact"
              variant="outlined"
              hide-details
              class="resource-select"
              @update:model-value="(value: number) => updateConsumption(routeIndex, consIndex, 'type', value)"
            />
            <input
              type="number"
              :value="cons.value"
              placeholder="消費量"
              @input="updateConsumption(routeIndex, consIndex, 'value', parseFloat(($event.target as HTMLInputElement).value) || 0)"
            >
            <button
              type="button"
              class="delete-row-btn"
              @click="removeConsumption(routeIndex, consIndex)"
            >
              削除
            </button>
          </div>
          <button
            type="button"
            class="add-row-btn"
            @click="addConsumption(routeIndex)"
          >
            消費リソースを追加
          </button>
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

    const model = defineModel<ComboStarter>({ required: true });

    const props = defineProps<{
        availableSituations: Situation[];
        availableTerminalSituations: TerminalSituation[];
        isPlayerCombo: boolean;
    }>();

    const emit = defineEmits<{
        (e: 'delete'): void;
    }>();

    // Gauge types for requirements
    const gaugeTypeItems = computed(() => {
        if (props.isPlayerCombo) {
            return [
                { title: 'プレイヤーODゲージ', value: ResourceType.PLAYER_OD_GAUGE },
                { title: 'プレイヤーSAゲージ', value: ResourceType.PLAYER_SA_GAUGE },
            ];
        } else {
            return [
                { title: '相手ODゲージ', value: ResourceType.OPPONENT_OD_GAUGE },
                { title: '相手SAゲージ', value: ResourceType.OPPONENT_SA_GAUGE },
            ];
        }
    });

    // Resource types for consumptions (damage and gauge)
    const consumptionTypeItems = computed(() => {
        if (props.isPlayerCombo) {
            // Player combo: damage to opponent, consume player's gauge
            return [
                { title: '相手へのダメージ', value: ResourceType.OPPONENT_HEALTH },
                { title: 'プレイヤーODゲージ消費', value: ResourceType.PLAYER_OD_GAUGE },
                { title: 'プレイヤーSAゲージ消費', value: ResourceType.PLAYER_SA_GAUGE },
            ];
        } else {
            // Opponent combo: damage to player, consume opponent's gauge
            return [
                { title: 'プレイヤーへのダメージ', value: ResourceType.PLAYER_HEALTH },
                { title: '相手ODゲージ消費', value: ResourceType.OPPONENT_OD_GAUGE },
                { title: '相手SAゲージ消費', value: ResourceType.OPPONENT_SA_GAUGE },
            ];
        }
    });

    const nextSituationItems = computed(() => {
        const items: Array<{ title: string; value: number }> = [
            { title: '次の状況を選択してください', value: 0 },
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

    function addRequirement(routeIndex: number) {
        const route = model.value.routes[routeIndex];
        if (!route.requirements) {
            route.requirements = [];
        }
        const defaultType = props.isPlayerCombo
            ? ResourceType.PLAYER_OD_GAUGE
            : ResourceType.OPPONENT_OD_GAUGE;
        route.requirements.push({
            resourceType: defaultType,
            value: 2000,
        });
    }

    function removeRequirement(routeIndex: number, reqIndex: number) {
        const route = model.value.routes[routeIndex];
        if (route.requirements) {
            route.requirements.splice(reqIndex, 1);
        }
    }

    function updateRequirement(
        routeIndex: number,
        reqIndex: number,
        field: 'type' | 'value',
        value: number
    ) {
        const route = model.value.routes[routeIndex];
        if (route.requirements && route.requirements[reqIndex]) {
            if (field === 'type') {
                route.requirements[reqIndex].resourceType = value as ResourceType;
            } else {
                route.requirements[reqIndex].value = value;
            }
        }
    }

    function addConsumption(routeIndex: number) {
        const route = model.value.routes[routeIndex];
        if (!route.consumptions) {
            route.consumptions = [];
        }
        const defaultType = props.isPlayerCombo
            ? ResourceType.OPPONENT_HEALTH
            : ResourceType.PLAYER_HEALTH;
        route.consumptions.push({
            resourceType: defaultType,
            value: 1000,
        });
    }

    function removeConsumption(routeIndex: number, consIndex: number) {
        const route = model.value.routes[routeIndex];
        if (route.consumptions) {
            route.consumptions.splice(consIndex, 1);
        }
    }

    function updateConsumption(
        routeIndex: number,
        consIndex: number,
        field: 'type' | 'value',
        value: number
    ) {
        const route = model.value.routes[routeIndex];
        if (route.consumptions && route.consumptions[consIndex]) {
            if (field === 'type') {
                route.consumptions[consIndex].resourceType = value as ResourceType;
            } else {
                route.consumptions[consIndex].value = value;
            }
        }
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
