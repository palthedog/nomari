<template>
  <div class="game-tree-visualization">
    <div class="game-tree-header">
      <div class="game-tree-title">
        ゲーム木
      </div>
      <div class="tree-stats">
        <span>ノード数: {{ nodeCount }}</span>
      </div>
    </div>
    <div class="graph-container">
      <v-network-graph
        v-model:selected-nodes="selectedNodes"
        :nodes="graphNodes"
        :edges="graphEdges"
        :layouts="layouts"
        :configs="configs"
        :event-handlers="eventHandlers"
      >
        <!-- Custom node rendering with HTML -->
        <template #override-node="{ nodeId }">
          <rect
            :x="-nodeWidth / 2"
            :y="-nodeHeight / 2"
            :width="nodeWidth"
            :height="nodeHeight"
            :fill="getNodeFillColor(nodeId)"
            :stroke="getNodeStrokeColor(nodeId)"
            :stroke-width="getNodeStrokeWidth(nodeId)"
            rx="5"
            class="node-rect"
          />

          <!-- Reward info (only for terminal nodes) -->
          <text
            v-if="isTerminalNode(nodeId)"
            :y="-5"
            text-anchor="middle"
            :fill="getRewardColor(nodeId)"
            font-size="10"
            font-weight="bold"
          >
            報酬: {{ formatReward(nodeId) }}
          </text>

          <!-- Description -->
          <text
            v-else
            :y="-5"
            text-anchor="middle"
            fill="white"
            font-size="10"
            font-weight="bold"
          >
            {{ truncate(getNodeDisplayText(nodeId), 18) }}
          </text>

          <!-- HP info -->
          <text
            :y="10"
            text-anchor="middle"
            fill="white"
            font-size="9"
          >
            HP: {{ getHpInfo(nodeId) }}
          </text>
        </template>
      </v-network-graph>
    </div>
  </div>
</template>

