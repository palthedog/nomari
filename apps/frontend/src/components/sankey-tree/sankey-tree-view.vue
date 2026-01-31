<template>
  <div
    ref="containerRef"
    class="sankey-tree-view"
  >
    <svg
      :width="svgWidth"
      :height="svgHeight"
      :viewBox="`0 0 ${svgWidth} ${svgHeight}`"
    >
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
            :opacity="hoveredFlow === flowIdx ? 0.85 : 0.45"
            class="flow-path"
            @click="$emit('select-node', flow.targetNodeId)"
            @mouseenter="hoveredFlow = flowIdx"
            @mouseleave="hoveredFlow = null"
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
            :fill="getPlayerColor(rowIdx)"
            rx="4"
            class="player-box"
          />
          <text
            :x="playerBoxX + playerBoxWidth / 2"
            :y="row.y + row.height / 2 - 6"
            text-anchor="middle"
            dominant-baseline="middle"
            class="player-label"
          >
            {{ row.actionName }}
          </text>
          <text
            :x="playerBoxX + playerBoxWidth / 2"
            :y="row.y + row.height / 2 + 10"
            text-anchor="middle"
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
          stroke-opacity="0.5"
          stroke-linecap="butt"
        />
      </g>

      <!-- Chain nodes (small rectangles for intermediate nodes) -->
      <g class="chain-nodes">
        <g
          v-for="(chainNode, cnIdx) in chainNodes"
          :key="`chain-${cnIdx}`"
          class="chain-node"
          @click="$emit('select-node', chainNode.nodeId)"
          @mouseenter="hoveredChainNode = chainNode.nodeId"
          @mouseleave="hoveredChainNode = null"
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
        >
          <rect
            :x="targetBoxX"
            :y="target.y"
            :width="targetBoxWidth"
            :height="target.height"
            :fill="target.color"
            rx="4"
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

      <!-- Tooltip for hovered flow -->
      <g
        v-if="hoveredFlow !== null && tooltipData"
        class="tooltip"
      >
        <rect
          :x="tooltipData.x"
          :y="tooltipData.y"
          :width="tooltipData.width"
          :height="tooltipData.height"
          fill="rgba(30, 26, 20, 0.95)"
          stroke="var(--gold-primary)"
          stroke-width="1"
          rx="4"
        />
        <text
          :x="tooltipData.x + 8"
          :y="tooltipData.y + 16"
          class="tooltip-action"
        >
          {{ tooltipData.playerAction }} → {{ tooltipData.opponentAction }}
        </text>
        <text
          :x="tooltipData.x + 8"
          :y="tooltipData.y + 32"
          class="tooltip-target"
        >
          → {{ tooltipData.targetName }}
        </text>
        <text
          :x="tooltipData.x + 8"
          :y="tooltipData.y + 48"
          class="tooltip-prob"
        >
          {{ formatProb(tooltipData.probability) }}
        </text>
      </g>

      <!-- Tooltip for hovered chain node -->
      <g
        v-if="hoveredChainNode !== null && chainNodeTooltipData"
        class="tooltip"
      >
        <rect
          :x="chainNodeTooltipData.x"
          :y="chainNodeTooltipData.y"
          :width="chainNodeTooltipData.width"
          :height="chainNodeTooltipData.height"
          fill="rgba(30, 26, 20, 0.95)"
          stroke="var(--gold-primary)"
          stroke-width="1"
          rx="4"
        />
        <text
          :x="chainNodeTooltipData.x + 8"
          :y="chainNodeTooltipData.y + 18"
          class="tooltip-action"
        >
          {{ chainNodeTooltipData.name }}
        </text>
        <text
          :x="chainNodeTooltipData.x + 8"
          :y="chainNodeTooltipData.y + 36"
          class="tooltip-target"
        >
          HP {{ formatHealth(chainNodeTooltipData.playerHealth) }} / {{ formatHealth(chainNodeTooltipData.opponentHealth) }}
        </text>
      </g>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import type { GameTree, Node } from '@nomari/game-tree/game-tree';
import type { StrategyData } from '@/workers/solver-types';

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
}

interface FlowData {
    path: string;
    color: string;
    targetNodeId: string;
    playerActionName: string;
    opponentActionName: string;
    targetName: string;
    probability: number;
    midX: number;
    midY: number;
}

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
}>();

defineEmits<{
    (e: 'select-node', nodeId: string): void;
}>();

const hoveredFlow = ref<number | null>(null);
const hoveredChainNode = ref<string | null>(null);
const containerRef = ref<HTMLElement | null>(null);
const containerWidth = ref(900);

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

