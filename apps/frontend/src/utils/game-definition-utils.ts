import type {
    GameDefinition,
    Situation,
    TerminalSituation,
} from '@mari/ts-proto';
import {
    ResourceType,
    TerminalSituationType,
} from '@mari/ts-proto';

/**
 * Generate a unique ID with a prefix
 */
export function generateId(prefix: string = 'id'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Create an initial GameDefinition
 */
export function createInitialGameDefinition(): GameDefinition {
    const rootSituationId = generateId('situation');

    const initialSituation: Situation = {
        situationId: rootSituationId,
        description: '密着微有利',
        playerActions: {
            actions: [],
        },
        opponentActions: {
            actions: [],
        },
        transitions: [],
    };

    const initialTerminalSituation: TerminalSituation = {
        situationId: generateId('terminal'),
        type: TerminalSituationType.NEUTRAL,
        name: '終端状況',
        description: '終端状況の説明',
    };

    return {
        gameId: generateId('game'),
        name: '新しいゲーム',
        description: '',
        rootSituationId: rootSituationId,
        situations: [initialSituation],
        terminalSituations: [initialTerminalSituation],
        initialDynamicState: {
            resources: [
                // {
                //     resourceType: ResourceType.PLAYER_HEALTH,
                //     value: 5000,
                // },
                {
                    resourceType: ResourceType.OPPONENT_HEALTH,
                    value: 4000,
                },
            ],
        },
    };
}

/**
 * Create an empty ProtoSituation
 */
export function createEmptySituation(): Situation {
    return {
        situationId: generateId('situation'),
        description: '',
        playerActions: {
            actions: [],
        },
        opponentActions: {
            actions: [],
        },
        transitions: [],
    };
}

/**
 * Create an empty TerminalSituation
 */
export function createEmptyTerminalSituation(): TerminalSituation {
    return {
        situationId: generateId('terminal'),
        type: TerminalSituationType.NEUTRAL,
        name: '',
        description: '',
    };
}
