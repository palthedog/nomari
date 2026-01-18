import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import type { GameTree } from '@mari/game-tree/game-tree';
import type { SolverCommand, SolverResult, SolverStatus, StrategyData } from '../workers/solver-types';

// Import worker using Vite's worker import syntax
import LpWorker from '../workers/lp-worker?worker';
import log from 'loglevel';

export const useSolverStore = defineStore('solver', () => {
    const worker = shallowRef<Worker | null>(null);
    const status = ref<SolverStatus>('idle');
    const strategies = shallowRef<Record<string, StrategyData>>({});
    const error = ref<string | null>(null);
    let onCompleteCallback: (() => void) | null = null;

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

        log.info('uselolver.handleMessage:', result);

        switch (result.type) {
            case 'complete':
                log.info('Solver complete', result);
                strategies.value = result.strategies;
                status.value = 'complete';
                onCompleteCallback?.();
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
     * @param gameTree - The game tree to solve
     * @param onComplete - Optional callback to be called when solving is complete
     */
    function startSolving(gameTree: GameTree, onComplete?: () => void): void {
        const w = initWorker();
        status.value = 'running';
        error.value = null;
        strategies.value = {};
        onCompleteCallback = onComplete ?? null;

        // Serialize GameTree to plain object for postMessage
        // postMessage uses structured clone which cannot handle class instances
        const serializedGameTree = JSON.parse(JSON.stringify(gameTree)) as GameTree;

        const command: SolverCommand = {
            type: 'start',
            gameTree: serializedGameTree,
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

    return {
        status,
        strategies,
        error,
        startSolving,
        getNodeStrategy,
        terminate,
    };
});
