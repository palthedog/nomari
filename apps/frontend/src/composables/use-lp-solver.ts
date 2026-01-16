// Composable for using the LP Solver Web Worker

import { ref, shallowRef, onUnmounted } from 'vue';
import type { GameTree } from '@mari/game-tree/game-tree';
import type { SolverCommand, SolverResult, SolverStatus, StrategyData } from '../workers/solver-types';

// Import worker using Vite's worker import syntax
import LpWorker from '../workers/lp-worker?worker';

/**
 * Composable for managing the LP Solver
 */
export function useLPSolver() {
  const worker = shallowRef<Worker | null>(null);
  const status = ref<SolverStatus>('idle');
  const strategies = shallowRef<Record<string, StrategyData>>({});
  const error = ref<string | null>(null);

  /**
   * Initialize the worker if not already done
   */
  function initWorker(): Worker {
    if (!worker.value) {
      worker.value = new LpWorker();
      worker.value.onmessage = handleMessage;
      worker.value.onerror = (e) => {
        error.value = e.message;
        status.value = 'idle';
      };
    }
    return worker.value;
  }

  /**
   * Handle messages from the worker
   */
  function handleMessage(event: MessageEvent<SolverResult>) {
    const result = event.data;

    switch (result.type) {
      case 'progress':
        // LP solver solves instantly, so progress is not really meaningful
        status.value = 'running';
        break;

      case 'complete':
        strategies.value = result.strategies;
        status.value = 'complete';
        break;

      case 'strategy':
        if (result.data) {
          strategies.value = {
            ...strategies.value,
            [result.nodeId]: result.data,
          };
        }
        break;

      case 'allStrategies':
        strategies.value = result.strategies;
        break;

      case 'error':
        error.value = result.message;
        status.value = 'idle';
        break;
    }
  }

  /**
   * Start solving the game tree using LP
   * Note: iterations parameter is ignored for LP solver (kept for interface compatibility)
   */
  function startSolving(gameTree: GameTree, _iterations: number = 1000): void {
    const w = initWorker();
    status.value = 'running';
    error.value = null;
    strategies.value = {};

    // Serialize GameTree to plain object for postMessage
    // postMessage uses structured clone which cannot handle class instances
    const serializedGameTree = JSON.parse(JSON.stringify(gameTree)) as GameTree;

    const command: SolverCommand = {
      type: 'start',
      gameTree: serializedGameTree,
      iterations: 1, // LP doesn't need iterations, but keep for interface compatibility
    };
    w.postMessage(command);
  }

  /**
   * Get strategy for a specific node
   */
  function getNodeStrategy(nodeId: string): StrategyData | null {
    return strategies.value[nodeId] ?? null;
  }

  /**
   * Terminate the worker
   */
  function terminate(): void {
    if (worker.value) {
      worker.value.terminate();
      worker.value = null;
    }
    status.value = 'idle';
  }

  // Clean up on unmount
  onUnmounted(() => {
    terminate();
  });

  return {
    status,
    strategies,
    error,
    startSolving,
    getNodeStrategy,
    terminate,
  };
}
