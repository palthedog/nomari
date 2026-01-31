import { watch, nextTick, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import log from 'loglevel';
import { useViewStore, type ViewMode } from '@/stores/view-store';
import { useGameTreeStore } from '@/stores/game-tree-store';
import { useScenarioStore } from '@/stores/scenario-store';
import { useNotificationStore } from '@/stores/notification-store';
import { useSolverStore } from '@/stores/solver-store';
import { parseAsProto } from '@/utils/export';
import { getSituationName } from '@/utils/scenario-utils';

type SourceType = 'local' | 'example';

const BASE_TITLE = 'Nomari';

// Validate example name to prevent path traversal (alphanumeric and underscore only)
function isValidExampleName(name: string): boolean {
    return /^[a-zA-Z0-9_]+$/.test(name);
}

export function useUrlSync() {
    const router = useRouter();
    const route = useRoute();
    const viewStore = useViewStore();
    const gameTreeStore = useGameTreeStore();
    const scenarioStore = useScenarioStore();
    const notificationStore = useNotificationStore();
    const solverStore = useSolverStore();

    // Flag to prevent sync loops
    const isUpdatingFromUrl = ref(false);

    // Track loaded example to avoid reloading
    const loadedExample = ref<string | null>(null);

    // Get view mode from route name
    function getViewModeFromRoute(): ViewMode | null {
        const name = route.name?.toString() ?? '';
        if (name.includes('-edit')) {
            return 'edit';
        }
        if (name.includes('-strategy')) {
            return 'strategy';
        }
        return null;
    }

    // Get source type from route name
    function getSourceType(): SourceType {
        const name = route.name?.toString() ?? '';
        if (name.startsWith('example-')) {
            return 'example';
        }
        return 'local';
    }

    // Build route name from components
    function buildRouteName(source: SourceType, mode: ViewMode, hasNode: boolean): string {
        const base = `${source}-${mode}`;
        return hasNode ? `${base}-node` : base;
    }

    // Load example from URL parameter
    async function loadExample(exampleName: string): Promise<boolean> {
        if (!isValidExampleName(exampleName)) {
            notificationStore.showError(`Invalid example name: ${exampleName}`);
            return false;
        }
        try {
            const response = await fetch(`${import.meta.env.BASE_URL}static/examples/${exampleName}.pb`);
            const contentType = response.headers.get('content-type') ?? '';
            if (!response.ok || contentType.includes('text/html')) {
                notificationStore.showError(`Failed to load example: ${exampleName}`);
                return false;
            }
            const buffer = await response.arrayBuffer();
            const scenario = parseAsProto(buffer);
            scenarioStore.loadScenario(scenario);
            loadedExample.value = exampleName;
            return true;
        } catch (error) {
            log.error('Failed to load example:', error);
            notificationStore.showError(`Failed to load example: ${exampleName}`);
            return false;
        }
    }

    // Navigate to route with current source preserved
    function navigateTo(mode: ViewMode, nodeId: string | null) {
        const source = getSourceType();
        const targetRouteName = buildRouteName(source, mode, nodeId !== null);

        const params: Record<string, string> = {};
        if (source === 'example') {
            const exampleName = route.params.exampleName;
            if (typeof exampleName === 'string') {
                params.exampleName = exampleName;
            }
        }
        if (nodeId !== null) {
            params.nodeId = nodeId;
        }

        router.push({
            name: targetRouteName,
            params,
        });
    }

    // URL -> Store: Sync view mode from route
    function syncViewModeFromRoute() {
        const targetMode = getViewModeFromRoute();
        if (!targetMode) {
            return;
        }

        if (viewStore.viewMode !== targetMode) {
            // Validate before switching to strategy mode
            if (targetMode === 'strategy') {
                if (!scenarioStore.validateAndShowErrors()) {
                    // Validation failed, redirect to edit
                    const source = getSourceType();
                    const editRouteName = buildRouteName(source, 'edit', false);
                    const params: Record<string, string> = {};
                    if (source === 'example') {
                        const exampleName = route.params.exampleName;
                        if (typeof exampleName === 'string') {
                            params.exampleName = exampleName;
                        }
                    }
                    router.replace({
                        name: editRouteName,
                        params,
                    });
                    return;
                }
            }
            viewStore.setViewMode(targetMode);
        }
    }

    // URL -> Store: Sync selected node from route params
    function syncNodeFromRoute() {
        const nodeId = route.params.nodeId;
        const nodeIdStr = typeof nodeId === 'string' ? nodeId : null;

        if (nodeIdStr) {
            const gameTree = gameTreeStore.gameTree;
            if (gameTree && gameTree.nodes[nodeIdStr]) {
                gameTreeStore.selectNode(nodeIdStr);
            }
            // If node not found or no game tree yet, the game tree watcher will handle it
            // when the tree is built/updated. Don't clear prematurely here.
        } else {
            gameTreeStore.clearSelection();
        }
    }

    // Watch route changes for view mode
    watch(
        () => route.name,
        () => {
            isUpdatingFromUrl.value = true;
            syncViewModeFromRoute();
            nextTick(() => {
                isUpdatingFromUrl.value = false;
            });
        },
        {
            immediate: true
        }
    );

    // Watch route params for example loading
    watch(
        () => route.params.exampleName,
        async (exampleName) => {
            if (typeof exampleName === 'string') {
                // Only load if not already loaded
                if (loadedExample.value !== exampleName) {
                    const loaded = await loadExample(exampleName);
                    if (!loaded) {
                        // Failed to load example, redirect to local edit
                        router.replace({
                            name: 'local-edit' 
                        });
                        return;
                    }
                }
                // If in strategy mode, ensure solved
                const viewMode = getViewModeFromRoute();
                if (viewMode === 'strategy') {
                    solverStore.ensureSolved();
                }
            } else {
                // No example in route, clear loaded example tracking
                loadedExample.value = null;
            }
        },
        {
            immediate: true
        }
    );

    // Watch route params for node selection
    watch(
        () => route.params.nodeId,
        () => {
            isUpdatingFromUrl.value = true;
            syncNodeFromRoute();
            nextTick(() => {
                isUpdatingFromUrl.value = false;
            });
        },
        {
            immediate: true
        }
    );

    // Store -> URL: Watch viewMode changes
    watch(
        () => viewStore.viewMode,
        (mode) => {
            if (isUpdatingFromUrl.value) {
                return;
            }

            const currentMode = getViewModeFromRoute();
            if (currentMode !== mode) {
                // When switching mode, clear node selection
                navigateTo(mode, null);
            }
        }
    );

    // Update selectedSituationId and document title when node selection changes
    watch(
        () => gameTreeStore.selectedNodeId,
        (nodeId) => {
            if (!nodeId) {
                updateDocumentTitle(viewStore.viewMode, null);
                return;
            }
            const node = gameTreeStore.gameTree?.nodes[nodeId];
            const situationId = node?.state.situation_id;
            if (situationId != null) {
                viewStore.setSelectedSituationId(situationId);
            }
            updateDocumentTitle(viewStore.viewMode, nodeId);
        }
    );

    // Update document title when view mode changes
    watch(
        () => viewStore.viewMode,
        (mode) => {
            updateDocumentTitle(mode, gameTreeStore.selectedNodeId);
        }
    );

    function updateDocumentTitle(mode: ViewMode, nodeId: string | null) {
        if (!nodeId) {
            const modeLabel = mode === 'strategy' ? 'Strategy' : 'Edit';
            document.title = `${BASE_TITLE} - ${modeLabel}`;
            return;
        }

        const node = gameTreeStore.gameTree?.nodes[nodeId];
        if (!node) {
            document.title = BASE_TITLE;
            return;
        }

        const situationId = node.state.situation_id;
        let situationName = '';
        if (situationId != null) {
            situationName = getSituationName(scenarioStore.scenario, situationId) ?? '';
        }

        const playerHp = node.state.playerHealth;
        const opponentHp = node.state.opponentHealth;
        const hpInfo = `HP: ${playerHp}/${opponentHp}`;

        if (situationName) {
            document.title = `${BASE_TITLE} - ${situationName} (${hpInfo})`;
        } else {
            document.title = `${BASE_TITLE} - (${hpInfo})`;
        }
    }

    // Store -> URL: Watch selectedNodeId changes
    watch(
        () => gameTreeStore.selectedNodeId,
        (nodeId) => {
            if (isUpdatingFromUrl.value) {
                return;
            }
            const currentNodeId = route.params.nodeId;
            const currentNodeIdStr = typeof currentNodeId === 'string' ? currentNodeId : null;
            if (nodeId !== currentNodeIdStr) {
                // Only update node in strategy mode
                if (viewStore.viewMode === 'strategy') {
                    navigateTo('strategy', nodeId);
                }
            }
        }
    );

    // Watch game tree changes - sync node selection from URL
    // This handles both:
    // 1. Node from URL now exists in new tree -> select it
    // 2. Node from URL doesn't exist in tree -> clear it
    watch(
        () => gameTreeStore.gameTree,
        (gameTree) => {
            const nodeId = route.params.nodeId;
            if (typeof nodeId !== 'string' || !gameTree) {
                return;
            }

            // If example route but example not yet loaded, wait for it
            const source = getSourceType();
            if (source === 'example' && loadedExample.value === null) {
                return;
            }

            if (gameTree.nodes[nodeId]) {
                // Node exists in new tree, select it
                gameTreeStore.selectNode(nodeId);
            } else {
                // Node doesn't exist in tree, clear from URL
                log.warn(`Node ${nodeId} not found in game tree, clearing`);
                navigateTo('strategy', null);
                gameTreeStore.clearSelection();
            }
        },
        {
            immediate: true
        }
    );

    return {
        loadExample,
    };
}
