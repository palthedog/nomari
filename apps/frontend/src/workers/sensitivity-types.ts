// Type definitions for Sensitivity Analysis Web Worker communication

import type { Scenario, ResourceType } from '@nomari/ts-proto/generated/game';
import type { Node } from '@nomari/game-tree/game-tree';

/**
 * Configuration for parameter sweep
 */
export interface ParameterConfig {
    resourceType: ResourceType;
    minValue: number;
    maxValue: number;
    stepSize: number;
}

/**
 * Strategy result for a single parameter value
 */
export interface SensitivityResult {
    parameterValue: number;
    playerStrategies: ActionProbability[];
    opponentStrategies: ActionProbability[];
}

export interface ActionProbability {
    actionId: number;
    name: string;
    probability: number;
}

/**
 * Commands sent to the sensitivity worker
 */
export type SensitivityCommand =
    | {
        type: 'start';
        scenario: Scenario;
        sourceNode: Node;
        parameterConfig: ParameterConfig;
    }
    | { type: 'cancel' };

/**
 * Results returned from the sensitivity worker
 */
export type SensitivityResultMessage =
    | {
        type: 'progress';
        current: number;
        total: number;
    }
    | {
        type: 'result';
        data: SensitivityResult;
    }
    | { type: 'complete' }
    | { type: 'error';
        message: string };

/**
 * Status of sensitivity analysis
 */
export type SensitivityStatus = 'idle' | 'configuring' | 'computing' | 'complete' | 'error';
