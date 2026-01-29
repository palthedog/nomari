import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import type { GameTree } from '@nomari/game-tree/game-tree';
import type { SolverCommand, SolverResult, SolverStatus, StrategyData } from '../workers/solver-types';
import { useGameTreeStore } from './game-tree-store';
import { useNotificationStore } from './notification-store';

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
     * The gameTreeVersion that was used to compute the current strategies.
     * Used to detect if strategies need to be recalculated.
     */
    const solvedFromGameTreeVersion = ref(-1);

    /**
     * Initialize the worker if not already done
     */
    function initWorker(): Worker {
        if (!worker.value) {
            worker.value = new LpWorker();
            worker.value.onmessage = handleMessage;
            worker.value.onerror = (e) => {
                log.error('Solver worker error:', e);
                error.value = e.message;
                status.value = 'idle';
                const notificationStore = useNotificationStore();
                notificationStore.showError(`戦略計算でエラーが発生しました: ${e.message}`);
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
                log.error('Solver error:', result.message);
                error.value = result.message;
                status.value = 'idle';
                {
                    const notificationStore = useNotificationStore();
                    notificationStore.showError(`戦略計算でエラーが発生しました: ${result.message}`);
                }
                break;
        }
    }

    /**
     * Start solving the game tree
     * @param gameTree - The game tree to solve
     * @param onComplete - Optional callback to be called when solving is complete
     */
    function startSolving(gameTree: GameTree, onComplete?: () => void): void {
        // Terminate any existing worker to prevent stale results
        if (worker.value) {
            worker.value.terminate();
            worker.value = null;
        }
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

    /**
     * Ensure strategies are up-to-date with the current game tree.
     * Rebuilds game tree if needed, then recalculates strategies if needed.
     */
    function ensureSolved(): void {
        const gameTreeStore = useGameTreeStore();

        if (!gameTreeStore.ensureGameTreeUpdated()) {
            return;
        }

        if (solvedFromGameTreeVersion.value === gameTreeStore.gameTreeVersion) {
            return;
        }

        solvedFromGameTreeVersion.value = gameTreeStore.gameTreeVersion;
        startSolving(gameTreeStore.gameTree!);
    }

    return {
        status,
        strategies,
        error,
        solvedFromGameTreeVersion,
        startSolving,
        getNodeStrategy,
        terminate,
        ensureSolved,
    };
});
