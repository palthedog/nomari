<template>
  <div class="game-tree-visualization">
    <h3>ゲーム木の可視化</h3>
    <div class="svg-container">
      <svg
        :width="svgWidth"
        :height="svgHeight"
        class="tree-svg"
      >
        <!-- ノードとエッジを描画 -->
        <g
          v-for="nodeData in nodePositions"
          :key="nodeData.node.id"
        >
          <!-- エッジ（遷移） -->
          <line
            v-for="edge in nodeData.edges"
            :key="`${nodeData.node.id}-${edge.to}`"
            :x1="nodeData.x"
            :y1="nodeData.y"
            :x2="edge.x"
            :y2="edge.y"
            stroke="#666"
            stroke-width="2"
            marker-end="url(#arrowhead)"
          />
        </g>
        
        <!-- ノード -->
        <g
          v-for="nodeData in nodePositions"
          :key="nodeData.node.id"
        >
          <rect
            :x="nodeData.x - 60"
            :y="nodeData.y - 30"
            :width="120"
            :height="60"
            :fill="nodeData.node.id === rootNodeId ? '#4CAF50' : '#2196F3'"
            stroke="#333"
            stroke-width="2"
            rx="5"
            class="node-rect"
            @click="selectNode(nodeData.node.id)"
          />
          <text
            :x="nodeData.x"
            :y="nodeData.y - 10"
            text-anchor="middle"
            fill="white"
            font-weight="bold"
            font-size="12"
          >
            {{ nodeData.node.id }}
          </text>
          <text
            :x="nodeData.x"
            :y="nodeData.y + 10"
            text-anchor="middle"
            fill="white"
            font-size="10"
          >
            {{ truncate(nodeData.node.description, 15) }}
          </text>
        </g>
        
        <!-- 矢印マーカー -->
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3, 0 6"
              fill="#666"
            />
          </marker>
        </defs>
      </svg>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import type { GameTree, Node } from '@mari/game-tree/game-tree';

const props = defineProps<{
  gameTree: GameTree;
}>();

const svgWidth = ref(800);
const svgHeight = ref(600);

const rootNodeId = computed(() => props.gameTree.root);

interface NodePosition {
  node: Node;
  x: number;
  y: number;
  level: number;
  edges: Array<{ to: string; x: number; y: number }>;
}

const nodePositions = ref<NodePosition[]>([]);

function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
}

function calculateLayout() {
  const positions = new Map<string, NodePosition>();
  const levelWidth = 200;
  const levelHeight = 150;
  const startX = 100;
  const startY = 100;

  function layoutNode(node: Node, level: number, index: number): NodePosition {
    const nodeId = node.id;
    
    if (positions.has(nodeId)) {
      return positions.get(nodeId)!;
    }

    const x = startX + level * levelWidth;
    const y = startY + (index * levelHeight);
    
    const nodePos: NodePosition = {
      node,
      x,
      y,
      level,
      edges: []
    };

    positions.set(nodeId, nodePos);

    // 子ノードを処理（簡易実装: 遷移先ノードIDのみ）
    // 実際の実装では、nextNodeIdからノードを検索する必要がある
    // 現在はルートノードのみ表示

    return nodePos;
  }

  // ルートノードを配置
  const rootNode = props.gameTree.nodes[props.gameTree.root];
  if (rootNode) {
    const rootPos = layoutNode(rootNode, 0, 0);
    positions.set(rootNode.id, rootPos);
  }

  // エッジ情報を追加（簡易実装）
  // 実際の実装では、遷移先ノードを検索して配置する必要がある

  nodePositions.value = Array.from(positions.values());
  
  // SVGサイズを調整
  if (nodePositions.value.length > 0) {
    const maxX = Math.max(...nodePositions.value.map(p => p.x)) + 100;
    const maxY = Math.max(...nodePositions.value.map(p => p.y)) + 100;
    svgWidth.value = Math.max(800, maxX);
    svgHeight.value = Math.max(600, maxY);
  }
}

function selectNode(nodeId: string) {
  // ノード選択時の処理（必要に応じてemit）
  console.log('Selected node:', nodeId);
}

onMounted(() => {
  calculateLayout();
});

watch(() => props.gameTree, () => {
  calculateLayout();
}, { deep: true });
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
  margin-bottom: 20px;
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

.node-rect {
  cursor: pointer;
}

.node-rect:hover {
  opacity: 0.8;
}
</style>
