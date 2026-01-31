import { GameTree } from '@nomari/game-tree';
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

import { buildGameTree } from '@nomari/game-tree-builder';
import { useScenarioStore } from './scenario-store';
import { useNotificationStore } from './notification-store';
import router from '@/router';
import log from 'loglevel';

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

// Check if route is strategy mode
function isStrategyRoute(): boolean {
    const name = router.currentRoute.value.name?.toString() ?? '';
    return name.includes('strategy');
}

export const useGameTreeStore = defineStore('gameTree', () => {
    const buildError = ref<string | null>(null);
    const gameTree = ref<GameTree | null>(null);
    const highlightedNodeId = ref<string | null>(null);

    /**
     * Version number that increments when gameTree is rebuilt.
     * Used to detect if strategies need to be recalculated.
     */
    const gameTreeVersion = ref(0);

    /**
     * The scenarioVersion that was used to build the current gameTree.
     * Used to detect if gameTree needs to be rebuilt.
     */
    const builtFromScenarioVersion = ref(-1);

    const scenarioStore = useScenarioStore();

    // Derived from route - the selected node ID
    const selectedNodeId = computed<string | null>(() => {
        const nodeId = router.currentRoute.value.params.nodeId;

        // If in strategy mode with a nodeId param
        if (typeof nodeId === 'string') {
            // Verify node exists in tree
            if (gameTree.value?.nodes[nodeId]) {
                return nodeId;
            }
            // Node doesn't exist - guards will redirect, return null for now
            return null;
        }

        // In strategy mode without nodeId - use root
        if (isStrategyRoute() && gameTree.value?.root) {
            return gameTree.value.root;
        }

        return null;
    });

    // Navigation: Select a node (navigates via router)
    function selectNode(nodeId: string) {
        highlightNode(null);

        const source = getSourceType();
        const params: Record<string, string> = {
            nodeId
        };

        if (source === 'example') {
            const exampleName = getExampleName();
            if (exampleName) {
                params.exampleName = exampleName;
            }
        }

        const routeName = source === 'example' ? 'example-strategy-node' : 'local-strategy-node';
        router.push({
            name: routeName,
            params
        });
    }

    function highlightNode(nodeId: string | null) {
        highlightedNodeId.value = nodeId;
    }

    // Navigation: Clear selection (navigates to strategy without node)
    function clearSelection() {
        const source = getSourceType();
        const params: Record<string, string> = {};

        if (source === 'example') {
            const exampleName = getExampleName();
            if (exampleName) {
                params.exampleName = exampleName;
            }
        }

        const routeName = source === 'example' ? 'example-strategy' : 'local-strategy';
        router.push({
            name: routeName,
            params
        });
    }

    /**
     * Build the game tree from the current scenario.
     */
    function updateGameTree() {
        buildError.value = null;
        const result = buildGameTree(scenarioStore.scenario);
        if (result.success) {
            gameTree.value = result.gameTree;
            gameTreeVersion.value++;
        } else {
            gameTree.value = null;
            buildError.value = result.error.message;
            log.error('Failed to build game tree:', result.error);
            const notificationStore = useNotificationStore();
            notificationStore.showError(`ゲーム木の構築に失敗しました: ${result.error.message}`);
        }
        builtFromScenarioVersion.value = scenarioStore.scenarioVersion;
    }

    /**
     * Ensure the game tree is up-to-date with the current scenario.
     * Rebuilds only if the scenario has changed since the last build.
     * @returns true if game tree is valid, false if validation failed or build error
     */
    function ensureGameTreeUpdated(): boolean {
        if (builtFromScenarioVersion.value === scenarioStore.scenarioVersion) {
            return gameTree.value !== null;
        }

        if (!scenarioStore.validateAndShowErrors()) {
            return false;
        }

        updateGameTree();
        return gameTree.value !== null;
    }

    return {
        buildError,
        gameTree,
        gameTreeVersion,
        selectedNodeId,
        highlightedNodeId,
        selectNode,
        highlightNode,
        clearSelection,
        updateGameTree,
        ensureGameTreeUpdated,
    };
});
