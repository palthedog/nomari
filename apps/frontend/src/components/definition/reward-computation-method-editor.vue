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
      <div class="help-text method-description">
        後何回コンボを決めれば相手を倒せるかを推定し、そこから勝率を計算します。<br>
        推定勝率 = 相手を倒すターン数 / (自分のターン数 + 相手のターン数)<br>
        ターン数が少ないほど有利。
      </div>

      <div class="form-group">
        <label for="corner-bonus">画面端 ボーナス:</label>
        <input
          id="corner-bonus"
          type="number"
          min="0"
          max="10000"
          step="100"
          :value="cornerBonus"
          @input="updateCornerBonus(parseFloat(($event.target as HTMLInputElement).value))"
        >
        <div class="help-text">
          相手が画面端にいる場合のコンボダメージボーナス。例: 500 は通常コンボ+500ダメージを意味します。
        </div>
      </div>

      <div class="form-group">
        <label for="od-gauge-bonus">ODゲージ ボーナス:</label>
        <input
          id="od-gauge-bonus"
          type="number"
          min="0"
          step="100"
          :value="odGaugeBonus"
          @input="updateOdGaugeBonus(parseFloat(($event.target as HTMLInputElement).value))"
        >
        <div class="help-text">
          ODゲージ1ポイントあたりのリーサルコンボダメージボーナス。自分のOD × ボーナス がダメージに加算されます。0で無効。
        </div>
      </div>

      <div class="form-group">
        <label for="sa-gauge-bonus">SAゲージ ボーナス:</label>
        <input
          id="sa-gauge-bonus"
          type="number"
          min="0"
          step="100"
          :value="saGaugeBonus"
          @input="updateSaGaugeBonus(parseFloat(($event.target as HTMLInputElement).value))"
        >
        <div class="help-text">
          SAゲージ1ポイントあたりのリーサルコンボダメージボーナス。自分のSA × ボーナス がダメージに加算されます。0で無効。
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import type { RewardComputationMethod } from '@nomari/ts-proto';

const model = defineModel<RewardComputationMethod | undefined>({
    required: false 
});

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

const cornerBonus = computed(() => {
    if (selectedMethod.value === 'winProbability' && model.value?.method.oneofKind === 'winProbability') {
        return model.value.method.winProbability.cornerBonus || 1000;
    }
    return 1000;
});

const odGaugeBonus = computed(() => {
    if (selectedMethod.value === 'winProbability' && model.value?.method.oneofKind === 'winProbability') {
        return model.value.method.winProbability.odGaugeBonus ?? 0;
    }
    return 0;
});

const saGaugeBonus = computed(() => {
    if (selectedMethod.value === 'winProbability' && model.value?.method.oneofKind === 'winProbability') {
        return model.value.method.winProbability.saGaugeBonus ?? 0;
    }
    return 0;
});

function selectMethod(method: MethodType) {
    if (method === 'damageRace') {
        model.value = {
            method: {
                oneofKind: 'damageRace',
                damageRace: {},
            },
        };
        return;
    }
    
    model.value = {
        method: {
            oneofKind: 'winProbability',
            winProbability: {
                cornerBonus: cornerBonus.value,
                odGaugeBonus: odGaugeBonus.value,
                saGaugeBonus: saGaugeBonus.value,
            },
        },
    };
}

function updateCornerBonus(value: number) {
    if (selectedMethod.value !== 'winProbability') {
        return;
    }
    
    if (!model.value || model.value.method.oneofKind !== 'winProbability') {
        model.value = {
            method: {
                oneofKind: 'winProbability',
                winProbability: {
                    cornerBonus: value 
                },
            },
        };
        return;
    }
    
    model.value.method.winProbability.cornerBonus = value;
}

function updateOdGaugeBonus(value: number) {
    if (selectedMethod.value !== 'winProbability') {
        return;
    }
    
    if (!model.value || model.value.method.oneofKind !== 'winProbability') {
        model.value = {
            method: {
                oneofKind: 'winProbability',
                winProbability: {
                    cornerBonus: cornerBonus.value,
                    odGaugeBonus: value,
                },
            },
        };
        return;
    }
    
    model.value.method.winProbability.odGaugeBonus = value;
}

function updateSaGaugeBonus(value: number) {
    if (selectedMethod.value !== 'winProbability') {
        return;
    }
    
    if (!model.value || model.value.method.oneofKind !== 'winProbability') {
        model.value = {
            method: {
                oneofKind: 'winProbability',
                winProbability: {
                    cornerBonus: cornerBonus.value,
                    saGaugeBonus: value,
                },
            },
        };
        return;
    }
    
    model.value.method.winProbability.saGaugeBonus = value;
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
    margin-bottom: 15px;
}

.form-group:last-child {
    margin-bottom: 0;
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

.method-description {
    margin-bottom: 15px;
    padding: 8px;
    background-color: var(--bg-secondary);
    border-radius: 4px;
}
</style>