// Layout constants
const svgWidth = computed(() => Math.max(800, containerWidth.value));
const topPadding = 70;
const playerBoxX = 30;
const playerBoxWidth = 100;
const baseFlowWidth = 300;
const chainNodeSize = 20;
const chainGap = 30;
const targetBoxWidth = 20;
const rowGap = 15;

const playerColors = [
    '#5AAF8A',
    '#4A6FA5',
    '#E07078',
    '#E8C060',
    '#9B7EDE',
];

function getPlayerColor(index: number): string {
    return playerColors[index % playerColors.length];
}

function isComboStarter(node: Node): boolean {
    return (
        node.opponentActions?.actions.length === 1 &&
        node.opponentActions.actions[0].name === '被コンボ'
    );
}

function isTerminal(node: Node): boolean {
    return node.playerReward !== undefined;
}

function getSignificantTargets(node: Node, strategy: StrategyData): Set<string> {
    const targets = new Set<string>();
    const playerProbMap = new Map(strategy.playerStrategy.map(s => [s.actionId, s.probability]));
    const opponentProbMap = new Map(strategy.opponentStrategy.map(s => [s.actionId, s.probability]));

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
            return '#D07070'; // Player loses
        }
        if (node.state.opponentHealth <= 0) {
            return '#5AAF8A'; // Player wins
        }
        return '#B87333'; // Draw/timeout
    }
    return '#4A6FA5'; // Situation node
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

