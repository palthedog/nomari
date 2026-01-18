import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ViewMode = 'edit' | 'game-tree' | 'strategy';

export interface ViewModeConfig {
    id: ViewMode;
    label: string;
}

export const VIEW_MODES: ViewModeConfig[] = [
    { id: 'edit', label: '編集' },
    { id: 'game-tree', label: 'ゲーム木' },
    { id: 'strategy', label: '戦略' },
];

export const useViewStore = defineStore('view', () => {
    const viewMode = ref<ViewMode>('edit');

    function setViewMode(mode: ViewMode) {
        viewMode.value = mode;
    }

    function switchToEdit() {
        viewMode.value = 'edit';
    }

    function switchToGameTree() {
        viewMode.value = 'game-tree';
    }

    function switchToStrategy() {
        viewMode.value = 'strategy';
    }

    return {
        viewMode,
        setViewMode,
        switchToEdit,
        switchToGameTree,
        switchToStrategy,
    };
});
