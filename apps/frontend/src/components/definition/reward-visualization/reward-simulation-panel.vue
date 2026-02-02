<template>
  <div class="reward-simulation-panel">
    <button
      class="toggle-button"
      @click="isExpanded = !isExpanded"
    >
      <span class="toggle-icon">{{ isExpanded ? '▼' : '▶' }}</span>
      報酬シミュレーション
    </button>

    <div
      v-if="isExpanded"
      class="simulation-content"
    >
      <div class="sliders-section">
        <div class="slider-group">
          <label>プレイヤーHP</label>
          <input
            v-model.number="playerHealth"
            type="range"
            min="1000"
            max="10000"
            step="500"
          >
          <span class="slider-value">{{ playerHealth }}</span>
        </div>

        <div class="slider-group">
          <label>相手HP</label>
          <input
            v-model.number="opponentHealth"
            type="range"
            min="1000"
            max="10000"
            step="500"
          >
          <span class="slider-value">{{ opponentHealth }}</span>
        </div>

        <template v-if="method === 'winProbability'">
          <div class="slider-group">
            <label>プレイヤーOD</label>
            <input
              v-model.number="playerOd"
              type="range"
              min="0"
              max="6"
              step="1"
            >
            <span class="slider-value">{{ playerOd }}</span>
          </div>

          <div class="slider-group">
            <label>相手OD</label>
            <input
              v-model.number="opponentOd"
              type="range"
              min="0"
              max="6"
              step="1"
            >
            <span class="slider-value">{{ opponentOd }}</span>
          </div>

          <div class="slider-group">
            <label>プレイヤーSA</label>
            <input
              v-model.number="playerSa"
              type="range"
              min="0"
              max="3"
              step="1"
            >
            <span class="slider-value">{{ playerSa }}</span>
          </div>

          <div class="slider-group">
            <label>相手SA</label>
            <input
              v-model.number="opponentSa"
              type="range"
              min="0"
              max="3"
              step="1"
            >
            <span class="slider-value">{{ opponentSa }}</span>
          </div>

          <div class="corner-state-group">
            <label>画面端</label>
            <div class="corner-buttons">
              <button
                :class="['corner-btn', { active: cornerState === CornerState.NONE }]"
                @click="cornerState = CornerState.NONE"
              >
                なし
              </button>
              <button
                :class="['corner-btn', { active: cornerState === CornerState.PLAYER_IN_CORNER }]"
                @click="cornerState = CornerState.PLAYER_IN_CORNER"
              >
                自分端
              </button>
              <button
                :class="['corner-btn', { active: cornerState === CornerState.OPPONENT_IN_CORNER }]"
                @click="cornerState = CornerState.OPPONENT_IN_CORNER"
              >
                相手端
              </button>
            </div>
          </div>
        </template>
      </div>

      <div
        class="result-section"
        :class="rewardClass"
      >
        <template v-if="method === 'winProbability'">
          <div class="result-main">
            <span class="win-probability">勝率: {{ winProbabilityPercent }}%</span>
            <span class="result-arrow">→</span>
            <span class="reward-value">報酬: {{ formattedReward }}</span>
          </div>
          <div class="result-detail">
            (自分{{ result.playerTurnsToKill }}ターン vs 相手{{ result.opponentTurnsToKill }}ターン)
          </div>
        </template>
        <template v-else>
          <div class="result-main">
            <span class="reward-value">報酬: {{ damageRaceReward }}</span>
          </div>
          <div class="result-detail">
            (与ダメ {{ damageDealt }} - 被ダメ {{ damageReceived }})
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { CornerState } from '@nomari/ts-proto';
import {
    calculateRewardForWinProbabilityWithCorner,
    calculateRewardForDamageRace,
} from '@nomari/game-tree-builder';

const props = defineProps<{
    cornerBonus: number;
    odGaugeBonus: number;
    saGaugeBonus: number;
    method: 'damageRace' | 'winProbability';
}>();

const isExpanded = ref(false);
const playerHealth = ref(10000);
const opponentHealth = ref(10000);
const playerOd = ref(0);
const opponentOd = ref(0);
const playerSa = ref(0);
const opponentSa = ref(0);
const cornerState = ref<CornerState>(CornerState.NONE);

