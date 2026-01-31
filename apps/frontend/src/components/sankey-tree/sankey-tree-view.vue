<template>
  <div
    ref="containerRef"
    class="sankey-tree-view"
  >
    <div class="svg-container">
      <svg
        :width="svgWidth"
        :height="svgHeight"
        :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
      >
        <!-- Source node bounding box -->
        <rect
          v-if="sourceBoundingBox"
          :x="sourceBoundingBox.x"
          :y="sourceBoundingBox.y"
          :width="sourceBoundingBox.width"
          :height="sourceBoundingBox.height"
          :rx="6"
          :fill="sourceBoxColor"
          class="source-bounding-box"
          @mouseenter="showNodeTooltip(selectedNode.nodeId, $event)"
          @mouseleave="hideTooltip"
        />

        <!-- Title -->
        <g class="title-group">
          <text
            :x="20"
            :y="28"
            class="source-title"
          >
            {{ selectedNode.name ?? 'Node' }}
          </text>
          <text
            :x="20"
            :y="46"
            class="source-subtitle"
          >
            HP {{ formatHealth(selectedNode.state.playerHealth) }} / {{ formatHealth(selectedNode.state.opponentHealth) }}
          </text>
        </g>

        <!-- Flows (rendered first so boxes appear on top) -->
        <g class="flows">
          <g
            v-for="(flow, flowIdx) in allFlows"
            :key="`flow-${flowIdx}`"
            class="flow-group"
          >
            <path
              :d="flow.path"
              :fill="flow.color"
              :fill-opacity="hoveredFlow === flowIdx ? 1 : 0.6"
              class="flow-path"
              @click="$emit('select-node', flow.targetNodeId)"
              @mouseenter="showFlowTooltip(flowIdx)"
              @mouseleave="hideTooltip"
            />
          </g>
        </g>

        <!-- Player action boxes -->
        <g class="player-boxes">
          <g
            v-for="(row, rowIdx) in playerRows"
            :key="`player-${rowIdx}`"
            class="player-row"
          >
            <rect
              :x="playerBoxX"
              :y="row.y"
              :width="playerBoxWidth"
              :height="row.height"
              :fill="getPlayerActionColor(rowIdx)"
              rx="2"
              class="player-box"
            />
            <text
              :x="playerBoxX - 8"
              :y="row.y + row.height / 2 - 6"
              text-anchor="end"
              dominant-baseline="middle"
              class="player-label"
            >
              {{ row.actionName }}
            </text>
            <text
              :x="playerBoxX - 8"
              :y="row.y + row.height / 2 + 12"
              text-anchor="end"
              dominant-baseline="middle"
              class="player-prob"
            >
              {{ formatProb(row.probability) }}
            </text>
          </g>
        </g>

        <!-- Chain connections (lines between chain nodes) -->
        <g class="chain-connections">
          <line
            v-for="(conn, connIdx) in chainConnections"
            :key="`conn-${connIdx}`"
            :x1="conn.x1"
            :y1="conn.y1"
            :x2="conn.x2"
            :y2="conn.y2"
            :stroke="conn.color"
            :stroke-width="conn.strokeWidth"
            :stroke-opacity="hoveredChainConnection === connIdx ? 0.85 : 0.5"
            stroke-linecap="butt"
            class="chain-connection"
            @mouseenter="showChainConnectionTooltip(connIdx)"
            @mouseleave="hideTooltip"
          />
        </g>

        <!-- Chain nodes (small rectangles for intermediate nodes) -->
        <g class="chain-nodes">
          <g
            v-for="(chainNode, cnIdx) in chainNodes"
            :key="`chain-${cnIdx}`"
            class="chain-node"
            @click="$emit('select-node', chainNode.nodeId)"
            @mouseenter="showNodeTooltip(chainNode.nodeId, $event)"
            @mouseleave="hideTooltip"
          >
            <rect
              :x="chainNode.x"
              :y="chainNode.y"
              :width="chainNodeSize"
              :height="chainNode.height"
              :fill="getTargetColor(chainNode.node)"
              rx="3"
              class="chain-rect"
            />
          </g>
        </g>

        <!-- Target nodes -->
        <g class="target-nodes">
          <g
            v-for="(target, tIdx) in targetNodes"
            :key="`target-${tIdx}`"
            class="target-node"
            @click="$emit('select-node', target.nodeId)"
            @mouseenter="showNodeTooltip(target.nodeId, $event)"
            @mouseleave="hideTooltip"
          >
            <rect
              :x="targetBoxX"
              :y="target.y"
              :width="targetBoxWidth"
              :height="target.height"
              :fill="target.color"
              class="target-box"
            />
            <text
              :x="targetBoxX + targetBoxWidth + 10"
              :y="target.y + target.height / 2 - 5"
              dominant-baseline="middle"
              class="target-label"
            >
              {{ truncate(target.name, 16) }}
              <tspan class="target-hp">{{ target.state.playerHealth }}/{{ target.state.opponentHealth }}</tspan>
            </text>
            <text
              :x="targetBoxX + targetBoxWidth + 10"
              :y="target.y + target.height / 2 + 9"
              dominant-baseline="middle"
              class="target-prob"
            >
              {{ formatProb(target.totalProb) }}
            </text>
          </g>
        </g>

      </svg>

      <!-- HTML Tooltip -->
      <div
        v-if="activeTooltip"
        class="tooltip"
        :style="tooltipStyle"
      >
        <!-- Flow tooltip -->
        <template v-if="activeTooltip.type === 'flow'">
          <div class="tooltip-action">
            {{ (activeTooltip.data as FlowTooltipData).playerAction }} v.s. {{ (activeTooltip.data as FlowTooltipData).opponentAction }}
          </div>
          <div class="tooltip-target">
            → {{ (activeTooltip.data as FlowTooltipData).targetName }}
          </div>
          <div class="tooltip-prob">
            {{ formatProb((activeTooltip.data as FlowTooltipData).playerProb) }} * {{ formatProb((activeTooltip.data as FlowTooltipData).opponentProb) }} = {{ formatProb((activeTooltip.data as FlowTooltipData).reachProbability) }}
          </div>
        </template>

        <!-- Chain connection tooltip -->
        <template v-else-if="activeTooltip.type === 'chainConnection'">
          <div class="tooltip-action">
            {{ (activeTooltip.data as ChainConnectionTooltipData).label }}
          </div>
        </template>

        <!-- Node tooltip (common for start, chain, and target nodes) -->
        <template v-else-if="activeTooltip.type === 'node'">
          <div class="tooltip-action">
            {{ (activeTooltip.data as NodeTooltipData).name }}
          </div>
          <div class="tooltip-target">
            報酬期待値: {{ formatExpectedValue((activeTooltip.data as NodeTooltipData).expectedReward) }}
          </div>
          <div class="tooltip-target">
            与ダメ期待値: {{ formatExpectedValue((activeTooltip.data as NodeTooltipData).expectedDamageDealt) }}
          </div>
          <div class="tooltip-target">
            被ダメ期待値: {{ formatExpectedValue((activeTooltip.data as NodeTooltipData).expectedDamageReceived) }}
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { GameTree, Node } from '@nomari/game-tree/game-tree';
import type { StrategyData } from '@/workers/solver-types';
import type { ExpectedValuesMap } from '@/utils/expected-value-calculator';
import {
    isTerminal,
    isComboStarter,
    getPlayerActionName,
    getOpponentActionName,
    createProbabilityMap
} from '@/utils/node-helpers';