const calculatedData = computed(() => {
    const playerProbMap = new Map<number, number>();
    for (const s of props.strategy.playerStrategy) {
        playerProbMap.set(s.actionId, s.probability);
    }

    const opponentProbMap = new Map<number, number>();
    for (const s of props.strategy.opponentStrategy) {
        opponentProbMap.set(s.actionId, s.probability);
    }

    const playerActions = props.selectedNode.playerActions?.actions ?? [];
    const opponentActions = props.selectedNode.opponentActions?.actions ?? [];

    // Collect all transitions with significant probability
    interface RawTransition {
        playerActionId: number;
        playerActionName: string;
        playerProb: number;
        opponentActionId: number;
        opponentActionName: string;
        combinedProb: number;
        chain: NodeChain;
        targetNodeId: string;
        targetNode: Node;
    }

    const rawTransitions: RawTransition[] = [];

    for (const t of props.selectedNode.transitions) {
        const playerAction = playerActions.find(a => a.actionId === t.playerActionId);
        const opponentAction = opponentActions.find(a => a.actionId === t.opponentActionId);
        const playerProb = playerProbMap.get(t.playerActionId) ?? 0;
        const opponentProb = opponentProbMap.get(t.opponentActionId) ?? 0;
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
            combinedProb,
            chain,
            targetNodeId: chain.finalNodeId,
            targetNode: chain.finalNode
        });
    }

    // Get unique player actions (keep scenario definition order)
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

    // Build opponent action color map (sorted by probability for consistent coloring)
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

    // Collect target totals (including flow count for height calculation)
    const targetTotals = new Map<string, {
        node: Node;
        totalProb: number;
        playerActions: Set<number>;
        flowCount: number
    }>();

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

    // Sort targets by node type and situation
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

    const sortedTargetIds = Array.from(targetTotals.entries())
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

    // Calculate total for scaling
    const totalProb = Array.from(targetTotals.values()).reduce((sum, d) => sum + d.totalProb, 0);

    // Calculate max chain length (excluding first node which connects to flow, and last which is target)
    // Chain intermediate nodes: nodes between the first transition target and the final target
    const maxIntermediateChainLength = rawTransitions.reduce((max, t) => {
        const intermediateCount = t.chain.chainNodes.length - 1; // Exclude final node
        return Math.max(max, intermediateCount);
    }, 0);

    // Calculate dynamic targetBoxX based on chain length
    const flowEndX = playerBoxX + playerBoxWidth + baseFlowWidth;
    const chainAreaWidth = maxIntermediateChainLength * (chainNodeSize + chainGap);
    const dynamicTargetBoxX = flowEndX + chainAreaWidth;

    // Layout player rows - height strictly proportional to probability
    const rows: PlayerRow[] = [];
    let currentY = topPadding;

    const playerRowPositions = new Map<number, { y: number;
        height: number;
        currentY: number }>();

    // Calculate total available height for player boxes (based on number of actions)
    const minBoxHeight = 35;
    const totalPlayerHeight = Math.max(250, sortedPlayerIds.length * 80);
    const totalPlayerGaps = (sortedPlayerIds.length - 1) * rowGap;
    const availablePlayerHeight = totalPlayerHeight - totalPlayerGaps;

    // Get total player probability for scaling
    const totalPlayerProb = sortedPlayerIds.reduce(
        (sum, id) => sum + (playerActionMap.get(id)?.prob ?? 0), 0
    );

    for (const playerId of sortedPlayerIds) {
        const data = playerActionMap.get(playerId)!;

        // Height strictly proportional to probability
        const probHeight = (data.prob / totalPlayerProb) * availablePlayerHeight;
        const rowHeight = Math.max(minBoxHeight, probHeight);

        playerRowPositions.set(playerId, {
            y: currentY,
            height: rowHeight,
            currentY: currentY + 8
        });

        rows.push({
            actionName: data.name,
            probability: data.prob,
            y: currentY,
            height: rowHeight
        });

        currentY += rowHeight + rowGap;
    }

    // Layout targets - height strictly proportional to probability
    const playerTotalHeight = currentY - topPadding;
    const targetGap = 8;
    const totalTargetGaps = Math.max(0, sortedTargetIds.length - 1) * targetGap;
    const availableTargetHeight = playerTotalHeight - totalTargetGaps;

    const targets: TargetNodeData[] = [];
    const targetPositions = new Map<string, { y: number;
        height: number;
        currentY: number;
        flowCount: number }>();
    let targetY = topPadding;
    const targetTopPad = 2;
    const targetFlowGap = 1;

    // Calculate minimum target height based on text height (2 lines of text need ~28px)
    const minTargetHeight = 28;

    for (const targetId of sortedTargetIds) {
        const data = targetTotals.get(targetId)!;
        // Height strictly proportional to probability
        const probHeight = (data.totalProb / totalProb) * availableTargetHeight;
        const height = Math.max(minTargetHeight, probHeight);

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

    // Create flows
    const flows: FlowData[] = [];

    // Sort transitions for consistent ordering
    const sortedTransitions = [...rawTransitions].sort((a, b) => {
        const playerIdxA = sortedPlayerIds.indexOf(a.playerActionId);
        const playerIdxB = sortedPlayerIds.indexOf(b.playerActionId);
        if (playerIdxA !== playerIdxB) {
            return playerIdxA - playerIdxB;
        }
        return b.combinedProb - a.combinedProb;
    });

    // Group transitions by player action for proper positioning
    const transitionsByPlayer = new Map<number, typeof sortedTransitions>();
    for (const t of sortedTransitions) {
        if (!transitionsByPlayer.has(t.playerActionId)) {
            transitionsByPlayer.set(t.playerActionId, []);
        }
        transitionsByPlayer.get(t.playerActionId)!.push(t);
    }

    // Track chain node bounds (minY, maxY) for each chain node key
    const chainNodeBounds = new Map<string, {
        nodeId: string;
        node: Node;
        x: number;
        minY: number;
        maxY: number;
        chainIndex: number
    }>();
    const chainConnectionsData: ChainConnection[] = [];

    // Create flows with positions calculated to fit within boxes
    for (const playerId of sortedPlayerIds) {
        const playerTransitions = transitionsByPlayer.get(playerId) ?? [];
        const playerPos = playerRowPositions.get(playerId)!;

        // Calculate flow heights proportional to each player's box
        const boxPadding = 8;
        const usableHeight = playerPos.height - boxPadding * 2;
        const flowGap = 3;

        // Calculate total probability for this player's transitions (for proportional sizing)
        const playerTotalProb = playerTransitions.reduce((sum, t) => sum + t.combinedProb, 0);

        // Calculate needed height with minimum flow sizes
        const minFlowHeight = 5;
        const totalMinHeight = playerTransitions.length * minFlowHeight +
            Math.max(0, playerTransitions.length - 1) * flowGap;

        // Scale flows to fit within the box
        const scaleFactor = usableHeight > totalMinHeight
            ? (usableHeight - (playerTransitions.length - 1) * flowGap) / playerTotalProb
            : minFlowHeight / (playerTotalProb / playerTransitions.length);

        let currentFlowY = playerPos.y + boxPadding;

        for (const t of playerTransitions) {
            const targetPos = targetPositions.get(t.targetNodeId);
            const targetData = targetTotals.get(t.targetNodeId);

            // Skip if target position not found
            if (!targetPos || !targetData) {
                continue;
            }

            // Flow dimensions - proportional to probability but constrained to box
            const flowHeight = Math.max(minFlowHeight, t.combinedProb * scaleFactor);

            // Calculate available height for flows in target box
            // Account for: top padding, bottom padding, and gaps between flows
            const targetAvailableHeight = targetPos.height - targetTopPad * 2 -
                Math.max(0, targetPos.flowCount - 1) * targetFlowGap;
            const targetFlowHeight = Math.max(4, (t.combinedProb / targetData.totalProb) * targetAvailableHeight);

            // Source position
            const sourceY1 = currentFlowY;
            const sourceY2 = currentFlowY + flowHeight;
            currentFlowY = sourceY2 + flowGap;

            // Target position (currentY already includes top padding from initialization)
            const targetY1 = targetPos.currentY;
            const targetY2 = targetY1 + targetFlowHeight;
            targetPos.currentY = targetY2 + targetFlowGap;

            // Determine flow end position based on chain
            const hasIntermediateNodes = t.chain.chainNodes.length > 1;
            const flowDestX = hasIntermediateNodes
                ? (playerBoxX + playerBoxWidth + baseFlowWidth) // Connect to first chain node
                : dynamicTargetBoxX; // Connect directly to target

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
                targetName: t.targetNode.name ?? t.targetNodeId,
                probability: t.combinedProb,
                midX: (playerBoxX + playerBoxWidth + dynamicTargetBoxX) / 2,
                midY: (sourceY1 + sourceY2 + targetY1 + targetY2) / 4
            });

            // Track chain node bounds and create connections
            if (hasIntermediateNodes) {
                const chain = t.chain;
                const color = opponentColorMap.get(t.opponentActionId) ?? '#888888';

                // Process intermediate nodes (all except the last one which is the target)
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

                    chainConnectionsData.push({
                        fromId: chainNode.nodeId,
                        toId: chain.chainNodes[i + 1].nodeId,
                        x1: nodeX + chainNodeSize,
                        y1: flowCenterY,
                        x2: nextX,
                        y2: flowCenterY,
                        strokeWidth: targetFlowHeight,
                        color
                    });
                }
            }
        }
    }

    // Create chain nodes with proper heights based on accumulated bounds
    const chainNodesData: ChainNode[] = Array.from(chainNodeBounds.values()).map(bounds => ({
        nodeId: bounds.nodeId,
        node: bounds.node,
        x: bounds.x,
        y: bounds.minY,
        height: bounds.maxY - bounds.minY
    }));

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