const INITIAL_HEALTH = 10000;

const result = computed(() => {
    return calculateRewardForWinProbabilityWithCorner(
        playerHealth.value,
        opponentHealth.value,
        cornerState.value,
        props.cornerBonus,
        playerOd.value,
        opponentOd.value,
        playerSa.value,
        opponentSa.value,
        props.odGaugeBonus,
        props.saGaugeBonus
    );
});

const damageRaceReward = computed(() => {
    return calculateRewardForDamageRace(
        playerHealth.value,
        opponentHealth.value,
        INITIAL_HEALTH,
        INITIAL_HEALTH
    );
});

const damageDealt = computed(() => INITIAL_HEALTH - opponentHealth.value);
const damageReceived = computed(() => INITIAL_HEALTH - playerHealth.value);

const winProbabilityPercent = computed(() => {
    return (result.value.winProbability * 100).toFixed(1);
});

const formattedReward = computed(() => {
    const reward = result.value.reward;
    return reward >= 0 ? `+${Math.round(reward)}` : `${Math.round(reward)}`;
});

const rewardClass = computed(() => {
    const reward = props.method === 'winProbability' ? result.value.reward : damageRaceReward.value;
    if (reward > 1000) {
        return 'reward-positive';
    }
    if (reward < -1000) {
        return 'reward-negative';
    }
    return 'reward-neutral';
});

</script>

<style scoped>
.reward-simulation-panel {
  margin-top: 15px;
  border: 1px solid var(--border-primary);
  border-radius: var(--radius-sm);
  background-color: var(--bg-secondary);
}

.toggle-button {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: transparent;
  border: none;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  text-align: left;
}

.toggle-button:hover {
  background-color: var(--bg-hover);
}

.toggle-icon {
  font-size: 10px;
  color: var(--text-secondary);
}

.simulation-content {
  padding: 15px;
  border-top: 1px solid var(--border-primary);
}

.sliders-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.slider-group {
  display: grid;
  grid-template-columns: 100px 1fr 50px;
  align-items: center;
  gap: 10px;
}

.slider-group label {
  font-size: 12px;
  color: var(--text-secondary);
}

.slider-group input[type="range"] {
  width: 100%;
  height: 4px;
  background: var(--bg-tertiary);
  border-radius: 2px;
  outline: none;
  cursor: pointer;
}

.slider-group input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  background: var(--color-primary);
  border-radius: 50%;
  cursor: pointer;
}

.slider-value {
  font-size: 12px;
  color: var(--text-primary);
  text-align: right;
  font-family: monospace;
}

.corner-state-group {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.corner-state-group > label {
  font-size: 12px;
  color: var(--text-secondary);
  width: 100px;
}

.corner-buttons {
  display: flex;
  gap: 4px;
}

.corner-btn {
  padding: 4px 10px;
  font-size: 11px;
  border: 1px solid var(--border-secondary);
  border-radius: var(--radius-sm);
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}

.corner-btn:hover {
  background-color: var(--bg-hover);
}

.corner-btn.active {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
  color: white;
}

.result-section {
  margin-top: 15px;
  padding: 12px;
  border-radius: var(--radius-sm);
  text-align: center;
}

.result-section.reward-positive {
  background-color: rgba(90, 175, 138, 0.15);
  border: 1px solid rgba(90, 175, 138, 0.3);
}

.result-section.reward-negative {
  background-color: rgba(196, 64, 64, 0.15);
  border: 1px solid rgba(196, 64, 64, 0.3);
}

.result-section.reward-neutral {
  background-color: rgba(232, 192, 96, 0.15);
  border: 1px solid rgba(232, 192, 96, 0.3);
}

.result-main {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
}

.win-probability {
  color: var(--text-primary);
}

.result-arrow {
  color: var(--text-secondary);
}

.reward-value {
  font-family: monospace;
}

.reward-positive .reward-value {
  color: #5aaf8a;
}

.reward-negative .reward-value {
  color: #c44040;
}

.reward-neutral .reward-value {
  color: #e8c060;
}

.result-detail {
  margin-top: 6px;
  font-size: 11px;
  color: var(--text-secondary);
}
</style>
