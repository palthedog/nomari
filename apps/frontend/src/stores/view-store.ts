import { defineStore } from 'pinia';
import { ref } from 'vue';

export type ViewMode = 'edit' | 'strategy';

export interface ViewModeConfig {
    id: ViewMode;
    label: string;
}

export const VIEW_MODES: ViewModeConfig[] = [
    {
        id: 'edit',
        label: '編集' 
    },
    {
        id: 'strategy',
        label: '戦略' 
    },
];

export const useViewStore = defineStore('view', () => {
    const viewMode = ref<ViewMode>('edit');

    // Currently selected situation ID (updated when nodes are selected in strategy mode)
    const selectedSituationId = ref<number | null>(null);

    function setViewMode(mode: ViewMode) {
        viewMode.value = mode;
    }

    function switchToEdit() {
        viewMode.value = 'edit';
    }

    function switchToStrategy() {
        viewMode.value = 'strategy';
    }

    function setSelectedSituationId(id: number | null) {
        selectedSituationId.value = id;
    }

    return {
        viewMode,
        selectedSituationId,
        setViewMode,
        switchToEdit,
        switchToStrategy,
        setSelectedSituationId,
    };
});
