import type { GameTree, Node } from '@nomari/game-tree/game-tree';
import type { StrategyData } from '../workers/solver-types';
import log from 'loglevel';

/**
 * Expected value for a single action
 */
export interface ActionExpectedValue {
    actionId: number;
    expectedValue: number;
}

/**
 * Expected values for a node (action-level and node-level)
 */
export interface NodeExpectedValues {
    actionExpectedValues: ActionExpectedValue[];
    nodeExpectedValue: number;
    opponentActionExpectedValues?: ActionExpectedValue[];
    opponentNodeExpectedValue?: number;
    // Expected damage values for the subtree rooted at this node
    expectedDamageDealt: number;      // Expected damage player deals to opponent
    expectedDamageReceived: number;   // Expected damage player receives from opponent
}

/**
 * Map of expected values for all nodes
 */
export type ExpectedValuesMap = Record<string, NodeExpectedValues>;

/**
 * Check if a node is terminal (has rewards)
 */
function isTerminalNode(node: Node): boolean {
    return node.playerReward !== undefined || node.opponentReward !== undefined;
}

/**
 * Get strategy probability for an action
 */
function getActionProbability(
    actionId: number,
    strategy: StrategyData['playerStrategy'] | StrategyData['opponentStrategy']
): number {
    const action = strategy.find(a => a.actionId === actionId);
    return action?.probability ?? 0;
}

/**
 * Create terminal node expected values
 */
function createTerminalNodeValues(node: Node): NodeExpectedValues {
    log.debug('Creating terminal node values for:', node.nodeId);
    return {
        actionExpectedValues: [],
        nodeExpectedValue: node.playerReward?.value ?? 0,
        opponentActionExpectedValues: [],
        opponentNodeExpectedValue: node.opponentReward?.value ?? 0,
        expectedDamageDealt: 0,
        expectedDamageReceived: 0,
    };
}

/**
 * Create default values for nodes without strategy
 */
function createNoStrategyNodeValues(): NodeExpectedValues {
    return {
        actionExpectedValues: [],
        nodeExpectedValue: 0,
        opponentActionExpectedValues: [],
        opponentNodeExpectedValue: 0,
        expectedDamageDealt: 0,
        expectedDamageReceived: 0,
    };
}

/**
 * Calculate expected value for each player action
 */
function calculatePlayerActionValues(
    node: Node,
    opponentStrategy: StrategyData['opponentStrategy'],
    calculateNodeFn: (nodeId: string) => NodeExpectedValues | null
): ActionExpectedValue[] {
    const actionExpectedValues: ActionExpectedValue[] = [];

    if (!node.playerActions) {
        return actionExpectedValues;
    }

    for (const playerAction of node.playerActions.actions) {
        let actionExpectedValue = 0;

        for (const transition of node.transitions) {
            if (transition.playerActionId !== playerAction.actionId) {
                continue;
            }

            const opponentActionProb = getActionProbability(
                transition.opponentActionId,
                opponentStrategy
            );

            const nextNodeValues = calculateNodeFn(transition.nextNodeId);
            if (!nextNodeValues) {
                continue;
            }

            actionExpectedValue += opponentActionProb * nextNodeValues.nodeExpectedValue;
        }

        actionExpectedValues.push({
            actionId: playerAction.actionId,
            expectedValue: actionExpectedValue,
        });
    }

    return actionExpectedValues;
}

/**
 * Calculate expected value for each opponent action
 */
function calculateOpponentActionValues(
    node: Node,
    playerStrategy: StrategyData['playerStrategy'],
    calculateNodeFn: (nodeId: string) => NodeExpectedValues | null
): ActionExpectedValue[] {
    const opponentActionExpectedValues: ActionExpectedValue[] = [];

    if (!node.opponentActions) {
        return opponentActionExpectedValues;
    }

    for (const opponentAction of node.opponentActions.actions) {
        let actionExpectedValue = 0;

        for (const transition of node.transitions) {
            if (transition.opponentActionId !== opponentAction.actionId) {
                continue;
            }

            const playerActionProb = getActionProbability(
                transition.playerActionId,
                playerStrategy
            );

            const nextNodeValues = calculateNodeFn(transition.nextNodeId);
            if (!nextNodeValues) {
                continue;
            }

            actionExpectedValue += playerActionProb * (nextNodeValues.opponentNodeExpectedValue ?? 0);
        }

        opponentActionExpectedValues.push({
            actionId: opponentAction.actionId,
            expectedValue: actionExpectedValue,
        });
    }

    return opponentActionExpectedValues;
}

/**
 * Calculate node expected value from action values
 */
function calculateNodeValueFromActions(
    actionValues: ActionExpectedValue[],
    strategy: StrategyData['playerStrategy'] | StrategyData['opponentStrategy']
): number {
    let nodeExpectedValue = 0;
    for (const actionValue of actionValues) {
        const actionProb = getActionProbability(actionValue.actionId, strategy);
        nodeExpectedValue += actionProb * actionValue.expectedValue;
    }
    return nodeExpectedValue;
}

/**
 * Expected damage calculation result
 */
interface ExpectedDamage {
    expectedDamageDealt: number;
    expectedDamageReceived: number;
}

/**
 * Calculate expected damage dealt and received for a node
 */
