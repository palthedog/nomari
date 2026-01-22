<template>
  <div class="reward-computation-method-editor">
    <h4>報酬計算方法</h4>

    <div class="method-selection">
      <label class="radio-option">
        <input
          type="radio"
          value="damageRace"
          :checked="selectedMethod === 'damageRace'"
          @change="selectMethod('damageRace')"
        >
        <span>ダメージレース</span>
      </label>
      <label class="radio-option">
        <input
          type="radio"
          value="winProbability"
          :checked="selectedMethod === 'winProbability'"
          @change="selectMethod('winProbability')"
        >
        <span>勝率ベース</span>
      </label>
    </div>

    <!-- Description for Damage Race -->
    <div
      v-if="selectedMethod === 'damageRace'"
      class="damage-race-settings"
    >
      <div class="help-text">
        与えたダメージ - 受けたダメージ をそのまま報酬として使用します。
      </div>
    </div>

    <!-- Description for Win Probability -->
    <div
      v-if="selectedMethod === 'winProbability'"
      class="win-probability-settings"
    >
      <div class="form-group">
        <label for="corner-penalty">画面端 ペナルティ:</label>
        <input
          id="corner-penalty"
          type="number"
          min="0"
          max="10000"
          step="100"
          :value="cornerPenalty"
          @input="updateCornerPenalty(parseFloat(($event.target as HTMLInputElement).value))"
        >
        <div class="help-text">
          画面端にいる場合のHP値としてのペナルティ。例: 2000 は HP2000分の不利を意味します。
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import type { RewardComputationMethod } from '@nomari/ts-proto';

const model = defineModel<RewardComputationMethod | undefined>({ required: false });

// Initialize with win probability if not set
onMounted(() => {
    if (!model.value || !model.value.method.oneofKind) {
        model.value = {
            method: {
                oneofKind: 'damageRace',
                damageRace: {}
            },
        };
    }
});

type MethodType = 'winProbability' | 'damageRace';

const selectedMethod = computed<MethodType>(() => {
    if (!model.value || !model.value.method.oneofKind) {
        return 'damageRace'; // Default to damage race
    }
    if (model.value.method.oneofKind === 'damageRace') {
        return 'damageRace';
    }
    if (model.value.method.oneofKind === 'winProbability') {
        return 'winProbability';
    }
    return 'damageRace'; // Default to damage race
});

const cornerPenalty = computed(() => {
    if (selectedMethod.value === 'winProbability' && model.value?.method.oneofKind === 'winProbability') {
        return model.value.method.winProbability.cornerPenalty || 2000;
    }
    return 2000;
});

function selectMethod(method: MethodType) {
    if (method === 'damageRace') {
        model.value = {
            method: {
                oneofKind: 'damageRace',
                damageRace: {},
            },
        };
    } else if (method === 'winProbability') {
        model.value = {
            method: {
                oneofKind: 'winProbability',
                winProbability: {
                    cornerPenalty: cornerPenalty.value,
                },
            },
        };
    }
}

function updateCornerPenalty(value: number) {
    if (selectedMethod.value === 'winProbability') {
        if (!model.value) {
            model.value = {
                method: {
                    oneofKind: 'winProbability',
                    winProbability: {
                        cornerPenalty: value,
                    },
                },
            };
        } else if (model.value.method.oneofKind === 'winProbability') {
            model.value.method.winProbability.cornerPenalty = value;
        }
    }
}
</script>

<style scoped>
.reward-computation-method-editor {
    padding: 15px;
    border: 1px solid var(--border-primary);
    border-radius: 4px;
    background-color: white;
}

.reward-computation-method-editor h4 {
    margin-top: 0;
    margin-bottom: 15px;
}

.method-selection {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 15px;
}

.radio-option {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 8px;
    border-radius: 4px;
    transition: background-color 0.2s;
}

.radio-option:hover {
    background-color: var(--bg-quaternary);
}

.radio-option input[type="radio"] {
    cursor: pointer;
}

.win-probability-settings,
.damage-race-settings {
    margin-top: 15px;
    padding: 15px;
    background-color: var(--bg-tertiary);
    border-radius: 4px;
}

.form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.form-group label {
    font-weight: 500;
}

.form-group input[type="number"] {
    padding: 8px;
    border: 1px solid var(--border-input);
    border-radius: 4px;
    width: 100%;
    max-width: 200px;
}

.help-text {
    font-size: 12px;
    color: var(--text-secondary);
    margin-top: 4px;
}
</style>
