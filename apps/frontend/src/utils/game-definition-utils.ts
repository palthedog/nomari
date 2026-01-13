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
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Create an initial GameDefinition
 */
export function createInitialGameDefinition(): GameDefinition {
    const rootSituationId = generateId('situation');

    const initialSituation: Situation = {
        situationId: rootSituationId,
        description: '初期状況',
        playerActions: {
            id: 'player',
            actions: [],
        },
        opponentActions: {
            id: 'opponent',
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
        id: generateId('game'),
        name: '新しいゲーム',
        description: '',
        rootSituationId: rootSituationId,
        situations: [initialSituation],
        terminalSituations: [initialTerminalSituation],
        initialDynamicState: {
            resources: [
                {
                    resourceType: ResourceType.PLAYER_HEALTH,
                    value: 5000,
                },
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
            id: 'player',
            actions: [],
        },
        opponentActions: {
            id: 'opponent',
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
