<template>
  <div class="mobile-sub-nav">
    <button
      type="button"
      class="nav-btn nav-btn-left"
      :disabled="currentIndex === 0"
      @click="navigatePrev"
    >
      <span class="arrow-icon">&lt;</span>
      <span
        v-if="leftLabel"
        class="nav-label"
      >{{ leftLabel }}</span>
    </button>
    <div class="nav-dots">
      <span
        v-for="(_, index) in totalViews"
        :key="index"
        class="dot"
        :class="{ active: index === currentIndex }"
        @click="navigateTo(index)"
      />
    </div>
    <button
      type="button"
      class="nav-btn nav-btn-right"
      :disabled="currentIndex === totalViews - 1"
      @click="navigateNext"
    >
      <span
        v-if="rightLabel"
        class="nav-label"
      >{{ rightLabel }}</span>
      <span class="arrow-icon">&gt;</span>
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  currentIndex: number;
  totalViews: number;
  leftLabel?: string;
  rightLabel?: string;
}>();

const emit = defineEmits<{
  (e: 'navigate', index: number): void;
}>();

function navigatePrev() {
  if (props.currentIndex > 0) {
    emit('navigate', props.currentIndex - 1);
  }
}

function navigateNext() {
  if (props.currentIndex < props.totalViews - 1) {
    emit('navigate', props.currentIndex + 1);
  }
}

function navigateTo(index: number) {
  emit('navigate', index);
}
</script>

<style scoped>
.mobile-sub-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background-color: var(--bg-secondary);
  border-top: 1px solid var(--border-primary);
}

.nav-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 14px;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s, opacity 0.2s;
  min-width: 80px;
}

.nav-btn-left {
  justify-content: flex-start;
}

.nav-btn-right {
  justify-content: flex-end;
}

.nav-btn:hover:not(:disabled) {
  background-color: var(--bg-hover);
}

.nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.arrow-icon {
  font-size: 14px;
  font-weight: bold;
  color: var(--text-primary);
}

.nav-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.nav-dots {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: var(--border-primary);
  cursor: pointer;
  transition: background-color 0.2s, transform 0.2s;
}

.dot:hover {
  transform: scale(1.2);
}

.dot.active {
  background-color: var(--color-accent-coral);
}
</style>
