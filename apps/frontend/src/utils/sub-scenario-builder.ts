// Utility for creating sub-scenarios from a selected node for sensitivity analysis

import type { Scenario, DynamicState, DynamicState_Resource } from '@nomari/ts-proto/generated/game';
import { ResourceType } from '@nomari/ts-proto/generated/game';
import type { Node } from '@nomari/game-tree/game-tree';
import type { ParameterConfig } from '@/workers/sensitivity-types';

/**
 * Creates a sub-scenario from a selected node by overwriting the root situation and initial state.
 * The resulting scenario can be used to analyze strategies starting from that node.
 */
export function createSubScenarioFromNode(scenario: Scenario, node: Node): Scenario {
    const situationId = node.state.situation_id;
    if (situationId === undefined) {
        throw new Error('Node does not have a situation_id');
    }

    return {
        ...scenario,
        rootSituationId: situationId,
        initialDynamicState: createDynamicStateFromNode(node),
    };
}

/**
 * Creates a DynamicState from a node's state values.
 */
export function createDynamicStateFromNode(node: Node): DynamicState {
    const resources: DynamicState_Resource[] = [
        {
            resourceType: ResourceType.PLAYER_HEALTH,
            value: node.state.playerHealth 
        },
        {
            resourceType: ResourceType.OPPONENT_HEALTH,
            value: node.state.opponentHealth 
        },
        {
            resourceType: ResourceType.PLAYER_OD_GAUGE,
            value: node.state.playerOd 
        },
        {
            resourceType: ResourceType.OPPONENT_OD_GAUGE,
            value: node.state.opponentOd 
        },
        {
            resourceType: ResourceType.PLAYER_SA_GAUGE,
            value: node.state.playerSa 
        },
        {
            resourceType: ResourceType.OPPONENT_SA_GAUGE,
            value: node.state.opponentSa 
        },
    ];

    return {
        resources 
    };
}

/**
 * Creates a new DynamicState with one resource type modified to a new value.
 */
export function createVariedDynamicState(
    baseDynamicState: DynamicState,
    resourceType: ResourceType,
    newValue: number
): DynamicState {
    const resources = baseDynamicState.resources.map(r =>
        r.resourceType === resourceType
            ? {
                ...r,
                value: newValue 
            }
            : {
                ...r 
            }
    );

    return {
        resources 
    };
}

/**
 * Generates an array of parameter values for the sweep based on config.
 */
export function generateParameterValues(
    minValue: number,
    maxValue: number,
    stepSize: number
): number[] {
    const values: number[] = [];
    for (let v = minValue; v <= maxValue; v += stepSize) {
        values.push(v);
    }
    return values;
}

/**
 * Returns a human-readable label for a resource type.
 */
export function getResourceTypeLabel(resourceType: ResourceType): string {
    switch (resourceType) {
        case ResourceType.PLAYER_HEALTH:
            return 'プレイヤーHP';
        case ResourceType.OPPONENT_HEALTH:
            return '相手HP';
        case ResourceType.PLAYER_OD_GAUGE:
            return 'プレイヤーOD';
        case ResourceType.OPPONENT_OD_GAUGE:
            return '相手OD';
        case ResourceType.PLAYER_SA_GAUGE:
            return 'プレイヤーSA';
        case ResourceType.OPPONENT_SA_GAUGE:
            return '相手SA';
        default:
            return '不明';
    }
}

/**
 * Returns default parameter config for each resource type.
 */
export function getDefaultParameterConfig(resourceType: ResourceType): ParameterConfig {
    switch (resourceType) {
        case ResourceType.PLAYER_HEALTH:
        case ResourceType.OPPONENT_HEALTH:
            return {
                resourceType,
                minValue: 500,
                maxValue: 10000,
                stepSize: 500
            };
        case ResourceType.PLAYER_OD_GAUGE:
        case ResourceType.OPPONENT_OD_GAUGE:
            return {
                resourceType,
                minValue: 0,
                maxValue: 6000,
                stepSize: 1000
            };
        case ResourceType.PLAYER_SA_GAUGE:
        case ResourceType.OPPONENT_SA_GAUGE:
            return {
                resourceType,
                minValue: 0,
                maxValue: 3000,
                stepSize: 1000
            };
        default:
            return {
                resourceType,
                minValue: 0,
                maxValue: 10000,
                stepSize: 1000
            };
    }
}

/**
 * Formats a parameter value for display based on resource type.
 */
export function formatParameterValue(resourceType: ResourceType, value: number): string {
    switch (resourceType) {
        case ResourceType.PLAYER_HEALTH:
        case ResourceType.OPPONENT_HEALTH:
            return value.toLocaleString();
        case ResourceType.PLAYER_OD_GAUGE:
        case ResourceType.OPPONENT_OD_GAUGE:
        case ResourceType.PLAYER_SA_GAUGE:
        case ResourceType.OPPONENT_SA_GAUGE:
            return (value / 1000).toFixed(1);
        default:
            return value.toString();
    }
}