interface ChainNode {
    nodeId: string;
    node: Node;
    x: number;
    y: number;
    height: number;
}

interface ChainConnection {
    fromId: string;
    toId: string;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    strokeWidth: number;
    color: string;
    label: string; // Combo route name or action pair
}

interface FlowData {
    path: string;
    color: string;
    targetNodeId: string;
    playerActionName: string;
    opponentActionName: string;
    playerProb: number;
    opponentProb: number;
    targetName: string;
    probability: number;
    midX: number;
    midY: number;
}

interface FlowTooltipData {
    playerAction: string;
    opponentAction: string;
    targetName: string;
    playerProb: number;
    opponentProb: number;
    reachProbability: number;
}

interface ChainConnectionTooltipData {
    label: string;
}

interface NodeTooltipData {
    name: string;
    expectedReward: number | null;
    expectedDamageDealt: number | null;
    expectedDamageReceived: number | null;
}

type TooltipState =
    | { type: 'flow';
        x: number;
        y: number;
        data: FlowTooltipData }
    | { type: 'chainConnection';
        x: number;
        y: number;
        data: ChainConnectionTooltipData }
    | { type: 'node';
        x: number;
        y: number;
        data: NodeTooltipData };

interface PlayerRow {
    actionName: string;
    probability: number;
    y: number;
    height: number;
}

interface TargetNodeData {
    nodeId: string;
    name: string;
    color: string;
    y: number;
    height: number;
    totalProb: number;
    state: { playerHealth: number;
        opponentHealth: number };
}

const props = defineProps<{
    selectedNode: Node;
    gameTree: GameTree;
    strategy: StrategyData;
    allStrategies: Record<string, StrategyData>;
    expectedValues: ExpectedValuesMap | null;
}>();

defineEmits<{
    (e: 'select-node', nodeId: string): void;
}>();

const hoveredFlow = ref<number | null>(null);
const hoveredChainNode = ref<string | null>(null);
const hoveredChainConnection = ref<number | null>(null);
const containerRef = ref<HTMLElement | null>(null);
const containerWidth = ref(900);
const activeTooltip = ref<TooltipState | null>(null);

// Watch container size
let resizeObserver: ResizeObserver | null = null;
onMounted(() => {
    if (containerRef.value) {
        containerWidth.value = containerRef.value.clientWidth;
        resizeObserver = new ResizeObserver((entries) => {
            containerWidth.value = entries[0].contentRect.width;
        });
        resizeObserver.observe(containerRef.value);
    }
});
onUnmounted(() => {
    resizeObserver?.disconnect();
});

// Clear tooltip when selected node changes
watch(() => props.selectedNode, () => {
    hideTooltip();
});

// Layout constants
const svgWidth = computed(() => Math.max(800, containerWidth.value));
const topPadding = 70;
const playerBoxX = 110;
const playerBoxWidth = 8;
const baseFlowWidth = 300;
const chainNodeSize = 20;
const chainGap = 30;
const targetBoxWidth = 20;
const rowGap = 0;
const tooltipMargin = 10;

const playerActionColors = [
    '#E8C060', // Gold
    '#9B7EDE', // Purple
    '#20B2AA', // Teal
    '#F4A460', // Sandy brown
    '#DA70D6', // Orchid
];

