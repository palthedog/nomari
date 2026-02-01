<template>
  <div class="situation-editor">
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
          label="状況名"
          density="compact"
          placeholder="例: 密着+4F"
          variant="outlined"
          hide-details
        />
      </div>
    </div>

    <!-- Player Actions -->
    <ActionSelector
      v-model="model.playerActionIds"
      :actions="props.playerActions"
      title="プレイヤー選択肢"
      variant="player"
      @edit="viewStore.selectActionLibrary('player')"
      @update:model-value="updateTransitions"
    />

    <!-- Opponent Actions -->
    <ActionSelector
      v-model="model.opponentActionIds"
      :actions="props.opponentActions"
      title="相手選択肢"
      variant="opponent"
      @edit="viewStore.selectActionLibrary('opponent')"
      @update:model-value="updateTransitions"
    />

    <!-- Transition Table -->
    <div
      v-if="selectedPlayerActions.length > 0 && selectedOpponentActions.length > 0"
      class="section"
    >
      <h4>遷移テーブル</h4>
      <!-- Matrix view for transitions -->
      <div class="transition-matrix">
        <table>
          <thead>
            <tr>
              <th class="corner-cell">
                <div class="axis-indicator">
                  <span class="axis-player">P</span>
                  <span class="axis-divider">/</span>
                  <span class="axis-opponent">O</span>
                </div>
              </th>
              <th
                v-for="oppAction in selectedOpponentActions"
                :key="oppAction.actionId"
                class="opponent-header"
              >
                {{ oppAction.name || '?' }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="playerAction in selectedPlayerActions"
              :key="playerAction.actionId"
            >
              <th class="player-header">
                {{ playerAction.name || '?' }}
              </th>
              <td
                v-for="oppAction in selectedOpponentActions"
                :key="oppAction.actionId"
                class="transition-cell"
              >
                <v-select
                  :model-value="getTransition(playerAction.actionId, oppAction.actionId)?.nextSituationId || 0"
                  :items="nextSituationItems"
                  item-title="title"
                  item-value="value"
                  density="compact"
                  variant="outlined"
                  hide-details
                  class="transition-select"
                  @update:model-value="(value: number) => updateNextSituationId(playerAction.actionId, oppAction.actionId, value)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type {
    Situation,
    Transition,
    TerminalSituation,
    Action,
} from '@nomari/ts-proto';
import ActionSelector from './action-selector.vue';
import { useViewStore } from '@/stores/view-store';

const model = defineModel<Situation>({
    required: true
});

const viewStore = useViewStore();

const props = defineProps<{
    availableSituations: Situation[];
    availableTerminalSituations: TerminalSituation[];
    playerActions: Action[];
    opponentActions: Action[];
}>();

// Get selected actions by ID
const selectedPlayerActions = computed(() =>
    (model.value.playerActionIds || [])
        .map(id => props.playerActions.find(a => a.actionId === id))
        .filter((a): a is Action => a !== undefined)
);

const selectedOpponentActions = computed(() =>
    (model.value.opponentActionIds || [])
        .map(id => props.opponentActions.find(a => a.actionId === id))
        .filter((a): a is Action => a !== undefined)
);

type SelectItem = { title: string;
    value: number } | { type: 'subheader';
        title: string };

