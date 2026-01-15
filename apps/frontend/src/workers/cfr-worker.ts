// CFR Solver Web Worker
// Runs the CFR algorithm in a separate thread to avoid blocking the UI

import { CFRSolver } from '@mari/solver/cfr';
import type { GameTree } from '@mari/game-tree/game-tree';
import type { SolverCommand, SolverResult, StrategyData } from './solver-types';

let solver: CFRSolver | null = null;
let gameTree: GameTree | null = null;
let isPaused = false;
let shouldStop = false;

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

  // For opponent strategy, we need to compute it separately
  // Currently the solver only tracks player strategy, so we use uniform for opponent
  const opponentStrategy: Array<{ actionId: string; probability: number }> = [];
  if (node.opponentActions) {
    const uniformProb = 1.0 / node.opponentActions.actions.length;
    for (const action of node.opponentActions.actions) {
      opponentStrategy.push({ actionId: action.actionId, probability: uniformProb });
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
 * Run CFR iterations with progress reporting
 */
async function runSolver(tree: GameTree, totalIterations: number): Promise<void> {
  gameTree = tree;
  solver = new CFRSolver(tree);
  isPaused = false;
  shouldStop = false;

  const batchSize = Math.max(1, Math.floor(totalIterations / 100)); // Report progress ~100 times

  for (let i = 0; i < totalIterations; i += batchSize) {
    // Check for pause/stop
    while (isPaused && !shouldStop) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (shouldStop) {
      return;
    }

    // Run a batch of iterations
    const iterationsToRun = Math.min(batchSize, totalIterations - i);
    solver.solve(iterationsToRun);

    // Report progress
    const currentIteration = Math.min(i + iterationsToRun, totalIterations);
    postResult({
      type: 'progress',
      iteration: currentIteration,
      totalIterations,
      // exploitability would be calculated here in the future
    });

    // Yield to allow message processing
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  // Complete
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
        await runSolver(command.gameTree, command.iterations);
      } catch (error) {
        postResult({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
      break;

    case 'pause':
      isPaused = true;
      break;

    case 'resume':
      isPaused = false;
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