function getPlayerActionColor(index: number): string {
    return playerActionColors[index % playerActionColors.length];
}

function getSignificantTargets(node: Node, strategy: StrategyData): Set<string> {
    const targets = new Set<string>();
    const playerProbMap = createProbabilityMap(strategy.playerStrategy);
    const opponentProbMap = createProbabilityMap(strategy.opponentStrategy);

    for (const t of node.transitions) {
        const playerProb = playerProbMap.get(t.playerActionId) ?? 0;
        const opponentProb = opponentProbMap.get(t.opponentActionId) ?? 0;
        const combinedProb = playerProb * opponentProb;

        if (combinedProb >= 0.005) {
            targets.add(t.nextNodeId);
        }
    }

    return targets;
}

function hasSingleDestination(node: Node, strategy: StrategyData | null): boolean {
    if (isTerminal(node)) {
        return false;
    }

    // Combo nodes: check if there's exactly one route with sufficient probability
    if (isComboStarter(node)) {
        if (!strategy) {
            return node.transitions.length === 1;
        }
        const targets = getSignificantTargets(node, strategy);
        return targets.size === 1;
    }

    // Normal situation nodes: check strategy
    if (!strategy) {
        return false;
    }

    const targets = getSignificantTargets(node, strategy);
    return targets.size === 1;
}

function getSingleDestination(node: Node, strategy: StrategyData | null): string | null {
    if (!hasSingleDestination(node, strategy)) {
        return null;
    }

    if (strategy) {
        const targets = getSignificantTargets(node, strategy);
        if (targets.size === 1) {
            return targets.values().next().value ?? null;
        }
    }

    // Fallback for combo nodes without strategy
    if (node.transitions.length === 1) {
        return node.transitions[0].nextNodeId;
    }

    return null;
}

function getTargetColor(node: Node): string {
    if (isTerminal(node)) {
        if (node.state.playerHealth <= 0) {
            return 'var(--opponent-combo)'; // Player loses
        }
        if (node.state.opponentHealth <= 0) {
            return 'var(--player-combo)'; // Player wins
        }
        return 'var(--terminal)'; // Draw/timeout
    }
    if (isComboStarter(node)) {
        return 'var(--player-combo)'; // Combo node
    }
    return 'var(--situation)'; // Situation node
}

function buildChainConnectionLabel(node: Node, nextNodeId: string): string {
    const transition = node.transitions.find(tr => tr.nextNodeId === nextNodeId);
    if (!transition) {
        return '';
    }
    if (isComboStarter(node)) {
        // Combo node: show combo route name
        return getPlayerActionName(node, transition.playerActionId);
    }
    // Situation node: show action pair
    const playerName = getPlayerActionName(node, transition.playerActionId);
    const opponentName = getOpponentActionName(node, transition.opponentActionId);
    return `${playerName} / ${opponentName}`;
}

interface NodeChain {
    chainNodes: Array<{
        nodeId: string;
        node: Node
    }>;
    finalNodeId: string;
    finalNode: Node;
}

function buildNodeChain(startNodeId: string): NodeChain {
    const chainNodes: Array<{
        nodeId: string;
        node: Node
    }> = [];
    let currentNodeId = startNodeId;
    let currentNode = props.gameTree.nodes[startNodeId];

    while (currentNode) {
        const strategy = props.allStrategies[currentNodeId] ?? null;

        chainNodes.push({
            nodeId: currentNodeId,
            node: currentNode
        });

        // Stop if terminal or has multiple destinations
        if (isTerminal(currentNode) || !hasSingleDestination(currentNode, strategy)) {
            break;
        }

        // Move to next node
        const nextNodeId = getSingleDestination(currentNode, strategy);
        if (!nextNodeId) {
            break;
        }

        currentNodeId = nextNodeId;
        currentNode = props.gameTree.nodes[currentNodeId];
    }

    const lastNode = chainNodes[chainNodes.length - 1];
    return {
        chainNodes,
        finalNodeId: lastNode.nodeId,
        finalNode: lastNode.node
    };
}

// Color palette for opponent actions
const opponentActionColors = [
    '#C9A35C', // gold/tan
    '#5AAF8A', // green
    '#4A6FA5', // blue
    '#D07070', // red
    '#9B7EDE', // purple
    '#E8C060', // yellow
    '#6BAED6', // light blue
    '#B87333', // copper
];

// Internal types for layout calculation
interface RawTransition {
    playerActionId: number;
    playerActionName: string;
    playerProb: number;
    opponentActionId: number;
    opponentActionName: string;
    opponentProb: number;
    combinedProb: number;
    chain: NodeChain;
    targetNodeId: string;
    targetNode: Node;
}

interface TargetTotalData {
    node: Node;
    totalProb: number;
    playerActions: Set<number>;
    flowCount: number;
}

interface PlayerRowPosition {
    y: number;
    height: number;
    currentY: number;
}

interface TargetPosition {
    y: number;
    height: number;
    currentY: number;
    flowCount: number;
}

interface ChainNodeBounds {
    nodeId: string;
    node: Node;
    x: number;
    minY: number;
    maxY: number;
    chainIndex: number;
}

interface LayoutContext {
    playerProbMap: Map<number, number>;
    opponentProbMap: Map<number, number>;
    playerActions: Array<{ actionId: number;
        name: string }>;
    opponentActions: Array<{ actionId: number;
        name: string }>;
}

