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
    const result: ExpectedValuesMap = {};
    const nodeMap = gameTree.nodes;
    const visited = new Set<string>();
    const calculating = new Set<string>(); // For cycle detection

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
     * Calculate expected damage dealt and received for a node
     * Damage = immediate HP change during transition + expected damage in subtree
     */
    interface ExpectedDamage {
        expectedDamageDealt: number;
        expectedDamageReceived: number;
    }

    function calculateExpectedDamage(
        node: Node,
        playerStrategy: StrategyData['playerStrategy'],
        opponentStrategy: StrategyData['opponentStrategy']
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

        return {
            expectedDamageDealt,
            expectedDamageReceived,
        };
    }

    /**
     * Calculate expected values for a node (recursive)
     */
    function calculateNodeExpectedValues(nodeId: string): NodeExpectedValues {
        // Return cached result if already calculated
        if (result[nodeId]) {
            return result[nodeId];
        }

        // Detect cycles
        if (calculating.has(nodeId)) {
            throw new Error(`Cycle detected while calculating expected values for node: ${nodeId}`);
        }

        const node = nodeMap[nodeId];
        if (!node) {
            throw new Error(`Node not found: ${nodeId}`);
        }

        // Terminal node: return reward directly
        // No further damage expected from terminal nodes
        if (isTerminalNode(node)) {
            const terminalValue: NodeExpectedValues = {
                actionExpectedValues: [],
                nodeExpectedValue: node.playerReward?.value ?? 0,
                opponentActionExpectedValues: [],
                opponentNodeExpectedValue: node.opponentReward?.value ?? 0,
                expectedDamageDealt: 0,
                expectedDamageReceived: 0,
            };
            result[nodeId] = terminalValue;
            return terminalValue;
        }

        calculating.add(nodeId);

        const strategy = strategies[nodeId];
        if (!strategy) {
            // No strategy computed yet - cannot calculate expected values
            calculating.delete(nodeId);
            const noStrategyValue: NodeExpectedValues = {
                actionExpectedValues: [],
                nodeExpectedValue: 0,
                opponentActionExpectedValues: [],
                opponentNodeExpectedValue: 0,
                expectedDamageDealt: 0,
                expectedDamageReceived: 0,
            };
            result[nodeId] = noStrategyValue;
            return noStrategyValue;
        }

        const playerStrategy = strategy.playerStrategy;
        const opponentStrategy = strategy.opponentStrategy;

        // Calculate expected value for each player action
        const actionExpectedValues: ActionExpectedValue[] = [];

        if (node.playerActions) {
            const playerActions = node.playerActions;
            for (const playerAction of playerActions.actions) {
                let actionExpectedValue = 0;

                // Find all transitions for this player action
                for (const transition of node.transitions) {
                    if (transition.playerActionId !== playerAction.actionId) {
                        continue;
                    }

                    // Get opponent action probability
                    const opponentActionProb = getActionProbability(
                        transition.opponentActionId,
                        opponentStrategy
                    );

                    // Get next node expected value (recursive)
                    const nextNodeValues = calculateNodeExpectedValues(transition.nextNodeId);

                    // Add to action expected value: opponent prob × next node value
                    actionExpectedValue += opponentActionProb * nextNodeValues.nodeExpectedValue;
                }

                actionExpectedValues.push({
                    actionId: playerAction.actionId,
                    expectedValue: actionExpectedValue,
                });
            }
        }

        // Calculate node expected value: sum of (player action prob × action expected value)
        let nodeExpectedValue = 0;
        for (const actionValue of actionExpectedValues) {
            const playerActionProb = getActionProbability(actionValue.actionId, playerStrategy);
            nodeExpectedValue += playerActionProb * actionValue.expectedValue;
        }

        // Calculate expected value for each opponent action
        const opponentActionExpectedValues: ActionExpectedValue[] = [];

        if (node.opponentActions) {
            const opponentActions = node.opponentActions;
            for (const opponentAction of opponentActions.actions) {
                let actionExpectedValue = 0;

                // Find all transitions for this opponent action
                for (const transition of node.transitions) {
                    if (transition.opponentActionId !== opponentAction.actionId) {
                        continue;
                    }

                    // Get player action probability
                    const playerActionProb = getActionProbability(
                        transition.playerActionId,
                        playerStrategy
                    );

                    // Get next node expected value (recursive)
                    const nextNodeValues = calculateNodeExpectedValues(transition.nextNodeId);

                    // Add to action expected value: player prob × next node opponent value
                    actionExpectedValue += playerActionProb * (nextNodeValues.opponentNodeExpectedValue ?? 0);
                }

                opponentActionExpectedValues.push({
                    actionId: opponentAction.actionId,
                    expectedValue: actionExpectedValue,
                });
            }
        }

        // Calculate opponent node expected value: sum of (opponent action prob × action expected value)
        let opponentNodeExpectedValue = 0;
        for (const actionValue of opponentActionExpectedValues) {
            const opponentActionProb = getActionProbability(actionValue.actionId, opponentStrategy);
            opponentNodeExpectedValue += opponentActionProb * actionValue.expectedValue;
        }

        // Calculate expected damage dealt and received for this node
        const { expectedDamageDealt, expectedDamageReceived } = calculateExpectedDamage(
            node,
            playerStrategy,
            opponentStrategy
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

    // Calculate expected values for all nodes
    // Start from root and traverse all nodes
    const queue: string[] = [gameTree.root];
    visited.add(gameTree.root);

    while (queue.length > 0) {
        const nodeId = queue.shift()!;
        calculateNodeExpectedValues(nodeId);

        // Add child nodes to queue
        const node = nodeMap[nodeId];
        if (!node) {
            continue;
        }

        if (isTerminalNode(node)) {
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

    return result;
}
