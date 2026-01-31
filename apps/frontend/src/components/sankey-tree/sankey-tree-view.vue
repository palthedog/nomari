<template>
  <div class="sankey-tree-view">
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
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { GameTree, Node } from '@nomari/game-tree/game-tree';
import type { StrategyData } from '@/workers/solver-types';

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
}

const props = defineProps<{
    selectedNode: Node;
    gameTree: GameTree;
    strategy: StrategyData;
}>();

defineEmits<{
    (e: 'select-node', nodeId: string): void;
}>();

const hoveredFlow = ref<number | null>(null);

// Layout constants
const svgWidth = 900;
const topPadding = 70;
const playerBoxX = 30;
const playerBoxWidth = 100;
const targetBoxX = 700;
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

function resolveTargetNode(nodeId: string): {
    nodeId: string;
    node: Node
} {
    let currentNodeId = nodeId;
    let currentNode = props.gameTree.nodes[nodeId];

    while (currentNode && isComboStarter(currentNode) && currentNode.transitions.length > 0) {
        currentNodeId = currentNode.transitions[0].nextNodeId;
        currentNode = props.gameTree.nodes[currentNodeId];
    }

    return {
        nodeId: currentNodeId,
        node: currentNode
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

        const { nodeId: targetNodeId, node: targetNode } = resolveTargetNode(t.nextNodeId);

        rawTransitions.push({
            playerActionId: t.playerActionId,
            playerActionName: playerAction?.name ?? `Action ${t.playerActionId}`,
            playerProb,
            opponentActionId: t.opponentActionId,
            opponentActionName: opponentAction?.name ?? `Action ${t.opponentActionId}`,
            combinedProb,
            targetNodeId,
            targetNode
        });
    }

    // Get unique player actions (sorted by probability)
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
    const sortedPlayerIds = Array.from(playerActionMap.entries())
        .sort((a, b) => b[1].prob - a[1].prob)
        .map(([id]) => id);

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

    // Collect target totals
    const targetTotals = new Map<string, {
        node: Node;
        totalProb: number;
        playerActions: Set<number>
    }>();

    for (const t of rawTransitions) {
        const existing = targetTotals.get(t.targetNodeId);
        if (existing) {
            existing.totalProb += t.combinedProb;
            existing.playerActions.add(t.playerActionId);
        } else {
            targetTotals.set(t.targetNodeId, {
                node: t.targetNode,
                totalProb: t.combinedProb,
                playerActions: new Set([t.playerActionId])
            });
        }
    }

    // Sort targets to minimize crossings
    // Targets connected to earlier player actions should be higher
    const sortedTargetIds = Array.from(targetTotals.entries())
        .sort((a, b) => {
            // Find earliest player action for each target
            const aMinIdx = Math.min(...Array.from(a[1].playerActions).map(id => sortedPlayerIds.indexOf(id)));
            const bMinIdx = Math.min(...Array.from(b[1].playerActions).map(id => sortedPlayerIds.indexOf(id)));
            if (aMinIdx !== bMinIdx) {
                return aMinIdx - bMinIdx;
            }
            return b[1].totalProb - a[1].totalProb;
        })
        .map(([id]) => id);

    // Calculate total for scaling
    const totalProb = Array.from(targetTotals.values()).reduce((sum, d) => sum + d.totalProb, 0);

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
        currentY: number }>();
    let targetY = topPadding;

    // Calculate minimum target height (smaller to preserve proportions)
    const minTargetHeight = 12;

    for (const targetId of sortedTargetIds) {
        const data = targetTotals.get(targetId)!;
        // Height strictly proportional to probability
        const probHeight = (data.totalProb / totalProb) * availableTargetHeight;
        const height = Math.max(minTargetHeight, probHeight);

        targetPositions.set(targetId, {
            y: targetY,
            height,
            currentY: targetY
        });

        targets.push({
            nodeId: targetId,
            name: data.node.name ?? targetId,
            color: getTargetColor(data.node),
            y: targetY,
            height,
            totalProb: data.totalProb
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
            const targetFlowHeight = Math.max(4, (t.combinedProb / targetData.totalProb) * (targetPos.height - 4));

            // Source position
            const sourceY1 = currentFlowY;
            const sourceY2 = currentFlowY + flowHeight;
            currentFlowY = sourceY2 + flowGap;

            // Target position
            const targetY1 = targetPos.currentY + 2;
            const targetY2 = targetY1 + targetFlowHeight;
            targetPos.currentY = targetY2 + 1;

            const path = generateSankeyPath(
                playerBoxX + playerBoxWidth,
                sourceY1,
                sourceY2,
                targetBoxX,
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
                midX: (playerBoxX + playerBoxWidth + targetBoxX) / 2,
                midY: (sourceY1 + sourceY2 + targetY1 + targetY2) / 4
            });
        }
    }

    return {
        rows,
        targets,
        flows,
        totalHeight: Math.max(currentY, targetY) + 30
    };
});

const playerRows = computed(() => calculatedData.value.rows);
const targetNodes = computed(() => calculatedData.value.targets);
const allFlows = computed(() => calculatedData.value.flows);
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
    if (x + width > svgWidth - 10) {
        x = svgWidth - width - 10;
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