<script setup lang="ts">
    import { ref, computed, watch, reactive } from 'vue';
    import type { Nodes, Edges, Layouts, UserConfigs, EventHandlers } from 'v-network-graph';
    import type { GameTree, Node } from '@nomari/game-tree/game-tree';
    import { useGameTreeStore } from '@/stores/game-tree-store';

    const props = defineProps<{
        gameTree: GameTree;
    }>();

    const gameTreeStore = useGameTreeStore();

    // Selected nodes for v-network-graph (array format required)
    const selectedNodes = ref<string[]>([]);

    const nodeWidth = 140;
    const nodeHeight = 50;
    const levelGap = 160;
    const nodeGap = 80;

    // Reactive data for v-network-graph
    const graphNodes = reactive<Nodes>({});
    const graphEdges = reactive<Edges>({});
    const layouts = reactive<Layouts>({ nodes: {} });

    const nodeCount = computed(() => Object.keys(props.gameTree.nodes).length);
    const rootNodeId = computed(() => props.gameTree.root);

    // v-network-graph configs
    const configs = computed<UserConfigs>(() => ({
        view: {
            scalingObjects: true,
            panEnabled: true,
            zoomEnabled: true,
            minZoomLevel: 0.1,
            maxZoomLevel: 4,
            autoPanAndZoomOnLoad: false,
            autoPanMargin: 1000,
        },
        node: {
            selectable: true,
            draggable: false,
            normal: {
                type: 'rect',
                width: nodeWidth,
                height: nodeHeight,
                borderRadius: 5,
                color: '#2196F3',
            },
            hover: {
                color: '#1976D2',
            },
            label: {
                visible: false,
            },
        },
        edge: {
            selectable: false,
            normal: {
                color: '#888888',
                width: 2,
            },
            marker: {
                target: {
                    type: 'arrow',
                    width: 4,
                    height: 4,
                },
            },
        },
    }));

    // Event handlers (empty since selection is handled via v-model:selected-nodes)
    const eventHandlers = computed<EventHandlers>(() => ({}));

    /**
     * Truncate a string to a specified length.
     */
    function truncate(str: string, length: number): string {
        if (str.length <= length) {
            return str; 
        }
        return str.substring(0, length) + '...';
    }

    /**
     * Format reward value for display.
     */
    function formatReward(nodeId: string): string {
        const node = props.gameTree.nodes[nodeId];
        if (!node) {
            return '-'; 
        }
        const value = node.playerReward?.value;
        if (value === undefined) {
            return '-'; 
        }
        return Math.round(value).toLocaleString();
    }

    /**
     * Get HP info string for a node.
     */
    function getHpInfo(nodeId: string): string {
        const node = props.gameTree.nodes[nodeId];
        if (!node) {
            return '- / -'; 
        }
        return `${node.state.playerHealth} / ${node.state.opponentHealth}`;
    }

    /**
     * Get the color for reward text based on value.
     */
    function getRewardColor(nodeId: string): string {
        const node = props.gameTree.nodes[nodeId];
        if (!node) {
            return '#FFD700'; 
        }
        const value = node.playerReward?.value;
        if (value === undefined) {
            return '#FFD700'; 
        }
        if (value < 0) {
            return '#FF6B6B'; 
        }
        return '#FFD700';
    }

    /**
     * Check if a node is a terminal node (has rewards).
     */
    function isTerminalNode(nodeId: string): boolean {
        const node = props.gameTree.nodes[nodeId];
        if (!node) {
            return false; 
        }
        return node.playerReward !== undefined || node.opponentReward !== undefined;
    }

    /**
     * Check if player health is zero (lose condition).
     */
    function isPlayerHealthZero(node: Node): boolean {
        return node.state.playerHealth <= 0;
    }

    /**
     * Check if opponent health is zero (win condition).
     */
    function isOpponentHealthZero(node: Node): boolean {
        return node.state.opponentHealth <= 0;
    }

    /**
     * Check if a node is an "other" terminal node (TerminalSituation, not health-based).
     */
    function isOtherTerminalNode(node: Node): boolean {
        const isTerminal = node.playerReward !== undefined || node.opponentReward !== undefined;
        return isTerminal && !isPlayerHealthZero(node) && !isOpponentHealthZero(node);
    }

    /**
     * Check if a node is highlighted.
     */
    function isHighlightedNode(nodeId: string): boolean {
        return gameTreeStore.highlightedNodeId === nodeId;
    }

    /**
     * Check if a node is selected.
     */
    function isSelectedNode(nodeId: string): boolean {
        return gameTreeStore.selectedNodeId === nodeId;
    }

    /**
     * Get the fill color for a node based on its type.
     */
    function getNodeFillColor(nodeId: string): string {
        const node = props.gameTree.nodes[nodeId];
        if (!node) {
            return '#2196F3'; 
        }

        if (isHighlightedNode(nodeId)) {
            return '#FFC107';
        }

        if (nodeId === rootNodeId.value) {
            return '#4CAF50';
        }

        if (isPlayerHealthZero(node) && !isOpponentHealthZero(node)) {
            return '#E53935';
        }
        if (isOpponentHealthZero(node) && !isPlayerHealthZero(node)) {
            return '#43A047';
        }
        if (isPlayerHealthZero(node) && isOpponentHealthZero(node)) {
            return '#FF9800';
        }

        if (isOtherTerminalNode(node)) {
            return '#616161';
        }

        return '#2196F3';
    }

    /**
     * Get the stroke color for a node.
     */
    function getNodeStrokeColor(nodeId: string): string {
        return isSelectedNode(nodeId) ? '#FFD700' : '#333';
    }

    /**
     * Get the stroke width for a node.
     */
    function getNodeStrokeWidth(nodeId: string): number {
        return isSelectedNode(nodeId) ? 4 : 2;
    }

    /**
     * Get the display text for a node.
     */
    function getNodeDisplayText(nodeId: string): string {
        const node = props.gameTree.nodes[nodeId];
        if (!node) {
            return ''; 
        }

        if (isOtherTerminalNode(node) && node.name) {
            return node.name;
        }

        return node.description;
    }

    /**
     * Perform BFS traversal on the game tree and build:
     * - graphNodes and graphEdges
     * - levelNodes to collect nodes per level
     */
    function bfsBuildGraphData(
        rootNodeId: string,
        nodes: Record<string, Node>,
        levelNodes: Map<number, string[]>,
        terminalNodes: string[],
        graphNodes: Nodes,
        graphEdges: Edges,
    ) {
        const queue: Array<{ nodeId: string; level: number }> = [
            { nodeId: rootNodeId, level: 0 },
        ];
        const visited = new Set<string>();

        while (queue.length > 0) {
            const { nodeId, level } = queue.shift()!;

            if (visited.has(nodeId)) {
                continue;
            }
            visited.add(nodeId);

            const node = nodes[nodeId];
            if (!node) {
                continue;
            }

            if (isTerminalNode(nodeId)) {
                terminalNodes.push(nodeId);
            } else {
                // Add to level map
                if (!levelNodes.has(level)) {
                    levelNodes.set(level, []);
                }
                levelNodes.get(level)!.push(nodeId);
            }

            // Add node to graph
            graphNodes[nodeId] = {
                name: node.description,
            };

            // Add children to queue and create edges
            for (const transition of node.transitions) {
                if (!visited.has(transition.nextNodeId)) {
                    queue.push({ nodeId: transition.nextNodeId, level: level + 1 });
                }

                // Create edge
                const edgeId = `${nodeId}-${transition.nextNodeId}`;
                graphEdges[edgeId] = {
                    source: nodeId,
                    target: transition.nextNodeId,
                };
            }
        }
    }

    function sortTerminalNodes(nodes: Record<string, Node>, terminalNodes: string[]): string[] {
        return terminalNodes.sort((a, b) => {
            const nodeA = nodes[a]!;
            const nodeB = nodes[b]!;
            return (nodeB.playerReward?.value ?? 0) - (nodeA.playerReward?.value ?? 0);
        });
    }
    /**
     * Build graph data from GameTree using BFS for tree layout.
     */
    function buildGraphData() {
        // Clear existing data
        Object.keys(graphNodes).forEach((key) => delete graphNodes[key]);
        Object.keys(graphEdges).forEach((key) => delete graphEdges[key]);
        Object.keys(layouts.nodes).forEach((key) => delete layouts.nodes[key]);

        const rootNode = props.gameTree.nodes[props.gameTree.root];
        if (!rootNode) {
            return; 
        }

        const terminalNodes: string[] = [];
        const levelNodes = new Map<number, string[]>();

        // BFS traversal that populates graph data and gathers level info
        bfsBuildGraphData(
            rootNode.nodeId,
            props.gameTree.nodes,
            levelNodes,
            terminalNodes,
            graphNodes,
            graphEdges
        );

        const topLeftX = nodeWidth / 2 + 20;
        const topLeftY = nodeHeight / 2 + 20;
        // Calculate layout positions
        let maxLevel = 0;
        for (const [level, nodeIds] of levelNodes.entries()) {
            const x = topLeftX + level * levelGap;
            maxLevel = Math.max(maxLevel, level);

            nodeIds.forEach((nodeId, index) => {
                layouts.nodes[nodeId] = {
                    x,
                    y: topLeftY + index * nodeGap,
                };
            });
        }

        const sortedTerminalNodes = sortTerminalNodes(props.gameTree.nodes, terminalNodes);
        let index = 0;
        for (const terminalNode of sortedTerminalNodes) {
            layouts.nodes[terminalNode] = {
                x: topLeftX + (maxLevel + 1) * levelGap,
                y: topLeftY + index * nodeGap,
            };
            index++;
        }
    }

    // Watch for gameTree changes
    watch(
        () => props.gameTree,
        () => {
            buildGraphData();
        },
        { deep: true, immediate: true }
    );

    // Sync selectedNodes with gameTreeStore
    watch(
        selectedNodes,
        (newValue) => {
            const nodeId = newValue.length > 0 ? newValue[0] : null;
            if (nodeId && nodeId !== gameTreeStore.selectedNodeId) {
                gameTreeStore.selectNode(nodeId);
            }
        }
    );

    // Sync from store to local selectedNodes
    watch(
        () => gameTreeStore.selectedNodeId,
        (newValue) => {
            if (newValue) {
                if (selectedNodes.value.length !== 1 || selectedNodes.value[0] !== newValue) {
                    selectedNodes.value = [newValue];
                }
            } else {
                if (selectedNodes.value.length > 0) {
                    selectedNodes.value = [];
                }
            }
        },
        { immediate: true }
    );

</script>

<style scoped>
.game-tree-visualization {
  padding: 20px;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.game-tree-header {
  display: flex;
  align-items: baseline;
  margin-bottom: 10px;
}

.game-tree-title {
  font-size: 16px;
}

.tree-stats {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: 10px;
}

.graph-container {
  flex: 1;
  border: 1px solid var(--border-primary);
  border-radius: 4px;
  overflow: hidden;
  background-color: var(--bg-tertiary);
}

.graph-container :deep(.v-network-graph) {
  width: 100%;
  height: 100%;
}

.node-rect {
  cursor: pointer;
  transition: opacity 0.2s;
}

.node-rect:hover {
  opacity: 0.8;
}
</style>