const nextSituationItems = computed(() => {
    const items: SelectItem[] = [
        {
            title: '次の状況を選択してください',
            value: 0
        },
    ];

    // Filter and categorize available situations
    const regularSituations = props.availableSituations.filter(
        (s) => !s.name?.startsWith('[コンボ]') && !s.name?.startsWith('[相手コンボ]')
    );
    const playerCombos = props.availableSituations.filter(
        (s) => s.name?.startsWith('[コンボ]')
    );
    const opponentCombos = props.availableSituations.filter(
        (s) => s.name?.startsWith('[相手コンボ]')
    );

    if (regularSituations.length > 0) {
        items.push({
            type: 'subheader',
            title: '── 状況 ──'
        });
        items.push(...regularSituations.map((s) => ({
            title: s.name || '(名前なし)',
            value: s.situationId,
        })));
    }

    if (playerCombos.length > 0) {
        items.push({
            type: 'subheader',
            title: '── プレイヤーコンボ ──'
        });
        items.push(...playerCombos.map((s) => ({
            title: s.name?.replace('[コンボ] ', '') || '(名前なし)',
            value: s.situationId,
        })));
    }

    if (opponentCombos.length > 0) {
        items.push({
            type: 'subheader',
            title: '── 相手コンボ ──'
        });
        items.push(...opponentCombos.map((s) => ({
            title: s.name?.replace('[相手コンボ] ', '') || '(名前なし)',
            value: s.situationId,
        })));
    }

    if (props.availableTerminalSituations.length > 0) {
        items.push({
            type: 'subheader',
            title: '── 最終状況 ──'
        });
        items.push(...props.availableTerminalSituations.map((t) => ({
            title: t.name || '(名前なし)',
            value: t.situationId,
        })));
    }

    return items;
});

function updateTransitions() {
    const existingTransitions = new Map<string, Transition>();
    model.value.transitions.forEach((t) => {
        existingTransitions.set(`${t.playerActionId}-${t.opponentActionId}`, t);
    });

    const newTransitions: Transition[] = [];
    for (const playerActionId of model.value.playerActionIds || []) {
        for (const oppActionId of model.value.opponentActionIds || []) {
            const key = `${playerActionId}-${oppActionId}`;
            const existing = existingTransitions.get(key);
            if (existing) {
                newTransitions.push(existing);
            } else {
                newTransitions.push({
                    playerActionId: playerActionId,
                    opponentActionId: oppActionId,
                    nextSituationId: 0,
                });
            }
        }
    }
    model.value.transitions = newTransitions;
}

function getTransition(
    playerActionId: number,
    opponentActionId: number
): Transition | undefined {
    return model.value.transitions.find(
        (t) => t.playerActionId === playerActionId && t.opponentActionId === opponentActionId
    );
}

function updateNextSituationId(
    playerActionId: number,
    opponentActionId: number,
    nextSituationId: number
) {
    const transition = getTransition(playerActionId, opponentActionId);
    if (transition) {
        transition.nextSituationId = nextSituationId;
    }
}
</script>

<style scoped>
.situation-editor {
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

.transition-matrix {
  overflow-x: auto;
  margin-top: 15px;
}

.transition-matrix table {
  border-collapse: collapse;
  width: 100%;
  min-width: max-content;
}

.transition-matrix th,
.transition-matrix td {
  border: 1px solid var(--border-primary);
  padding: 8px;
  text-align: center;
  vertical-align: top;
}

.transition-matrix .corner-cell {
  background-color: var(--bg-secondary);
  padding: 8px;
  min-width: 60px;
  vertical-align: middle;
}

.transition-matrix .axis-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 700;
}

.transition-matrix .axis-player {
  color: var(--player-color);
}

.transition-matrix .axis-divider {
  color: var(--text-tertiary);
  font-weight: 400;
}

.transition-matrix .axis-opponent {
  color: var(--opponent-color);
}

.transition-matrix .player-header {
  background-color: transparent;
  border-left: 4px solid var(--player-color);
  color: var(--text-primary);
  font-weight: 600;
  text-align: right;
  padding: 10px 12px 10px 8px;
  min-width: 80px;
  font-size: 13px;
  letter-spacing: 0.02em;
}

.transition-matrix .opponent-header {
  background-color: transparent;
  border-top: 3px solid var(--opponent-color);
  color: var(--text-primary);
  font-weight: 600;
  text-align: center;
  padding: 10px 12px;
  min-width: 120px;
  font-size: 13px;
}

.transition-matrix tbody tr:nth-child(even) {
  background-color: var(--bg-secondary);
}

.transition-matrix tbody tr:hover {
  background-color: var(--bg-tertiary);
}

.transition-matrix .transition-cell {
  min-width: 120px;
  padding: 4px;
}

.transition-matrix .transition-select {
  margin-bottom: 4px;
}

.transition-matrix .transition-select :deep(.v-field__input) {
  font-size: 11px;
  padding: 4px 8px;
  min-height: 28px;
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
