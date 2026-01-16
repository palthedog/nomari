// Type definitions for LP Solver Web Worker communication

import type { GameTree } from '@mari/game-tree/game-tree';

/**
 * Strategy data for a single node
 */
export interface StrategyData {
  nodeId: string;
  playerStrategy: Array<{ actionId: string; probability: number }>;
  opponentStrategy: Array<{ actionId: string; probability: number }>;
}

/**
 * Commands sent to the worker
 */
export type SolverCommand =
  | { type: 'start'; gameTree: GameTree }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'getStrategy'; nodeId: string }
  | { type: 'getAllStrategies' };

/**
 * Results returned from the worker
 */
export type SolverResult =
  | { type: 'complete'; strategies: Record<string, StrategyData> }
  | { type: 'strategy'; nodeId: string; data: StrategyData | null }
  | { type: 'allStrategies'; strategies: Record<string, StrategyData> }
  | { type: 'error'; message: string };

/**
 * Solver status
 */
export type SolverStatus = 'idle' | 'running' | 'paused' | 'complete';