const tooltipData = computed(() => {
    if (hoveredFlow.value === null) {
        return null;
    }
    const flow = allFlows.value[hoveredFlow.value];
    if (!flow) {
        return null;
    }

    const width = 200;
    const height = 56;
    let x = flow.midX - width / 2;
    let y = flow.midY - height - 10;

    // Keep tooltip in bounds
    if (x < 10) {
        x = 10;
    }
    if (x + width > svgWidth.value - 10) {
        x = svgWidth.value - width - 10;
    }
    if (y < 10) {
        y = flow.midY + 10;
    }

    return {
        x,
        y,
        width,
        height,
        playerAction: flow.playerActionName,
        opponentAction: flow.opponentActionName,
        targetName: flow.targetName,
        probability: flow.probability
    };
});

const chainNodeTooltipData = computed(() => {
    if (hoveredChainNode.value === null) {
        return null;
    }

    const chainNode = chainNodes.value.find(n => n.nodeId === hoveredChainNode.value);
    if (!chainNode) {
        return null;
    }

    const width = 180;
    const height = 48;
    let x = chainNode.x + chainNodeSize + 10;
    const y = chainNode.y - 10;

    // Keep tooltip in bounds
    if (x + width > svgWidth.value - 10) {
        x = chainNode.x - width - 10;
    }

    return {
        x,
        y,
        width,
        height,
        name: chainNode.node.name ?? chainNode.nodeId,
        playerHealth: chainNode.node.state.playerHealth,
        opponentHealth: chainNode.node.state.opponentHealth
    };
});

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
    return (health / 1000).toFixed(1) + 'k';
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
    font-size: 11px;
    fill: rgba(255, 255, 255, 0.9);
}

.flow-path {
    cursor: pointer;
    transition: opacity 0.15s ease;
}

.chain-connections line {
    pointer-events: none;
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

.target-box {
    cursor: pointer;
    stroke: rgba(255, 255, 255, 0.2);
    stroke-width: 1;
    transition: stroke 0.15s ease;
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

.tooltip-action {
    font-family: var(--font-family-ui);
    font-size: 11px;
    font-weight: 500;
    fill: var(--text-primary);
}

.tooltip-target {
    font-family: var(--font-family-ui);
    font-size: 10px;
    fill: var(--text-secondary);
}

.tooltip-prob {
    font-family: var(--font-family-mono);
    font-size: 11px;
    fill: var(--gold-primary);
}
</style>