function createLayoutContext(): LayoutContext {
    return {
        playerProbMap: createProbabilityMap(props.strategy.playerStrategy),
        opponentProbMap: createProbabilityMap(props.strategy.opponentStrategy),
        playerActions: props.selectedNode.playerActions?.actions ?? [],
        opponentActions: props.selectedNode.opponentActions?.actions ?? []
    };
}

// Collect all transitions with significant probability
function collectTransitions(ctx: LayoutContext): RawTransition[] {
    const rawTransitions: RawTransition[] = [];

    for (const t of props.selectedNode.transitions) {
        const playerAction = ctx.playerActions.find(a => a.actionId === t.playerActionId);
        const opponentAction = ctx.opponentActions.find(a => a.actionId === t.opponentActionId);
        const playerProb = ctx.playerProbMap.get(t.playerActionId) ?? 0;
        const opponentProb = ctx.opponentProbMap.get(t.opponentActionId) ?? 0;
        const combinedProb = playerProb * opponentProb;

        if (combinedProb < 0.005) {
            continue;
        }

        const chain = buildNodeChain(t.nextNodeId);

        rawTransitions.push({
            playerActionId: t.playerActionId,
            playerActionName: playerAction?.name ?? `Action ${t.playerActionId}`,
            playerProb,
            opponentActionId: t.opponentActionId,
            opponentActionName: opponentAction?.name ?? `Action ${t.opponentActionId}`,
            opponentProb,
            combinedProb,
            chain,
            targetNodeId: chain.finalNodeId,
            targetNode: chain.finalNode
        });
    }

    return rawTransitions;
}

// Get unique player actions (keep scenario definition order)
function buildPlayerActionMap(
    rawTransitions: RawTransition[],
    playerActions: Array<{ actionId: number;
        name: string }>
): { playerActionMap: Map<number, { name: string;
    prob: number }>;
sortedPlayerIds: number[] } {
    const playerActionMap = new Map<number, { name: string;
        prob: number }>();
    for (const t of rawTransitions) {
        if (!playerActionMap.has(t.playerActionId)) {
            playerActionMap.set(t.playerActionId, {
                name: t.playerActionName,
                prob: t.playerProb
            });
        }
    }

    // Use original definition order from playerActions
    const sortedPlayerIds = playerActions
        .map(a => a.actionId)
        .filter(id => playerActionMap.has(id));

    return {
        playerActionMap,
        sortedPlayerIds 
    };
}

// Build opponent action color map (sorted by probability for consistent coloring)
function buildOpponentColorMap(rawTransitions: RawTransition[]): Map<number, string> {
    const opponentActionProbs = new Map<number, number>();
    for (const t of rawTransitions) {
        const current = opponentActionProbs.get(t.opponentActionId) ?? 0;
        opponentActionProbs.set(t.opponentActionId, current + t.combinedProb);
    }

    const sortedOpponentIds = Array.from(opponentActionProbs.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id);

    const opponentColorMap = new Map<number, string>();
    sortedOpponentIds.forEach((id, idx) => {
        opponentColorMap.set(id, opponentActionColors[idx % opponentActionColors.length]);
    });

    return opponentColorMap;
}

// Collect target totals (including flow count for height calculation)
function collectTargetTotals(rawTransitions: RawTransition[]): Map<string, TargetTotalData> {
    const targetTotals = new Map<string, TargetTotalData>();

    for (const t of rawTransitions) {
        const existing = targetTotals.get(t.targetNodeId);
        if (existing) {
            existing.totalProb += t.combinedProb;
            existing.playerActions.add(t.playerActionId);
            existing.flowCount += 1;
        } else {
            targetTotals.set(t.targetNodeId, {
                node: t.targetNode,
                totalProb: t.combinedProb,
                playerActions: new Set([t.playerActionId]),
                flowCount: 1
            });
        }
    }

    return targetTotals;
}

function getNodeSortKey(node: Node): number {
    if (node.playerReward === undefined) {
        return 0; // Situation node
    }
    if (node.state.opponentHealth <= 0) {
        return 2; // Win
    }
    if (node.state.playerHealth <= 0) {
        return 3; // Lose
    }
    return 1; // Terminal (draw/other)
}

// Sort targets by node type and situation
function sortTargetIds(targetTotals: Map<string, TargetTotalData>): string[] {
    return Array.from(targetTotals.entries())
        .sort((a, b) => {
            const nodeA = a[1].node;
            const nodeB = b[1].node;

            // 1. Sort by node type
            const typeA = getNodeSortKey(nodeA);
            const typeB = getNodeSortKey(nodeB);
            if (typeA !== typeB) {
                return typeA - typeB;
            }

            // 2. Sort by situation_id (group same situations together)
            const sitA = nodeA.state.situation_id ?? 0;
            const sitB = nodeB.state.situation_id ?? 0;
            if (sitA !== sitB) {
                return sitA - sitB;
            }

            // 3. Sort by HP, OD, SA (player first, then opponent)
            if (nodeA.state.playerHealth !== nodeB.state.playerHealth) {
                return nodeB.state.playerHealth - nodeA.state.playerHealth;
            }
            if (nodeA.state.opponentHealth !== nodeB.state.opponentHealth) {
                return nodeB.state.opponentHealth - nodeA.state.opponentHealth;
            }
            if (nodeA.state.playerOd !== nodeB.state.playerOd) {
                return nodeB.state.playerOd - nodeA.state.playerOd;
            }
            if (nodeA.state.playerSa !== nodeB.state.playerSa) {
                return nodeB.state.playerSa - nodeA.state.playerSa;
            }

            return 0;
        })
        .map(([id]) => id);
}

