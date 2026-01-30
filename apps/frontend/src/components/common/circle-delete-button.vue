<template>
  <button
    type="button"
    class="circle-delete-btn"
    :title="title"
    :style="colorStyle"
    @click.stop="$emit('click')"
  >
    <v-icon
      icon="mdi-close"
      size="14"
    />
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    title?: string;
    color?: string;
}>();

defineEmits<{
    (e: 'click'): void;
}>();

const colorStyle = computed(() => {
    if (!props.color) {
        return undefined;
    }
    return {
        '--btn-color': props.color
    };
});
</script>

<style scoped>
.circle-delete-btn {
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background-color: transparent;
  color: var(--btn-color, var(--text-tertiary));
  cursor: pointer;
  transition: background-color 0.2s, color 0.2s;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.circle-delete-btn:hover {
  background-color: var(--color-delete);
  color: white;
}
</style>
