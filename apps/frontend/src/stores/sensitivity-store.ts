import { defineStore } from 'pinia';
import { ref, shallowRef } from 'vue';
import type { Node } from '@nomari/game-tree/game-tree';
import type { Scenario } from '@nomari/ts-proto/generated/game';
import { ResourceType } from '@nomari/ts-proto/generated/game';
import type {
    ParameterConfig,
    SensitivityResult,
    SensitivityCommand,
    SensitivityResultMessage,
    SensitivityStatus,
} from '@/workers/sensitivity-types';
import { getDefaultParameterConfig } from '@/utils/sub-scenario-builder';
import { useNotificationStore } from './notification-store';
import log from 'loglevel';

import SensitivityWorker from '@/workers/sensitivity-worker?worker';

const DEFAULT_PARAMETER_CONFIG = getDefaultParameterConfig(ResourceType.OPPONENT_HEALTH);

export const useSensitivityStore = defineStore('sensitivity', () => {
    const worker = shallowRef<Worker | null>(null);

    const isOpen = ref(false);
    const sourceNode = shallowRef<Node | null>(null);
    const scenario = shallowRef<Scenario | null>(null);
    const status = ref<SensitivityStatus>('idle');
    const progress = ref({
        current: 0,
        total: 0
    });
    const results = shallowRef<SensitivityResult[]>([]);
    const error = ref<string | null>(null);

    const parameterConfig = ref<ParameterConfig>({
        ...DEFAULT_PARAMETER_CONFIG
    });

    function initWorker(): Worker {
        if (!worker.value) {
            worker.value = new SensitivityWorker();
            worker.value.onmessage = handleMessage;
            worker.value.onerror = (e) => {
                log.error('Sensitivity worker error:', e);
                error.value = e.message;
                status.value = 'error';
                const notificationStore = useNotificationStore();
                notificationStore.showError(`感度分析でエラーが発生しました: ${e.message}`);
            };
        }
        return worker.value;
    }

    function handleMessage(event: MessageEvent<SensitivityResultMessage>) {
        const result = event.data;

        switch (result.type) {
            case 'progress':
                progress.value = {
                    current: result.current,
                    total: result.total 
                };
                break;

            case 'result':
                results.value = [...results.value, result.data];
                break;

            case 'complete':
                status.value = 'complete';
                log.info('Sensitivity analysis complete', results.value);
                break;

            case 'error':
                log.error('Sensitivity analysis error:', result.message);
                error.value = result.message;
                status.value = 'error';
                {
                    const notificationStore = useNotificationStore();
                    notificationStore.showError(`感度分析でエラーが発生しました: ${result.message}`);
                }
                break;
        }
    }

    /**
     * Open the sensitivity analysis panel for a node
     */
    function openAnalysis(node: Node, currentScenario: Scenario): void {
        sourceNode.value = node;
        scenario.value = currentScenario;
        isOpen.value = true;
        status.value = 'configuring';
        results.value = [];
        error.value = null;

        parameterConfig.value = {
            ...DEFAULT_PARAMETER_CONFIG
        };
    }

    /**
     * Update parameter configuration
     */
    function setParameterConfig(config: ParameterConfig): void {
        parameterConfig.value = config;
    }

    /**
     * Start the sensitivity analysis computation
     */
    function startComputation(): void {
        if (!sourceNode.value || !scenario.value) {
            log.error('Cannot start computation: missing node or scenario');
            return;
        }

        // Terminate any existing worker
        if (worker.value) {
            worker.value.terminate();
            worker.value = null;
        }

        const w = initWorker();
        status.value = 'computing';
        results.value = [];
        error.value = null;
        progress.value = {
            current: 0,
            total: 0 
        };

        // Serialize data for postMessage (must be plain objects, not Vue Proxies)
        const serializedScenario = JSON.parse(JSON.stringify(scenario.value)) as Scenario;
        const serializedNode = JSON.parse(JSON.stringify(sourceNode.value)) as Node;
        const serializedConfig = JSON.parse(JSON.stringify(parameterConfig.value)) as ParameterConfig;

        const command: SensitivityCommand = {
            type: 'start',
            scenario: serializedScenario,
            sourceNode: serializedNode,
            parameterConfig: serializedConfig,
        };

        w.postMessage(command);
    }

    /**
     * Cancel the ongoing computation
     */
    function cancelComputation(): void {
        if (worker.value) {
            const command: SensitivityCommand = {
                type: 'cancel' 
            };
            worker.value.postMessage(command);
            worker.value.terminate();
            worker.value = null;
        }
        status.value = 'configuring';
    }

    /**
     * Close the sensitivity analysis panel
     */
    function closeAnalysis(): void {
        if (worker.value) {
            worker.value.terminate();
            worker.value = null;
        }
        isOpen.value = false;
        sourceNode.value = null;
        scenario.value = null;
        status.value = 'idle';
        results.value = [];
        error.value = null;
    }

    /**
     * Reset to configuration state (to run a new analysis)
     */
    function resetToConfig(): void {
        status.value = 'configuring';
        results.value = [];
        error.value = null;
    }

    return {
        isOpen,
        sourceNode,
        status,
        progress,
        results,
        error,
        parameterConfig,
        openAnalysis,
        setParameterConfig,
        startComputation,
        cancelComputation,
        closeAnalysis,
        resetToConfig,
    };
});
