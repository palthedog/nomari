<template>
  <div class="game-tree-editor">
    <div class="header">
      <h2>GameTree エディタ</h2>
      <div class="header-controls">
        <div class="form-group">
          <label>GameTree ID:</label>
          <input v-model="gameTree.id" type="text" />
        </div>
      </div>
    </div>

    <div class="content">
      <div class="nodes-panel">
        <h3>ノード一覧</h3>
        <button @click="addNode" type="button">ノードを追加</button>
        <ul class="node-list">
          <li
            v-for="node in allNodes"
            :key="node.id"
            :class="{ active: selectedNodeId === node.id }"
            @click="selectNode(node.id)"
          >
            {{ node.description || '(説明なし)' }}
          </li>
        </ul>
      </div>

      <div class="editor-panel">
        <NodeEditor
          v-if="selectedNode"
          :node="selectedNode"
          :available-nodes="allNodes"
          :is-root-node="selectedNodeId === gameTree.root.id"
          @update:node="updateNode"
          @delete="deleteNode"
        />
        <div v-else class="no-selection">
          ノードを選択してください
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import type { GameTree, Node } from '../types';
import { generateNodeId } from '../utils/treeUtils';
import NodeEditor from './NodeEditor.vue';

const props = defineProps<{
  modelValue: GameTree;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', tree: GameTree): void;
}>();

const gameTree = ref<GameTree>({ ...props.modelValue });
const selectedNodeId = ref<string>(props.modelValue.root.id);
// 追加ノードのプール（GameTree構造外で管理）
const additionalNodes = ref<Map<string, Node>>(new Map());

watch(() => props.modelValue, (newTree) => {
  gameTree.value = { ...newTree };
  // 追加ノードは保持（propsには含まれない）
}, { deep: true });

watch(gameTree, (newTree) => {
  emit('update:modelValue', newTree);
}, { deep: true });

function collectAllNodes(node: Node, nodeMap: Map<string, Node> = new Map(), visited: Set<string> = new Set()): Map<string, Node> {
  if (visited.has(node.id)) {
    return nodeMap;
  }
  visited.add(node.id);
  nodeMap.set(node.id, node);
  
  for (const transition of node.transitions) {
    if (transition.nextNodeId && !transition.isTerminal) {
      const nextNode = additionalNodes.value.get(transition.nextNodeId);
      if (nextNode && !visited.has(nextNode.id)) {
        collectAllNodes(nextNode, nodeMap, visited);
      }
    }
  }
  return nodeMap;
}

const allNodes = computed(() => {
  const nodeMap = collectAllNodes(gameTree.value.root);
  // 追加ノードも含める（遷移で参照されていないノードも表示）
  additionalNodes.value.forEach((node) => {
    if (!nodeMap.has(node.id)) {
      nodeMap.set(node.id, node);
    }
  });
  return Array.from(nodeMap.values());
});

const selectedNode = computed(() => {
  if (selectedNodeId.value === gameTree.value.root.id) {
    return gameTree.value.root;
  }
  return additionalNodes.value.get(selectedNodeId.value) || null;
});

function selectNode(nodeId: string) {
  selectedNodeId.value = nodeId;
}

function addNode() {
  const newNode: Node = {
    id: generateNodeId('node'),
    description: '',
    transitions: []
  };
  
  additionalNodes.value.set(newNode.id, newNode);
  selectedNodeId.value = newNode.id;
}

function updateNode(updatedNode: Node) {
  if (updatedNode.id === gameTree.value.root.id) {
    Object.assign(gameTree.value.root, updatedNode);
  } else {
    const node = additionalNodes.value.get(updatedNode.id);
    if (node) {
      Object.assign(node, updatedNode);
    } else {
      // 新しいノードとして追加
      additionalNodes.value.set(updatedNode.id, { ...updatedNode });
    }
  }
}

function deleteNode() {
  const nodeId = selectedNodeId.value;
  if (nodeId === gameTree.value.root.id) {
    return; // Cannot delete root
  }
  
  // Remove from additional nodes
  additionalNodes.value.delete(nodeId);
  
  // Remove from transitions in all nodes
  function removeNodeReferences(node: Node) {
    node.transitions = node.transitions.filter(t => t.nextNodeId !== nodeId);
  }
  
  removeNodeReferences(gameTree.value.root);
  additionalNodes.value.forEach(node => {
    removeNodeReferences(node);
  });
  
  if (selectedNodeId.value === nodeId) {
    selectedNodeId.value = gameTree.value.root.id;
  }
}
</script>

<style scoped>
.game-tree-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.header {
  padding: 20px;
  background-color: #f5f5f5;
  border-bottom: 1px solid #ddd;
}

.header h2 {
  margin: 0 0 15px 0;
}

.header-controls {
  display: flex;
  gap: 20px;
}

.form-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.form-group label {
  font-weight: bold;
}

.form-group input {
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.nodes-panel {
  width: 300px;
  border-right: 1px solid #ddd;
  padding: 20px;
  overflow-y: auto;
}

.nodes-panel h3 {
  margin-top: 0;
}

.nodes-panel button {
  width: 100%;
  padding: 10px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 15px;
}

.node-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.node-list li {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 8px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.node-list li:hover {
  background-color: #f0f0f0;
}

.node-list li.active {
  background-color: #2196F3;
  color: white;
}

.editor-panel {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.no-selection {
  text-align: center;
  padding: 50px;
  color: #999;
}
</style>