// Group transitions by player action ID
function groupTransitionsByPlayer(rawTransitions: RawTransition[]): Map<number, RawTransition[]> {
    const result = new Map<number, RawTransition[]>();
    for (const t of rawTransitions) {
        if (!result.has(t.playerActionId)) {
            result.set(t.playerActionId, []);
        }
        result.get(t.playerActionId)!.push(t);
    }
    return result;
}

// Group transitions by target node ID
function groupTransitionsByTarget(rawTransitions: RawTransition[]): Map<string, RawTransition[]> {
    const result = new Map<string, RawTransition[]>();
    for (const t of rawTransitions) {
        if (!result.has(t.targetNodeId)) {
            result.set(t.targetNodeId, []);
        }
        result.get(t.targetNodeId)!.push(t);
    }
    return result;
}

// Calculate global pixels-per-probability ratio
// Ensures the smallest flow naturally meets minFlowHeight
function calculatePixelsPerProb(
    rawTransitions: RawTransition[],
    numPlayerActions: number,
    minFlowHeight: number = 5
): number {
    if (rawTransitions.length === 0) {
        return 1;
    }

    // Find the minimum probability
    const minCombinedProb = Math.min(...rawTransitions.map(t => t.combinedProb));

    // Calculate pixels-per-prob so smallest flow meets minFlowHeight
    const requiredPixelsPerProb = minFlowHeight / minCombinedProb;

    // Also calculate based on base height
    const totalCombinedProb = rawTransitions.reduce((sum, t) => sum + t.combinedProb, 0);
    const baseHeight = Math.max(250, numPlayerActions * 80);
    const basePixelsPerProb = baseHeight / totalCombinedProb;

    // Use the larger value to satisfy both constraints
    return Math.max(basePixelsPerProb, requiredPixelsPerProb);
}

// Create a unique key for a transition
function getTransitionKey(t: RawTransition): string {
    return `${t.playerActionId}-${t.opponentActionId}-${t.targetNodeId}`;
}

// Calculate flow widths for all transitions
// No Math.max needed since pixelsPerProb ensures minimum height
function calculateFlowWidths(
    rawTransitions: RawTransition[],
    pixelsPerProb: number
): Map<string, number> {
    const flowWidths = new Map<string, number>();
    for (const t of rawTransitions) {
        const key = getTransitionKey(t);
        const width = t.combinedProb * pixelsPerProb;
        flowWidths.set(key, width);
    }
    return flowWidths;
}

// Layout player rows - height based on sum of outgoing flow widths
function layoutPlayerRows(
    sortedPlayerIds: number[],
    playerActionMap: Map<number, { name: string;
        prob: number }>,
    transitionsByPlayer: Map<number, RawTransition[]>,
    flowWidths: Map<string, number>
): { rows: PlayerRow[];
    playerRowPositions: Map<number, PlayerRowPosition>;
    currentY: number } {
    const rows: PlayerRow[] = [];
    let currentY = topPadding;
    const playerRowPositions = new Map<number, PlayerRowPosition>();
    const boxPadding = 2;
    const flowGap = 1;

    for (const playerId of sortedPlayerIds) {
        const data = playerActionMap.get(playerId)!;
        const playerTransitions = transitionsByPlayer.get(playerId) ?? [];

        // Calculate box height from sum of outgoing flow widths
        const totalFlowWidth = playerTransitions.reduce((sum, t) => {
            return sum + flowWidths.get(getTransitionKey(t))!;
        }, 0);
        const gaps = Math.max(0, playerTransitions.length - 1) * flowGap;
        const rowHeight = totalFlowWidth + gaps + boxPadding * 2;

        playerRowPositions.set(playerId, {
            y: currentY,
            height: rowHeight,
            currentY: currentY + boxPadding
        });

        rows.push({
            actionName: data.name,
            probability: data.prob,
            y: currentY,
            height: rowHeight
        });

        currentY += rowHeight + rowGap;
    }

    return {
        rows,
        playerRowPositions,
        currentY
    };
}

// Layout targets - height based on sum of incoming flow widths
function layoutTargetNodes(
    sortedTargetIds: string[],
    targetTotals: Map<string, TargetTotalData>,
    transitionsByTarget: Map<string, RawTransition[]>,
    flowWidths: Map<string, number>
): { targets: TargetNodeData[];
    targetPositions: Map<string, TargetPosition>;
    targetY: number } {
    const targets: TargetNodeData[] = [];
    const targetPositions = new Map<string, TargetPosition>();
    let targetY = topPadding;
    const targetGap = 8;
    const targetTopPad = 2;
    const targetFlowGap = 1;

    for (const targetId of sortedTargetIds) {
        const data = targetTotals.get(targetId)!;
        const targetTransitions = transitionsByTarget.get(targetId) ?? [];

        // Calculate box height from sum of incoming flow widths
        const totalFlowWidth = targetTransitions.reduce((sum, t) => {
            return sum + flowWidths.get(getTransitionKey(t))!;
        }, 0);
        const gaps = Math.max(0, targetTransitions.length - 1) * targetFlowGap;
        const height = totalFlowWidth + gaps + targetTopPad * 2;

        targetPositions.set(targetId, {
            y: targetY,
            height,
            currentY: targetY + targetTopPad,
            flowCount: data.flowCount
        });

        targets.push({
            nodeId: targetId,
            name: data.node.name ?? targetId,
            color: getTargetColor(data.node),
            y: targetY,
            height,
            totalProb: data.totalProb,
            state: {
                playerHealth: data.node.state.playerHealth,
                opponentHealth: data.node.state.opponentHealth
            }
        });

        targetY += height + targetGap;
    }

    return {
        targets,
        targetPositions,
        targetY
    };
}

