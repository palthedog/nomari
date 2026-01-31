import type { Node } from '@nomari/game-tree/game-tree';

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
