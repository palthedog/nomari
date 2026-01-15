// Composable for using the CFR Solver Web Worker

import { ref, shallowRef, onUnmounted } from 'vue';
import type { GameTree } from '@mari/game-tree/game-tree';
import type { SolverCommand, SolverResult, SolverStatus, StrategyData } from '../workers/solver-types';

// Import worker using Vite's worker import syntax
import CfrWorker from '../workers/cfr-worker?worker';

/**
 * Composable for managing the CFR Solver
 */
export function useSolver() {
  const worker = shallowRef<Worker | null>(null);
  const status = ref<SolverStatus>('idle');
  const progress = ref(0);
  const totalIterations = ref(0);
  const strategies = shallowRef<Record<string, StrategyData>>({});
  const error = ref<string | null>(null);
  const exploitabilityHistory = ref<Array<{ iteration: number; value: number }>>([]);

  /**
   * Initialize the worker if not already done
   */
  function initWorker(): Worker {
    if (!worker.value) {
      worker.value = new CfrWorker();
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
        progress.value = result.iteration;
        totalIterations.value = result.totalIterations;
        if (result.exploitability !== undefined) {
          exploitabilityHistory.value.push({
            iteration: result.iteration,
            value: result.exploitability,
          });
        }
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
   * Start solving the game tree
   */
  function startSolving(gameTree: GameTree, iterations: number = 1000): void {
    const w = initWorker();
    status.value = 'running';
    progress.value = 0;
    totalIterations.value = iterations;
    error.value = null;
    exploitabilityHistory.value = [];
    strategies.value = {};

    // Serialize GameTree to plain object for postMessage
    // postMessage uses structured clone which cannot handle class instances
    const serializedGameTree = JSON.parse(JSON.stringify(gameTree)) as GameTree;

    const command: SolverCommand = {
      type: 'start',
      gameTree: serializedGameTree,
      iterations,
    };
    w.postMessage(command);
  }

  /**
   * Pause solving (for future use)
   */
  function pause(): void {
    if (worker.value && status.value === 'running') {
      const command: SolverCommand = { type: 'pause' };
      worker.value.postMessage(command);
      status.value = 'paused';
    }
  }

  /**
   * Resume solving (for future use)
   */
  function resume(): void {
    if (worker.value && status.value === 'paused') {
      const command: SolverCommand = { type: 'resume' };
      worker.value.postMessage(command);
      status.value = 'running';
    }
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
    progress,
    totalIterations,
    strategies,
    error,
    exploitabilityHistory,
    startSolving,
    pause,
    resume,
    getNodeStrategy,
    terminate,
  };
}