// Create flows with positions using pre-calculated flow widths
function generateFlowsAndChains(
    sortedPlayerIds: number[],
    transitionsByPlayer: Map<number, RawTransition[]>,
    playerRowPositions: Map<number, PlayerRowPosition>,
    targetPositions: Map<string, TargetPosition>,
    opponentColorMap: Map<number, string>,
    dynamicTargetBoxX: number,
    flowWidths: Map<string, number>
): { flows: FlowData[];
    chainNodes: ChainNode[];
    chainConnections: ChainConnection[] } {
    const flows: FlowData[] = [];
    const chainNodeBounds = new Map<string, ChainNodeBounds>();
    const chainConnectionsData: ChainConnection[] = [];

    const flowGap = 1;
    const targetFlowGap = 1;

    for (const playerId of sortedPlayerIds) {
        const playerTransitions = transitionsByPlayer.get(playerId) ?? [];
        const playerPos = playerRowPositions.get(playerId)!;

        let currentFlowY = playerPos.currentY;

        for (const t of playerTransitions) {
            const targetPos = targetPositions.get(t.targetNodeId);
            if (!targetPos) {
                continue;
            }

            // Use pre-calculated flow width (same at source and target)
            const flowHeight = flowWidths.get(getTransitionKey(t))!;

            // Source position
            const sourceY1 = currentFlowY;
            const sourceY2 = currentFlowY + flowHeight;
            currentFlowY = sourceY2 + flowGap;

            // Target position (same width as source)
            const targetY1 = targetPos.currentY;
            const targetY2 = targetY1 + flowHeight;
            targetPos.currentY = targetY2 + targetFlowGap;

            // Determine flow end position based on chain
            const hasIntermediateNodes = t.chain.chainNodes.length > 1;
            const flowDestX = hasIntermediateNodes
                ? (playerBoxX + playerBoxWidth + baseFlowWidth)
                : dynamicTargetBoxX;

            const path = generateSankeyPath(
                playerBoxX + playerBoxWidth,
                sourceY1,
                sourceY2,
                flowDestX,
                targetY1,
                targetY2
            );

            flows.push({
                path,
                color: opponentColorMap.get(t.opponentActionId) ?? '#888888',
                targetNodeId: t.targetNodeId,
                playerActionName: t.playerActionName,
                opponentActionName: t.opponentActionName,
                playerProb: t.playerProb,
                opponentProb: t.opponentProb,
                targetName: t.targetNode.name ?? t.targetNodeId,
                probability: t.combinedProb,
                midX: (playerBoxX + playerBoxWidth + dynamicTargetBoxX) / 2,
                midY: (sourceY1 + sourceY2 + targetY1 + targetY2) / 4
            });

            if (hasIntermediateNodes) {
                processChainNodes(
                    t,
                    targetY1,
                    targetY2,
                    flowHeight,
                    opponentColorMap,
                    dynamicTargetBoxX,
                    chainNodeBounds,
                    chainConnectionsData
                );
            }
        }
    }

    const chainNodesData: ChainNode[] = Array.from(chainNodeBounds.values()).map(bounds => ({
        nodeId: bounds.nodeId,
        node: bounds.node,
        x: bounds.x,
        y: bounds.minY,
        height: bounds.maxY - bounds.minY
    }));

    return {
        flows,
        chainNodes: chainNodesData,
        chainConnections: chainConnectionsData
    };
}

// Track chain node bounds and create connections
// Process intermediate nodes (all except the last one which is the target)
function processChainNodes(
    t: RawTransition,
    targetY1: number,
    targetY2: number,
    targetFlowHeight: number,
    opponentColorMap: Map<number, string>,
    dynamicTargetBoxX: number,
    chainNodeBounds: Map<string, ChainNodeBounds>,
    chainConnectionsData: ChainConnection[]
): void {
    const chain = t.chain;
    const color = opponentColorMap.get(t.opponentActionId) ?? '#888888';

    for (let i = 0; i < chain.chainNodes.length - 1; i++) {
        const chainNode = chain.chainNodes[i];
        const nodeKey = `${chainNode.nodeId}-${t.targetNodeId}`;
        // Calculate x position for this chain node
        const nodeX = playerBoxX + playerBoxWidth + baseFlowWidth + i * (chainNodeSize + chainGap);

        // Update chain node bounds (track min/max Y of all flows through this node)
        const existing = chainNodeBounds.get(nodeKey);
        if (existing) {
            existing.minY = Math.min(existing.minY, targetY1);
            existing.maxY = Math.max(existing.maxY, targetY2);
        } else {
            chainNodeBounds.set(nodeKey, {
                nodeId: chainNode.nodeId,
                node: chainNode.node,
                x: nodeX,
                minY: targetY1,
                maxY: targetY2,
                chainIndex: i
            });
        }

        // Create connection at the flow's Y position
        const flowCenterY = targetY1 + targetFlowHeight / 2;
        const nextX = (i < chain.chainNodes.length - 2)
            ? nodeX + chainNodeSize + chainGap  // Next chain node
            : dynamicTargetBoxX;  // Final target

        const nextNodeId = chain.chainNodes[i + 1].nodeId;
        const label = buildChainConnectionLabel(chainNode.node, nextNodeId);

        chainConnectionsData.push({
            fromId: chainNode.nodeId,
            toId: nextNodeId,
            x1: nodeX + chainNodeSize,
            y1: flowCenterY,
            x2: nextX,
            y2: flowCenterY,
            strokeWidth: targetFlowHeight,
            color,
            label
        });
    }
}

