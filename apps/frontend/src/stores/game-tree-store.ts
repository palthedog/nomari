import { GameTree } from '@nomari/game-tree';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import { buildGameTree } from '@nomari/game-tree-builder';
import { useScenarioStore } from './scenario-store';
import { useNotificationStore } from './notification-store';
import log from 'loglevel';

export const useGameTreeStore = defineStore('gameTree', () => {
    const buildError = ref<string | null>(null);
    const gameTree = ref<GameTree | null>(null);
    const selectedNodeId = ref<string | null>(null);
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

    function selectNode(nodeId: string) {
        selectedNodeId.value = nodeId;
        highlightNode(null);
    }

    function highlightNode(nodeId: string | null) {
        highlightedNodeId.value = nodeId;
    }

    function clearSelection() {
        selectedNodeId.value = null;
    }

    /**
     * Build the game tree from the current scenario.
     */
    function updateGameTree() {
        buildError.value = null;
        clearSelection();
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
