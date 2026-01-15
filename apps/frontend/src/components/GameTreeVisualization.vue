<template>
  <div class="game-tree-visualization">
    <div class="game-tree-header">
      <div class="game-tree-title">ゲーム木</div>
      <div class="tree-stats">
        <span>ノード数: {{ nodeCount }}</span>
      </div>
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
          :class="{ selected: isSelectedNode(nodeData.node.nodeId) }" @click="selectNode(nodeData.node.nodeId)">
          <rect :x="nodeData.x - nodeWidth / 2" :y="nodeData.y - nodeHeight / 2" :width="nodeWidth" :height="nodeHeight"
            :fill="getNodeColor(nodeData)" :stroke="getNodeStroke(nodeData.node.nodeId)"
            :stroke-width="getNodeStrokeWidth(nodeData.node.nodeId)" rx="5" class="node-rect" />
          <!-- Node type indicator -->
          <text :x="nodeData.x" :y="nodeData.y - 20" text-anchor="middle" fill="white" font-weight="bold"
            font-size="11">
            {{ getNodeTypeLabel(nodeData) }}
          </text>
          <!-- Name or Description -->
          <text :x="nodeData.x" :y="nodeData.y" text-anchor="middle" fill="white" font-size="10">
            {{ truncate(getNodeDisplayText(nodeData), 18) }}
          </text>
          <!-- HP info -->
          <text :x="nodeData.x" :y="nodeData.y + 15" text-anchor="middle" fill="white" font-size="9">
            HP: {{ nodeData.node.state.playerHealth }} / {{ nodeData.node.state.opponentHealth }}
          </text>
          <!-- Reward info (only for terminal nodes) -->
          <text v-if="isTerminalNode(nodeData.node)" :x="nodeData.x" :y="nodeData.y + 28" text-anchor="middle"
            :fill="getRewardColor(nodeData.node.playerReward?.value)" font-size="9" font-weight="bold">
            報酬: {{ formatReward(nodeData.node.playerReward?.value) }}
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
  selectedNodeId: string | null;
}>();

const emit = defineEmits<{
  'node-select': [nodeId: string];
}>();

const nodeWidth = 140;
const nodeHeight = 70;
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
 * Format reward value for display.
 */
function formatReward(value: number | undefined): string {
  if (value === undefined) return '-';
  return Math.round(value).toLocaleString();
}

/**
 * Get the color for reward text based on value.
 */
function getRewardColor(value: number | undefined): string {
  if (value === undefined) return '#FFD700'; // Gold
  if (value < 0) return '#FF6B6B'; // Red for negative
  return '#FFD700'; // Gold for positive/zero
}

/**
 * Check if a node is a terminal node (has rewards).
 */
function isTerminalNode(node: Node): boolean {
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
  return isTerminalNode(node) && !isPlayerHealthZero(node) && !isOpponentHealthZero(node);
}

/**
 * Get the fill color for a node based on its type.
 */
function getNodeColor(nodeData: NodePosition): string {
  const node = nodeData.node;

  // Root node
  if (node.nodeId === rootNodeId.value) {
    return '#4CAF50'; // Green
  }

  // Health-based terminal states (fill with color)
  if (isPlayerHealthZero(node) && !isOpponentHealthZero(node)) {
    return '#E53935'; // Red - lose (player health is 0)
  }
  if (isOpponentHealthZero(node) && !isPlayerHealthZero(node)) {
    return '#43A047'; // Green - win (opponent health is 0)
  }
  if (isPlayerHealthZero(node) && isOpponentHealthZero(node)) {
    return '#FF9800'; // Orange - draw (both health is 0)
  }

  // Other terminal nodes (TerminalSituation) - dark gray
  if (isOtherTerminalNode(node)) {
    return '#616161'; // Dark gray
  }

  // Regular node
  return '#2196F3'; // Blue
}

/**
 * Get the display text for a node (name for other terminal nodes, description otherwise).
 */
function getNodeDisplayText(nodeData: NodePosition): string {
  const node = nodeData.node;

  // Other terminal nodes show name instead of description
  if (isOtherTerminalNode(node) && node.name) {
    return node.name;
  }

  return node.description;
}

/**
 * Get the label for a node type.
 */
function getNodeTypeLabel(nodeData: NodePosition): string {
  const node = nodeData.node;

  if (node.nodeId === rootNodeId.value) {
    return 'Root';
  }

  // Health-based terminal states
  if (isPlayerHealthZero(node) && !isOpponentHealthZero(node)) {
    return 'Lose';
  }
  if (isOpponentHealthZero(node) && !isPlayerHealthZero(node)) {
    return 'Win';
  }
  if (isPlayerHealthZero(node) && isOpponentHealthZero(node)) {
    return 'Draw';
  }

  // Other terminal nodes
  if (isTerminalNode(node)) {
    return 'Terminal';
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
  emit('node-select', nodeId);
}

/**
 * Check if a node is currently selected.
 */
function isSelectedNode(nodeId: string): boolean {
  return props.selectedNodeId === nodeId;
}

/**
 * Get the stroke color for a node (highlight if selected).
 */
function getNodeStroke(nodeId: string): string {
  return isSelectedNode(nodeId) ? '#FFD700' : '#333';
}

/**
 * Get the stroke width for a node (thicker if selected).
 */
function getNodeStrokeWidth(nodeId: string): number {
  return isSelectedNode(nodeId) ? 4 : 2;
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

.game-tree-header {
  display: flex;
  align-items: baseline;
}

.game-tree-title {
  font-size: 16px;
}

.tree-stats {
  font-size: 12px;
  color: #666;
  margin-left: 10px;
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

.node-group.selected .node-rect {
  filter: drop-shadow(0 0 6px #FFD700);
}
</style>
