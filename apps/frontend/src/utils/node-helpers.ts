import type { GameTree, Node } from '@nomari/game-tree/game-tree';

/**
 * Check if a node is terminal (has rewards)
 */
export function isTerminal(node: Node): boolean {
    return node.playerReward !== undefined;
}

/**
 * Get player action name by action ID
 */
export function getPlayerActionName(node: Node, actionId: number): string {
    return node.playerActions?.actions.find(a => a.actionId === actionId)?.name ?? '';
}

/**
 * Get opponent action name by action ID
 */
export function getOpponentActionName(node: Node, actionId: number): string {
    return node.opponentActions?.actions.find(a => a.actionId === actionId)?.name ?? '';
}

/**
 * Create a Map from action ID to probability
 */
export function createProbabilityMap(
    strategy: Array<{
        actionId: number;
        probability: number
    }>
): Map<number, number> {
    return new Map(strategy.map(s => [s.actionId, s.probability]));
}

/**
 * Check if a node is terminal (has player or opponent rewards)
 * Use this for cases that need to check both rewards
 */
export function isTerminalNode(node: Node): boolean {
    return node.playerReward !== undefined || node.opponentReward !== undefined;
}

/**
 * Check if a node is a combo starter
 * Combo starters have a single opponent action named '被コンボ'
 */
export function isComboStarter(node: Node): boolean {
    return (
        node.opponentActions?.actions.length === 1 &&
        node.opponentActions.actions[0].name === '被コンボ'
    );
}

/**
 * Check if a node should appear in strategy view
 * Strategy nodes have multiple actions for at least one player
 */
export function isStrategyNode(node: Node): boolean {
    if (isComboStarter(node)) {
        return false;
    }
    const playerActionsCount = node.playerActions?.actions.length ?? 0;
    const opponentActionsCount = node.opponentActions?.actions.length ?? 0;
    return playerActionsCount > 1 || opponentActionsCount > 1;
}

/**
 * Find the first strategy node for a given situation ID
 * Returns the node ID with highest priority based on HP, OD, SA values
 */
export function findFirstStrategyNodeForSituation(
    gameTree: GameTree,
    situationId: number
): string | null {
    const matchingNodes: Array<{
        nodeId: string;
        node: Node
    }> = [];

    for (const [nodeId, node] of Object.entries(gameTree.nodes)) {
        if (isTerminal(node) || !isStrategyNode(node)) {
            continue;
        }
        if (node.state.situation_id === situationId) {
            matchingNodes.push({
                nodeId,
                node
            });
        }
    }

    if (matchingNodes.length === 0) {
        return null;
    }

    // Sort by HP, OD, SA (descending) - same logic as situation-list-panel.vue
    matchingNodes.sort((a, b) => {
        const stateA = a.node.state;
        const stateB = b.node.state;

        if (stateA.playerHealth !== stateB.playerHealth) {
            return stateB.playerHealth - stateA.playerHealth;
        }
        if (stateA.opponentHealth !== stateB.opponentHealth) {
            return stateB.opponentHealth - stateA.opponentHealth;
        }
        if (stateA.playerOd !== stateB.playerOd) {
            return stateB.playerOd - stateA.playerOd;
        }
        if (stateA.opponentOd !== stateB.opponentOd) {
            return stateB.opponentOd - stateA.opponentOd;
        }
        if (stateA.playerSa !== stateB.playerSa) {
            return stateB.playerSa - stateA.playerSa;
        }
        return stateB.opponentSa - stateA.opponentSa;
    });

    return matchingNodes[0].nodeId;
}
