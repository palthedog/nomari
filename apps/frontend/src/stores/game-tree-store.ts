import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useGameTreeStore = defineStore('gameTree', () => {
    const selectedNodeId = ref<string | null>(null);
    const highlightedNodeId = ref<string | null>(null);

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

    return {
        selectedNodeId,
        highlightedNodeId,
        selectNode,
        highlightNode,
        clearSelection,
    };
});
