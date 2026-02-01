// Sensitivity Analysis Web Worker
// Runs batch LP solving across parameter variations

import { LPSolver } from '@nomari/solver/lp';
import { buildGameTree } from '@nomari/game-tree-builder';
import type { Scenario } from '@nomari/ts-proto/generated/game';
import type { Node, GameTree } from '@nomari/game-tree/game-tree';
import type {
    SensitivityCommand,
    SensitivityResultMessage,
    SensitivityResult,
    ActionProbability,
    ParameterConfig,
} from './sensitivity-types';
import {
    createSubScenarioFromNode,
    createVariedDynamicState,
    generateParameterValues,
} from '@/utils/sub-scenario-builder';
import log from 'loglevel';

let cancelled = false;

function postResult(result: SensitivityResultMessage): void {
    self.postMessage(result);
}

/**
 * Get the root node strategy from a solved game tree
 */
function getRootNodeStrategy(
    solver: LPSolver,
    gameTree: GameTree
): { playerStrategies: ActionProbability[];
    opponentStrategies: ActionProbability[] } {
    const rootNode = gameTree.nodes[gameTree.root];
    if (!rootNode) {
        return {
            playerStrategies: [],
            opponentStrategies: [] 
        };
    }

    const playerStrategies: ActionProbability[] = [];
    const opponentStrategies: ActionProbability[] = [];

    // Get player strategy
    const playerStrategyMap = solver.getAverageStrategy(gameTree.root);
    if (rootNode.playerActions) {
        for (const action of rootNode.playerActions.actions) {
            const prob = playerStrategyMap?.get(action.actionId) ?? 0;
            playerStrategies.push({
                actionId: action.actionId,
                name: action.name,
                probability: prob,
            });
        }
    }

    // Get opponent strategy
    const opponentStrategyMap = solver.getAverageOpponentStrategy(gameTree.root);
    if (rootNode.opponentActions) {
        for (const action of rootNode.opponentActions.actions) {
            const prob = opponentStrategyMap?.get(action.actionId) ?? 0;
            opponentStrategies.push({
                actionId: action.actionId,
                name: action.name,
                probability: prob,
            });
        }
    }

    return {
        playerStrategies,
        opponentStrategies 
    };
}

/**
 * Run sensitivity analysis across parameter variations
 */
async function runSensitivityAnalysis(
    scenario: Scenario,
    sourceNode: Node,
    parameterConfig: ParameterConfig
): Promise<void> {
    cancelled = false;

    // Create base sub-scenario from source node
    const baseSubScenario = createSubScenarioFromNode(scenario, sourceNode);

    // Generate parameter values to test
    const parameterValues = generateParameterValues(
        parameterConfig.minValue,
        parameterConfig.maxValue,
        parameterConfig.stepSize
    );

    const total = parameterValues.length;
    postResult({
        type: 'progress',
        current: 0,
        total 
    });

    for (let i = 0; i < parameterValues.length; i++) {
        if (cancelled) {
            log.info('Sensitivity analysis cancelled');
            return;
        }

        const paramValue = parameterValues[i];

        // Create scenario with varied parameter
        const variedDynamicState = createVariedDynamicState(
            baseSubScenario.initialDynamicState!,
            parameterConfig.resourceType,
            paramValue
        );

        const variedScenario: Scenario = {
            ...baseSubScenario,
            initialDynamicState: variedDynamicState,
        };

        // Build game tree
        const buildResult = buildGameTree(variedScenario);
        if (!buildResult.success) {
            log.warn(`Failed to build game tree for parameter value ${paramValue}:`, buildResult.error);
            continue;
        }

        // Solve
        const solver = new LPSolver(buildResult.gameTree);
        if (!solver.solve()) {
            log.warn(`Failed to solve for parameter value ${paramValue}`);
            continue;
        }

        // Extract root strategy
        const { playerStrategies, opponentStrategies } = getRootNodeStrategy(solver, buildResult.gameTree);

        const result: SensitivityResult = {
            parameterValue: paramValue,
            playerStrategies,
            opponentStrategies,
        };

        postResult({
            type: 'result',
            data: result 
        });
        postResult({
            type: 'progress',
            current: i + 1,
            total 
        });
    }

    postResult({
        type: 'complete' 
    });
}

/**
 * Handle incoming messages from the main thread
 */
self.onmessage = async (event: MessageEvent<SensitivityCommand>) => {
    const command = event.data;

    switch (command.type) {
        case 'start':
            try {
                await runSensitivityAnalysis(
                    command.scenario,
                    command.sourceNode,
                    command.parameterConfig
                );
            } catch (error) {
                postResult({
                    type: 'error',
                    message: error instanceof Error ? error.message : 'Unknown error',
                });
            }
            break;

        case 'cancel':
            cancelled = true;
            break;
    }
};