const calculatedData = computed(() => {
    const ctx = createLayoutContext();
    const rawTransitions = collectTransitions(ctx);
    const { playerActionMap, sortedPlayerIds } = buildPlayerActionMap(rawTransitions, ctx.playerActions);
    const opponentColorMap = buildOpponentColorMap(rawTransitions);
    const targetTotals = collectTargetTotals(rawTransitions);
    const sortedTargetIds = sortTargetIds(targetTotals);

    // Calculate global pixels-per-probability ratio and flow widths
    const pixelsPerProb = calculatePixelsPerProb(rawTransitions, sortedPlayerIds.length);
    const flowWidths = calculateFlowWidths(rawTransitions, pixelsPerProb);

    // Group transitions for layout
    const transitionsByPlayer = groupTransitionsByPlayer(rawTransitions);
    const transitionsByTarget = groupTransitionsByTarget(rawTransitions);

    // Sort transitions within each player group for consistent ordering
    for (const [playerId, transitions] of transitionsByPlayer) {
        transitions.sort((a, b) => b.combinedProb - a.combinedProb);
        transitionsByPlayer.set(playerId, transitions);
    }

    // Calculate max chain length for dynamic target position
    const maxIntermediateChainLength = rawTransitions.reduce((max, t) => {
        const intermediateCount = t.chain.chainNodes.length - 1;
        return Math.max(max, intermediateCount);
    }, 0);
    const flowEndX = playerBoxX + playerBoxWidth + baseFlowWidth;
    const chainAreaWidth = maxIntermediateChainLength * (chainNodeSize + chainGap);
    const dynamicTargetBoxX = flowEndX + chainAreaWidth;

    // Layout player rows using flow widths
    const { rows, playerRowPositions, currentY } = layoutPlayerRows(
        sortedPlayerIds,
        playerActionMap,
        transitionsByPlayer,
        flowWidths
    );

    // Layout target nodes using flow widths
    const { targets, targetPositions, targetY } = layoutTargetNodes(
        sortedTargetIds,
        targetTotals,
        transitionsByTarget,
        flowWidths
    );

    // Generate flows using pre-calculated widths
    const { flows, chainNodes: chainNodesData, chainConnections: chainConnectionsData } = generateFlowsAndChains(
        sortedPlayerIds,
        transitionsByPlayer,
        playerRowPositions,
        targetPositions,
        opponentColorMap,
        dynamicTargetBoxX,
        flowWidths
    );

    return {
        rows,
        targets,
        flows,
        chainNodes: chainNodesData,
        chainConnections: chainConnectionsData,
        targetBoxX: dynamicTargetBoxX,
        totalHeight: Math.max(currentY, targetY) + 30
    };
});

const playerRows = computed(() => calculatedData.value.rows);
const targetNodes = computed(() => calculatedData.value.targets);
const allFlows = computed(() => calculatedData.value.flows);
const chainNodes = computed(() => calculatedData.value.chainNodes);
const chainConnections = computed(() => calculatedData.value.chainConnections);
const targetBoxX = computed(() => calculatedData.value.targetBoxX);
const svgHeight = computed(() => calculatedData.value.totalHeight);

const sourceBoundingBox = computed(() => {
    const rows = playerRows.value;
    if (rows.length === 0) {
        return null;
    }

    const firstRow = rows[0];
    const lastRow = rows[rows.length - 1];
    const leftX = 20;

    return {
        x: leftX,
        y: firstRow.y,
        width: playerBoxX + playerBoxWidth - leftX,
        height: lastRow.y + lastRow.height - firstRow.y
    };
});

const sourceBoxColor = computed(() => {
    return getTargetColor(props.selectedNode);
});

const tooltipStyle = computed(() => {
    if (!activeTooltip.value) {
        return {};
    }
    return {
        left: `${activeTooltip.value.x}px`,
        top: `${activeTooltip.value.y}px`
    };
});

function showFlowTooltip(flowIdx: number) {
    hoveredFlow.value = flowIdx;
    const flow = allFlows.value[flowIdx];
    if (!flow) {
        return;
    }

    let x = flow.midX;
    let y = flow.midY - tooltipMargin;

    // Keep tooltip in bounds
    if (x < tooltipMargin) {
        x = tooltipMargin;
    }
    if (y < tooltipMargin) {
        y = flow.midY + tooltipMargin;
    }

    activeTooltip.value = {
        type: 'flow',
        x,
        y,
        data: {
            playerAction: flow.playerActionName,
            opponentAction: flow.opponentActionName,
            targetName: flow.targetName,
            playerProb: flow.playerProb,
            opponentProb: flow.opponentProb,
            reachProbability: flow.probability
        }
    };
}

