import {
    GameDefinition,
    Situation,
    TerminalSituation,
} from '@nomari/ts-proto';
import './initial-game-definition';
import { createEmptyGameDefinition } from './initial-game-definition';

// Counter for generating unique IDs
let idCounter = 1;

/**
 * Generate a unique numeric ID using counter approach
 */
export function generateId(): number {
    return idCounter++;
}

/**
 * Reset the ID counter (useful for testing or when loading a new definition)
 */
export function resetIdCounter(startValue: number = 1): void {
    idCounter = startValue;
}

/**
 * Set the ID counter to be higher than the given value
 * Useful when loading existing definitions to avoid ID conflicts
 */
export function ensureIdCounterAbove(maxExistingId: number): void {
    if (idCounter <= maxExistingId) {
        idCounter = maxExistingId + 1;
    }
}

/**
 * Extract the maximum ID from a GameDefinition
 * Scans gameId, situationIds, and actionIds
 */
export function findMaxIdInGameDefinition(gameDefinition: GameDefinition): number {
    let maxId = gameDefinition.gameId;
    maxId = Math.max(maxId, gameDefinition.rootSituationId);

    for (const situation of gameDefinition.situations) {
        maxId = Math.max(maxId, situation.situationId);
        for (const action of situation.playerActions?.actions ?? []) {
            maxId = Math.max(maxId, action.actionId);
        }
        for (const action of situation.opponentActions?.actions ?? []) {
            maxId = Math.max(maxId, action.actionId);
        }
    }

    for (const terminal of gameDefinition.terminalSituations) {
        maxId = Math.max(maxId, terminal.situationId);
    }

    return maxId;
}

/**
 * Sync the ID counter based on the GameDefinition
 * Call this after loading or importing a GameDefinition
 */
export function syncIdCounterWithGameDefinition(gameDefinition: GameDefinition): void {
    const maxId = findMaxIdInGameDefinition(gameDefinition);
    ensureIdCounterAbove(maxId);
}

/**
 * Create an initial GameDefinition
 */
export function createInitialGameDefinition(): GameDefinition {
    return createEmptyGameDefinition();
}

/**
 * Create an empty ProtoSituation
 */
export function createEmptySituation(): Situation {
    return {
        situationId: generateId(),
        name: '',
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
        situationId: generateId(),
        name: '',
        description: '',
    };
}
