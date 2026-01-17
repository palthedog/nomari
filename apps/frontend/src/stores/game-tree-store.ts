import { GameTree } from '@mari/game-tree';
import { defineStore } from 'pinia';
import { ref } from 'vue';

import { buildGameTree } from '@mari/game-tree-builder';
import { useDefinitionStore } from './definition-store';

export const useGameTreeStore = defineStore('gameTree', () => {
    const buildError = ref<string | null>(null);
    const gameTree = ref<GameTree | null>(null);
    const selectedNodeId = ref<string | null>(null);
    const highlightedNodeId = ref<string | null>(null);

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

    // Game tree functions
    function updateGameTree() {
        buildError.value = null;
        clearSelection();
        const result = buildGameTree(definitionStore.gameDefinition);
        if (result.success) {
            gameTree.value = result.gameTree;
        } else {
            gameTree.value = null;
            buildError.value = result.error.message;
        }
    }


    return {
        buildError,
        gameTree,
        selectedNodeId,
        highlightedNodeId,
        selectNode,
        highlightNode,
        clearSelection,
        updateGameTree,
    };
});