function showChainConnectionTooltip(connIdx: number) {
    hoveredChainConnection.value = connIdx;
    const conn = chainConnections.value[connIdx];
    if (!conn || !conn.label) {
        return;
    }

    const x = (conn.x1 + conn.x2) / 2;
    let y = conn.y1 - conn.strokeWidth / 2 - 10;

    // Position below if too close to top
    if (y < 10) {
        y = conn.y1 + conn.strokeWidth / 2 + 10;
    }

    activeTooltip.value = {
        type: 'chainConnection',
        x,
        y,
        data: {
            label: conn.label
        }
    };
}

function hideTooltip() {
    hoveredFlow.value = null;
    hoveredChainNode.value = null;
    hoveredChainConnection.value = null;
    activeTooltip.value = null;
}

function showNodeTooltip(nodeId: string, event: MouseEvent) {
    const node = props.gameTree.nodes[nodeId];
    if (!node) {
        return;
    }

    const expectedValue = props.expectedValues?.[nodeId];

    activeTooltip.value = {
        type: 'node',
        x: event.offsetX + tooltipMargin,
        y: event.offsetY - tooltipMargin,
        data: {
            name: node.name ?? nodeId,
            expectedReward: expectedValue?.nodeExpectedValue ?? null,
            expectedDamageDealt: expectedValue?.expectedDamageDealt ?? null,
            expectedDamageReceived: expectedValue?.expectedDamageReceived ?? null,
        }
    };
}

function formatExpectedValue(value: number | null): string {
    if (value === null) {
        return '-';
    }
    return value.toFixed(1);
}

function generateSankeyPath(
    x1: number,
    y1Start: number,
    y1End: number,
    x2: number,
    y2Start: number,
    y2End: number
): string {
    const cpOffset = (x2 - x1) * 0.4;

    return `
        M ${x1} ${y1Start}
        C ${x1 + cpOffset} ${y1Start}, ${x2 - cpOffset} ${y2Start}, ${x2} ${y2Start}
        L ${x2} ${y2End}
        C ${x2 - cpOffset} ${y2End}, ${x1 + cpOffset} ${y1End}, ${x1} ${y1End}
        Z
    `;
}

function truncate(str: string, maxLength: number): string {
    if (str.length <= maxLength) {
        return str;
    }
    return str.slice(0, maxLength - 1) + '…';
}

function formatHealth(health: number): string {
    return health.toLocaleString();
}

function formatProb(prob: number): string {
    return (prob * 100).toFixed(0) + '%';
}
</script>

<style scoped>
.sankey-tree-view {
    display: flex;
    width: 100%;
    overflow: auto;
    padding: 10px;
}

.svg-container {
    position: relative;
}

.source-title {
    font-family: var(--font-family-ui);
    font-size: 16px;
    font-weight: 600;
    fill: var(--gold-light);
}

.source-subtitle {
    font-family: var(--font-family-mono);
    font-size: 12px;
    fill: var(--text-secondary);
}

.player-box {
    stroke: rgba(255, 255, 255, 0.3);
    stroke-width: 1;
}

.player-label {
    font-family: var(--font-family-ui);
    font-size: 12px;
    font-weight: 600;
    fill: white;
}

.player-prob {
    font-family: var(--font-family-mono);
    font-size: 14px;
    fill: rgba(255, 255, 255, 0.9);
}

.flow-path {
    cursor: pointer;
    transition: opacity 0.15s ease;
}

.chain-connection {
    cursor: pointer;
    transition: stroke-opacity 0.15s ease;
}

.chain-rect {
    cursor: pointer;
    stroke: rgba(255, 255, 255, 0.3);
    stroke-width: 1;
    transition: stroke 0.15s ease;
}

.chain-node:hover .chain-rect {
    stroke: var(--gold-primary);
    stroke-width: 2;
}

.source-bounding-box {
    fill-opacity:0.8;
}

.target-box {
    cursor: pointer;
    stroke: rgba(100, 100, 100, 1);
    stroke-width: 1;
    transition: stroke 0.15s ease;
    rx:4;
}

.target-node:hover .target-box {
    stroke: var(--gold-primary);
    stroke-width: 2;
}

.target-label {
    font-family: var(--font-family-ui);
    font-size: 12px;
    font-weight: 500;
    fill: var(--text-primary);
}

.target-hp {
    font-family: var(--font-family-mono);
    font-size: 10px;
    fill: var(--text-secondary);
}

.target-prob {
    font-family: var(--font-family-mono);
    font-size: 11px;
    fill: var(--text-secondary);
}

.tooltip {
    position: absolute;
    background: rgba(30, 26, 20, 0.95);
    border: 1px solid var(--gold-primary);
    border-radius: 4px;
    padding: 8px;
    pointer-events: none;
    white-space: nowrap;
    z-index: 10;
}

.tooltip-action {
    font-family: var(--font-family-ui);
    font-size: 11px;
    font-weight: 500;
    color: var(--text-primary);
}

.tooltip-target {
    font-family: var(--font-family-ui);
    font-size: 10px;
    color: var(--text-secondary);
}

.tooltip-prob {
    font-family: var(--font-family-mono);
    font-size: 11px;
    color: var(--gold-primary);
}

</style>
