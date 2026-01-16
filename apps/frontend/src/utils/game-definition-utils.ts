import type {
    GameDefinition,
    Situation,
    TerminalSituation,
} from '@mari/ts-proto';
import './initial-game-definition';
import { createHeavyDimachaerusComboGameDefinition } from './initial-game-definition';

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
    //return createJudoGameDefinition();
    return createHeavyDimachaerusComboGameDefinition();
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
        name: '',
        description: '',
    };
}