function calculateExpectedDamage(
    node: Node,
    playerStrategy: StrategyData['playerStrategy'],
    opponentStrategy: StrategyData['opponentStrategy'],
    nodeMap: Record<string, Node>,
    result: ExpectedValuesMap
): ExpectedDamage {
    let expectedDamageDealt = 0;
    let expectedDamageReceived = 0;

    for (const transition of node.transitions) {
        const transitionProb = getActionProbability(transition.playerActionId, playerStrategy)
            * getActionProbability(transition.opponentActionId, opponentStrategy);

        if (transitionProb === 0) {
            continue;
        }

        const nextNode = nodeMap[transition.nextNodeId];
        if (!nextNode) {
            log.error(`Node not found in nodeMap: ${transition.nextNodeId}`);
            continue;
        }

        const nextNodeValues = result[transition.nextNodeId];
        if (!nextNodeValues) {
            log.error(`Expected values not calculated for node: ${transition.nextNodeId}`);
            continue;
        }

        const immediateDamageDealt = node.state.opponentHealth - nextNode.state.opponentHealth;
        const immediateDamageReceived = node.state.playerHealth - nextNode.state.playerHealth;

        expectedDamageDealt += transitionProb * (immediateDamageDealt + nextNodeValues.expectedDamageDealt);
        expectedDamageReceived += transitionProb * (immediateDamageReceived + nextNodeValues.expectedDamageReceived);
    }

    return { expectedDamageDealt, expectedDamageReceived };
}

/**
 * Calculate expected values for all nodes in the game tree
 *
 * Terminal nodes: use playerReward.value directly
 * Non-terminal nodes:
 *   1. For each player action: sum of (opponent action prob × next node expected value)
 *   2. Node expected value: sum of (player action prob × action expected value)
 */
export function calculateExpectedValues(
    gameTree: GameTree,
    strategies: Record<string, StrategyData>
): ExpectedValuesMap {
    log.debug('Calculating expected values for game tree:', gameTree.id);

    const result: ExpectedValuesMap = {};
    const nodeMap = gameTree.nodes;
    const visited = new Set<string>();
    const calculating = new Set<string>();

    /**
     * Calculate expected values for a node (recursive)
     * Returns null if node cannot be calculated (cycle or not found)
     */
    function calculateNodeExpectedValues(nodeId: string): NodeExpectedValues | null {
        // Return cached result if already calculated
        if (result[nodeId]) {
            return result[nodeId];
        }

        // Detect cycles
        if (calculating.has(nodeId)) {
            log.error(`Cycle detected while calculating expected values for node: ${nodeId}`);
            return null;
        }

        const node = nodeMap[nodeId];
        if (!node) {
            log.error(`Node not found: ${nodeId}`);
            return null;
        }

        // Terminal node: return reward directly
        if (isTerminalNode(node)) {
            const terminalValue = createTerminalNodeValues(node);
            result[nodeId] = terminalValue;
            return terminalValue;
        }

        calculating.add(nodeId);

        const strategy = strategies[nodeId];
        if (!strategy) {
            log.warn('No strategy for node:', nodeId);
            calculating.delete(nodeId);
            const noStrategyValue = createNoStrategyNodeValues();
            result[nodeId] = noStrategyValue;
            return noStrategyValue;
        }

        const playerStrategy = strategy.playerStrategy;
        const opponentStrategy = strategy.opponentStrategy;

        // Calculate player action values
        const actionExpectedValues = calculatePlayerActionValues(
            node,
            opponentStrategy,
            calculateNodeExpectedValues
        );

        // Calculate node expected value from player actions
        const nodeExpectedValue = calculateNodeValueFromActions(actionExpectedValues, playerStrategy);

        // Calculate opponent action values
        const opponentActionExpectedValues = calculateOpponentActionValues(
            node,
            playerStrategy,
            calculateNodeExpectedValues
        );

        // Calculate opponent node expected value
        const opponentNodeExpectedValue = calculateNodeValueFromActions(
            opponentActionExpectedValues,
            opponentStrategy
        );

        // Calculate expected damage
        const { expectedDamageDealt, expectedDamageReceived } = calculateExpectedDamage(
            node,
            playerStrategy,
            opponentStrategy,
            nodeMap,
            result
        );

        const nodeValues: NodeExpectedValues = {
            actionExpectedValues,
            nodeExpectedValue,
            opponentActionExpectedValues,
            opponentNodeExpectedValue,
            expectedDamageDealt,
            expectedDamageReceived,
        };

        calculating.delete(nodeId);
        result[nodeId] = nodeValues;
        return nodeValues;
    }

    // Calculate expected values for all nodes using BFS traversal
    const queue: string[] = [gameTree.root];
    visited.add(gameTree.root);

    while (queue.length > 0) {
        const nodeId = queue.shift()!;
        calculateNodeExpectedValues(nodeId);

        const node = nodeMap[nodeId];
        if (!node || isTerminalNode(node)) {
            continue;
        }

        for (const transition of node.transitions) {
            if (visited.has(transition.nextNodeId)) {
                continue;
            }
            visited.add(transition.nextNodeId);
            queue.push(transition.nextNodeId);
        }
    }

    log.debug('Expected values calculated for', Object.keys(result).length, 'nodes');
    return result;
}
