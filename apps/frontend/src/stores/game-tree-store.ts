import { GameTree } from '@nomari/game-tree';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import { buildGameTree } from '@nomari/game-tree-builder';
import { useDefinitionStore } from './definition-store';
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
     * The definitionVersion that was used to build the current gameTree.
     * Used to detect if gameTree needs to be rebuilt.
     */
    const builtFromDefinitionVersion = ref(-1);

    const definitionStore = useDefinitionStore();

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
     * Build the game tree from the current definition.
     */
    function updateGameTree() {
        buildError.value = null;
        clearSelection();
        const result = buildGameTree(definitionStore.gameDefinition);
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
        builtFromDefinitionVersion.value = definitionStore.definitionVersion;
    }

    /**
     * Ensure the game tree is up-to-date with the current definition.
     * Rebuilds only if the definition has changed since the last build.
     * @returns true if game tree is valid, false if validation failed or build error
     */
    function ensureGameTreeUpdated(): boolean {
        if (builtFromDefinitionVersion.value === definitionStore.definitionVersion) {
            return gameTree.value !== null;
        }

        if (!definitionStore.validateAndShowErrors()) {
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
