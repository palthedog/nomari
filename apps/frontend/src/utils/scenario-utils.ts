import {
    Scenario,
    Situation,
    TerminalSituation,
    ComboStarter,
} from '@nomari/ts-proto';
import './initial-scenario';
import { createEmptyScenario } from './initial-scenario';

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
 * Extract the maximum ID from a Scenario
 * Scans gameId, situationIds, and actionIds
 */
export function findMaxIdInScenario(scenario: Scenario): number {
    let maxId = scenario.gameId;
    maxId = Math.max(maxId, scenario.rootSituationId);

    for (const situation of scenario.situations) {
        maxId = Math.max(maxId, situation.situationId);
        for (const action of situation.playerActions?.actions ?? []) {
            maxId = Math.max(maxId, action.actionId);
        }
        for (const action of situation.opponentActions?.actions ?? []) {
            maxId = Math.max(maxId, action.actionId);
        }
    }

    for (const terminal of scenario.terminalSituations) {
        maxId = Math.max(maxId, terminal.situationId);
    }

    for (const comboStarter of scenario.playerComboStarters) {
        maxId = Math.max(maxId, comboStarter.situationId);
    }

    for (const comboStarter of scenario.opponentComboStarters) {
        maxId = Math.max(maxId, comboStarter.situationId);
    }

    return maxId;
}

/**
 * Sync the ID counter based on the Scenario
 * Call this after loading or importing a Scenario
 */
export function syncIdCounterWithScenario(scenario: Scenario): void {
    const maxId = findMaxIdInScenario(scenario);
    ensureIdCounterAbove(maxId);
}

/**
 * Create an initial Scenario
 */
export function createInitialScenario(): Scenario {
    return createEmptyScenario();
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

/**
 * Create an empty ComboStarter
 */
export function createEmptyComboStarter(): ComboStarter {
    return {
        situationId: generateId(),
        name: '',
        description: '',
        routes: [],
    };
}
