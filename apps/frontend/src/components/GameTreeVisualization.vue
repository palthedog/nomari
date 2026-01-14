<template>
  <div class="game-tree-visualization">
    <h3>ゲーム木の可視化</h3>
    <div class="tree-stats">
      <span>ノード数: {{ nodeCount }}</span>
    </div>
    <div class="svg-container">
      <svg :width="svgWidth" :height="svgHeight" class="tree-svg">
        <!-- Defs for markers -->
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#666" />
          </marker>
        </defs>

        <!-- Edges (draw first so they appear behind nodes) -->
        <g class="edges">
          <line v-for="edge in edges" :key="edge.id" :x1="edge.x1" :y1="edge.y1" :x2="edge.x2" :y2="edge.y2"
            stroke="#999" stroke-width="2" marker-end="url(#arrowhead)" />
        </g>

        <!-- Nodes -->
        <g v-for="nodeData in nodePositions" :key="nodeData.node.nodeId" class="node-group"
          @click="selectNode(nodeData.node.nodeId)">
          <rect :x="nodeData.x - nodeWidth / 2" :y="nodeData.y - nodeHeight / 2" :width="nodeWidth" :height="nodeHeight"
            :fill="getNodeColor(nodeData)" stroke="#333" stroke-width="2" rx="5" class="node-rect" />
          <!-- Node type indicator -->
          <text :x="nodeData.x" :y="nodeData.y - 20" text-anchor="middle" fill="white" font-weight="bold"
            font-size="11">
            {{ getNodeTypeLabel(nodeData) }}
          </text>
          <!-- Description -->
          <text :x="nodeData.x" :y="nodeData.y" text-anchor="middle" fill="white" font-size="10">
            {{ truncate(nodeData.node.description, 18) }}
          </text>
          <!-- HP info -->
          <text :x="nodeData.x" :y="nodeData.y + 18" text-anchor="middle" fill="white" font-size="9">
            HP: {{ nodeData.node.state.playerHealth }} / {{ nodeData.node.state.opponentHealth }}
          </text>
        </g>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { GameTree, Node } from '@mari/game-tree/game-tree';

const props = defineProps<{
  gameTree: GameTree;
}>();

const nodeWidth = 140;
const nodeHeight = 60;
const levelGap = 180;
const nodeGap = 80;
const startX = 100;
const startY = 60;

const svgWidth = ref(800);
const svgHeight = ref(600);

interface NodePosition {
  node: Node;
  x: number;
  y: number;
  level: number;
}

interface Edge {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

const nodePositions = ref<NodePosition[]>([]);
const edges = ref<Edge[]>([]);

const nodeCount = computed(() => Object.keys(props.gameTree.nodes).length);

const rootNodeId = computed(() => props.gameTree.root);

/**
 * Truncate a string to a specified length.
 */
function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
}

/**
 * Check if a node is a terminal node (has rewards).
 */
function isTerminalNode(node: Node): boolean {
  return node.playerReward !== undefined || node.opponentReward !== undefined;
}

/**
 * Get the color for a node based on its type.
 */
function getNodeColor(nodeData: NodePosition): string {
  const node = nodeData.node;

  // Root node
  if (node.nodeId === rootNodeId.value) {
    return '#4CAF50'; // Green
  }

  // Terminal node (has rewards)
  if (isTerminalNode(node)) {
    const reward = node.playerReward?.value ?? 0;
    if (reward > 0) {
      return '#8BC34A'; // Light green - win
    } else if (reward < 0) {
      return '#F44336'; // Red - lose
    } else {
      return '#FF9800'; // Orange - draw
    }
  }

  // Regular node
  return '#2196F3'; // Blue
}

/**
 * Get the label for a node type.
 */
function getNodeTypeLabel(nodeData: NodePosition): string {
  const node = nodeData.node;

  if (node.nodeId === rootNodeId.value) {
    return 'Root';
  }

  if (isTerminalNode(node)) {
    const reward = node.playerReward?.value ?? 0;
    if (reward > 0) {
      return 'Win';
    } else if (reward < 0) {
      return 'Lose';
    } else {
      return 'Draw';
    }
  }

  return 'Node';
}

/**
 * Calculate the layout of all nodes using BFS.
 */
