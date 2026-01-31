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

export type EditSelection =
    | { type: 'scenario' }
    | { type: 'situation';
        situationId: number };

export const useViewStore = defineStore('view', () => {
    const viewMode = ref<ViewMode>('edit');

    // Currently selected situation ID (updated when nodes are selected in strategy mode)
    const selectedSituationId = ref<number | null>(null);

    // Edit mode selection state
    const editSelection = ref<EditSelection>({
        type: 'scenario' 
    });

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

    function selectScenarioSettings() {
        editSelection.value = {
            type: 'scenario' 
        };
    }

    function selectEditSituation(situationId: number) {
        editSelection.value = {
            type: 'situation',
            situationId 
        };
    }

    function setEditSelection(selection: EditSelection) {
        editSelection.value = selection;
    }

    return {
        viewMode,
        selectedSituationId,
        editSelection,
        setViewMode,
        switchToEdit,
        switchToStrategy,
        setSelectedSituationId,
        selectScenarioSettings,
        selectEditSituation,
        setEditSelection,
    };
});
