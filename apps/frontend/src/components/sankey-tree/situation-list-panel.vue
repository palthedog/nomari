<template>
  <div class="situation-list-panel">
    <h3 class="panel-title">
      Situation一覧
    </h3>
    <div class="situation-groups">
      <div
        v-for="group in situationGroups"
        :key="group.situationId"
        class="situation-group"
      >
        <button
          type="button"
          class="group-header"
          @click="toggleGroup(group.situationId)"
        >
          <v-icon
            :icon="isExpanded(group.situationId) ? 'mdi-chevron-down' : 'mdi-chevron-right'"
            class="chevron-icon"
          />
          <span class="group-name">{{ group.situationName }}</span>
          <span class="node-count">({{ group.nodes.length }})</span>
        </button>

        <div
          v-show="isExpanded(group.situationId)"
          class="node-list"
        >
          <button
            v-for="item in group.nodes"
            :key="item.nodeId"
            type="button"
            class="node-item"
            :class="{
              'node-item--selected': selectedNodeId === item.nodeId,
              'node-item--combo-starter': item.isComboStarter
            }"
            @click="$emit('select-node', item.nodeId)"
          >
            <span class="node-hp">
              HP {{ formatHealth(item.node.state.playerHealth) }}/{{ formatHealth(item.node.state.opponentHealth) }}
            </span>
            <span
              v-if="item.isComboStarter"
              class="combo-badge"
            >コンボ</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { GameTree, Node } from '@nomari/game-tree/game-tree';

interface SituationGroup {
    situationId: number;
    situationName: string;
    nodes: Array<{
        nodeId: string;
        node: Node;
        isComboStarter: boolean;
    }>;
}

const props = defineProps<{
    gameTree: GameTree;
    selectedNodeId: string | null;
}>();

defineEmits<{
    (e: 'select-node', nodeId: string): void;
}>();

const expandedGroups = ref<Set<number>>(new Set());

function isComboStarter(node: Node): boolean {
    return (
        node.opponentActions?.actions.length === 1 &&
        node.opponentActions.actions[0].name === '被コンボ'
    );
}

function isTerminal(node: Node): boolean {
    return node.playerReward !== undefined;
}

const situationGroups = computed<SituationGroup[]>(() => {
    const groups = new Map<number, SituationGroup>();

    for (const [nodeId, node] of Object.entries(props.gameTree.nodes)) {
        if (isTerminal(node)) {
            continue;
        }

        const situationId = node.state.situation_id ?? 0;

        if (!groups.has(situationId)) {
            groups.set(situationId, {
                situationId,
                situationName: node.name ?? `Situation ${situationId}`,
                nodes: []
            });
        }

        groups.get(situationId)!.nodes.push({
            nodeId,
            node,
            isComboStarter: isComboStarter(node)
        });
    }

    // Sort nodes within each group by HP
    for (const group of groups.values()) {
        group.nodes.sort((a, b) => {
            const hpDiffA = a.node.state.playerHealth - a.node.state.opponentHealth;
            const hpDiffB = b.node.state.playerHealth - b.node.state.opponentHealth;
            return hpDiffB - hpDiffA;
        });
    }

    // Auto-expand the group containing the selected node
    if (props.selectedNodeId) {
        const selectedNode = props.gameTree.nodes[props.selectedNodeId];
        if (selectedNode && !isTerminal(selectedNode)) {
            const situationId = selectedNode.state.situation_id ?? 0;
            expandedGroups.value.add(situationId);
        }
    }

    return Array.from(groups.values()).sort((a, b) => a.situationId - b.situationId);
});

function toggleGroup(situationId: number) {
    if (expandedGroups.value.has(situationId)) {
        expandedGroups.value.delete(situationId);
    } else {
        expandedGroups.value.add(situationId);
    }
}

function isExpanded(situationId: number): boolean {
    return expandedGroups.value.has(situationId);
}

function formatHealth(health: number): string {
    return (health / 1000).toFixed(1) + 'k';
}
</script>

<style scoped>
.situation-list-panel {
    padding: 12px;
}

.panel-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 12px;
    padding-left: 4px;
}

.situation-groups {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.situation-group {
    border-radius: var(--radius-sm);
    overflow: hidden;
}

.group-header {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 8px 10px;
    background: var(--bg-tertiary);
    border: none;
    border-radius: var(--radius-sm);
    color: var(--text-primary);
    font-family: var(--font-family-ui);
    font-size: 0.8125rem;
    font-weight: 500;
    cursor: pointer;
    transition: background var(--transition-fast);
    text-align: left;
}

.group-header:hover {
    background: var(--bg-hover);
}

.chevron-icon {
    font-size: 18px !important;
    color: var(--text-tertiary);
    flex-shrink: 0;
}

.group-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.node-count {
    color: var(--text-tertiary);
    font-size: 0.75rem;
}

.node-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px 0 4px 24px;
}

.node-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 10px;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius-sm);
    color: var(--text-secondary);
    font-family: var(--font-family-ui);
    font-size: 0.75rem;
    cursor: pointer;
    transition: all var(--transition-fast);
    text-align: left;
    width: 100%;
}

.node-item:hover {
    background: var(--bg-tertiary);
    color: var(--text-primary);
}

.node-item--selected {
    background: var(--situation-bg);
    border-color: var(--situation);
    color: var(--text-primary);
}

.node-item--combo-starter {
    color: var(--gold-primary);
}

.node-item--combo-starter.node-item--selected {
    background: var(--bg-warning);
    border-color: var(--gold-primary);
}

.node-hp {
    font-family: var(--font-family-mono);
}

.combo-badge {
    font-size: 0.625rem;
    padding: 1px 4px;
    background: var(--gold-dark);
    color: white;
    border-radius: 2px;
}
</style>