function calculateLayout() {
  const positions = new Map<string, NodePosition>();
  const edgeList: Edge[] = [];

  // Track which level each node is at and which nodes are at each level
  const levelNodes: Map<number, string[]> = new Map();
  const nodeLevel: Map<string, number> = new Map();

  // BFS to determine levels
  const rootNode = props.gameTree.nodes[props.gameTree.root];
  if (!rootNode) {
    nodePositions.value = [];
    edges.value = [];
    return;
  }

  const queue: Array<{ nodeId: string; level: number }> = [
    { nodeId: rootNode.nodeId, level: 0 },
  ];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const { nodeId, level } = queue.shift()!;

    if (visited.has(nodeId)) {
      continue;
    }
    visited.add(nodeId);

    nodeLevel.set(nodeId, level);

    if (!levelNodes.has(level)) {
      levelNodes.set(level, []);
    }
    levelNodes.get(level)!.push(nodeId);

    const node = props.gameTree.nodes[nodeId];
    if (!node) continue;

    // Add children to queue
    for (const transition of node.transitions) {
      if (!visited.has(transition.nextNodeId)) {
        queue.push({ nodeId: transition.nextNodeId, level: level + 1 });
      }
    }
  }

  // Calculate positions for each node
  for (const [level, nodeIds] of levelNodes.entries()) {
    const x = startX + level * levelGap;
    const totalHeight = (nodeIds.length - 1) * nodeGap;
    const startYForLevel = startY + (svgHeight.value - totalHeight) / 2;

    nodeIds.forEach((nodeId, index) => {
      const node = props.gameTree.nodes[nodeId];
      if (!node) return;

      const y = startYForLevel + index * nodeGap;

      positions.set(nodeId, {
        node,
        x,
        y,
        level,
      });
    });
  }

  // Create edges
  for (const [, nodePos] of positions.entries()) {
    for (const transition of nodePos.node.transitions) {
      const targetPos = positions.get(transition.nextNodeId);
      if (targetPos) {
        // Calculate edge endpoints to start/end at node boundaries
        const x1 = nodePos.x + nodeWidth / 2;
        const y1 = nodePos.y;
        const x2 = targetPos.x - nodeWidth / 2 - 10; // -10 for arrowhead
        const y2 = targetPos.y;

        edgeList.push({
          id: `${nodePos.node.nodeId}-${transition.nextNodeId}`,
          x1,
          y1,
          x2,
          y2,
        });
      }
    }
  }

  nodePositions.value = Array.from(positions.values());
  edges.value = edgeList;

  // Adjust SVG size based on content
  if (nodePositions.value.length > 0) {
    const maxX = Math.max(...nodePositions.value.map((p) => p.x)) + nodeWidth / 2 + 50;
    const maxY = Math.max(...nodePositions.value.map((p) => p.y)) + nodeHeight / 2 + 50;
    const minY = Math.min(...nodePositions.value.map((p) => p.y)) - nodeHeight / 2;

    svgWidth.value = Math.max(800, maxX);
    svgHeight.value = Math.max(600, maxY - Math.min(0, minY) + 50);

    // Adjust y positions if needed
    if (minY < nodeHeight / 2 + 20) {
      const offset = nodeHeight / 2 + 20 - minY;
      for (const pos of nodePositions.value) {
        pos.y += offset;
      }
      for (const edge of edges.value) {
        edge.y1 += offset;
        edge.y2 += offset;
      }
      svgHeight.value += offset;
    }
  }
}

function selectNode(nodeId: string) {
  // Node selection handler (for future use)
  console.log('Selected node:', nodeId);
}

// Calculate layout when gameTree changes
watch(
  () => props.gameTree,
  () => {
    calculateLayout();
  },
  { deep: true, immediate: true }
);
</script>

<style scoped>
.game-tree-visualization {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.game-tree-visualization h3 {
  margin-top: 0;
  margin-bottom: 10px;
}

.tree-stats {
  margin-bottom: 10px;
  font-size: 12px;
  color: #666;
}

.svg-container {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 4px;
  overflow: auto;
  background-color: #f9f9f9;
}

.tree-svg {
  display: block;
}

.node-group {
  cursor: pointer;
}

.node-rect {
  transition: opacity 0.2s;
}

.node-group:hover .node-rect {
  opacity: 0.8;
}
</style>
