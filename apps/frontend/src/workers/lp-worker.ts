// LP Solver Web Worker
// Runs the LP algorithm to compute Nash equilibrium strategies

import { LPSolver } from '@mari/solver/lp';
import type { GameTree } from '@mari/game-tree/game-tree';
import type { SolverCommand, SolverResult, StrategyData } from './solver-types';

let solver: LPSolver | null = null;
let gameTree: GameTree | null = null;

/**
 * Post a message back to the main thread
 */
function postResult(result: SolverResult): void {
    self.postMessage(result);
}

/**
 * Extract strategy data for a node
 */
function getNodeStrategyData(nodeId: string): StrategyData | null {
    if (!solver || !gameTree) {
        return null;
    }

    const node = gameTree.nodes[nodeId];
    if (!node) {
        return null;
    }

    const playerStrategyMap = solver.getAverageStrategy(nodeId);

    // Get player actions
    const playerStrategy: Array<{ actionId: string; probability: number }> = [];
    if (node.playerActions) {
        for (const action of node.playerActions.actions) {
            const prob = playerStrategyMap?.get(action.actionId) ?? 0;
            playerStrategy.push({ actionId: action.actionId, probability: prob });
        }
    }

    // Get opponent strategy
    const opponentStrategyMap = solver.getAverageOpponentStrategy(nodeId);

    const opponentStrategy: Array<{ actionId: string; probability: number }> = [];
    if (node.opponentActions) {
        for (const action of node.opponentActions.actions) {
            const prob = opponentStrategyMap?.get(action.actionId) ?? 0;
            opponentStrategy.push({ actionId: action.actionId, probability: prob });
        }
    }

    return {
        nodeId,
        playerStrategy,
        opponentStrategy,
    };
}

/**
 * Get all node strategies
 */
function getAllStrategies(): Record<string, StrategyData> {
    if (!gameTree) {
        return {};
    }

    const strategies: Record<string, StrategyData> = {};
    for (const nodeId of Object.keys(gameTree.nodes)) {
        const data = getNodeStrategyData(nodeId);
        if (data) {
            strategies[nodeId] = data;
        }
    }
    return strategies;
}

/**
 * Run LP solver
 * LP solves instantly (no iterations needed)
 */
async function runSolver(tree: GameTree): Promise<void> {
    gameTree = tree;
    solver = new LPSolver(tree);

    // Solve the game using LP (instant)
    solver.solve();

    // Report completion
    const strategies = getAllStrategies();
    postResult({
        type: 'complete',
        strategies,
    });
}

/**
 * Handle incoming messages from the main thread
 */
self.onmessage = async (event: MessageEvent<SolverCommand>) => {
    const command = event.data;

    switch (command.type) {
        case 'start':
            try {
                await runSolver(command.gameTree);
            } catch (error) {
                postResult({
                    type: 'error',
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
            }
            break;

        case 'pause':
            // LP solver doesn't support pause (solves instantly)
            break;

        case 'resume':
            // LP solver doesn't support resume (solves instantly)
            break;

        case 'getStrategy':
            const data = getNodeStrategyData(command.nodeId);
            postResult({
                type: 'strategy',
                nodeId: command.nodeId,
                data,
            });
            break;

        case 'getAllStrategies':
            postResult({
                type: 'allStrategies',
                strategies: getAllStrategies(),
            });
            break;
    }
};
