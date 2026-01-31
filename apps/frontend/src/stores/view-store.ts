import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import router from '@/router';

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

// Helper to get source type from route
function getSourceType(): 'local' | 'example' {
    const name = router.currentRoute.value.name?.toString() ?? '';
    return name.startsWith('example-') ? 'example' : 'local';
}

// Helper to get example name from route
function getExampleName(): string | null {
    const exampleName = router.currentRoute.value.params.exampleName;
    return typeof exampleName === 'string' ? exampleName : null;
}

export const useViewStore = defineStore('view', () => {
    // Derived from route (read-only)
    const viewMode = computed<ViewMode>(() => {
        const name = router.currentRoute.value.name?.toString() ?? '';
        return name.includes('strategy') ? 'strategy' : 'edit';
    });

    // Currently selected situation ID (updated when nodes are selected in strategy mode)
    const selectedSituationId = ref<number | null>(null);

    // Derived from route (read-only)
    const editSelection = computed<EditSelection>(() => {
        const name = router.currentRoute.value.name?.toString() ?? '';
        if (name.endsWith('-edit-situation')) {
            const situationId = router.currentRoute.value.params.situationId;
            if (typeof situationId === 'string') {
                const id = parseInt(situationId, 10);
                if (!isNaN(id)) {
                    return {
                        type: 'situation',
                        situationId: id
                    };
                }
            }
        }
        return {
            type: 'scenario'
        };
    });

    // Navigation: Switch to edit mode
    // If a situation is selected (from strategy mode), go to that situation's edit page
    function switchToEdit() {
        if (selectedSituationId.value !== null) {
            navigateToEdit({
                type: 'situation',
                situationId: selectedSituationId.value
            });
        } else {
            navigateToEdit({
                type: 'scenario'
            });
        }
    }

    // Navigation: Switch to strategy mode
    function switchToStrategy() {
        navigateToStrategy(null);
    }

    // Navigation: Switch to strategy with specific node
    function switchToStrategyWithNode(nodeId: string | null) {
        navigateToStrategy(nodeId);
    }

    function setSelectedSituationId(id: number | null) {
        selectedSituationId.value = id;
    }

    // Navigation: Select scenario settings in edit mode
    function selectScenarioSettings() {
        navigateToEdit({
            type: 'scenario'
        });
    }

    // Navigation: Select a situation in edit mode
    function selectEditSituation(situationId: number) {
        navigateToEdit({
            type: 'situation',
            situationId
        });
    }

    // Navigation helper: Navigate to edit route
    function navigateToEdit(selection: EditSelection) {
        const source = getSourceType();
        const params: Record<string, string> = {};

        if (source === 'example') {
            const exampleName = getExampleName();
            if (exampleName) {
                params.exampleName = exampleName;
            }
        }

        if (selection.type === 'situation') {
            params.situationId = selection.situationId.toString();
            const routeName = source === 'example' ? 'example-edit-situation' : 'local-edit-situation';
            router.push({
                name: routeName,
                params
            });
        } else {
            const routeName = source === 'example' ? 'example-edit-scenario' : 'local-edit-scenario';
            router.push({
                name: routeName,
                params
            });
        }
    }

    // Navigation helper: Navigate to strategy route
    function navigateToStrategy(nodeId: string | null) {
        const source = getSourceType();
        const params: Record<string, string> = {};

        if (source === 'example') {
            const exampleName = getExampleName();
            if (exampleName) {
                params.exampleName = exampleName;
            }
        }

        if (nodeId) {
            params.nodeId = nodeId;
            const routeName = source === 'example' ? 'example-strategy-node' : 'local-strategy-node';
            router.push({
                name: routeName,
                params
            });
        } else {
            // Navigate without nodeId - guards will redirect to root
            const routeName = source === 'example' ? 'example-strategy' : 'local-strategy';
            router.push({
                name: routeName,
                params
            });
        }
    }

    // Deprecated: kept for backward compatibility during migration
    // These are now no-ops since state is derived from route
    function setViewMode(_mode: ViewMode) {
        // No-op: viewMode is derived from route
        // Components should use navigation functions instead
    }

    function setEditSelection(_selection: EditSelection) {
        // No-op: editSelection is derived from route
        // Components should use navigation functions instead
    }

    // Not needed anymore - guards handle node selection on strategy entry
    function consumePendingStrategyNodeId(): string | null {
        return null;
    }

    return {
        viewMode,
        selectedSituationId,
        editSelection,
        setViewMode,
        switchToEdit,
        switchToStrategy,
        switchToStrategyWithNode,
        consumePendingStrategyNodeId,
        setSelectedSituationId,
        selectScenarioSettings,
        selectEditSituation,
        setEditSelection,
    };
});
