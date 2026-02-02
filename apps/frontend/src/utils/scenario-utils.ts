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
    }

    for (const terminal of scenario.terminalSituations) {
        maxId = Math.max(maxId, terminal.situationId);
    }

    // Scan player character actions and combo starters
    if (scenario.player) {
        for (const action of scenario.player.actions) {
            maxId = Math.max(maxId, action.actionId);
        }
        for (const comboStarter of scenario.player.comboStarters) {
            maxId = Math.max(maxId, comboStarter.situationId);
        }
    }

    // Scan opponent character actions and combo starters
    if (scenario.opponent) {
        for (const action of scenario.opponent.actions) {
            maxId = Math.max(maxId, action.actionId);
        }
        for (const comboStarter of scenario.opponent.comboStarters) {
            maxId = Math.max(maxId, comboStarter.situationId);
        }
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
        playerActionIds: [],
        opponentActionIds: [],
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
        starterActionId: undefined,
        routes: [],
    };
}

/**
 * Find situation name by situation ID.
 * Searches situations, terminalSituations, player comboStarters, opponent comboStarters.
 */
export function getSituationName(scenario: Scenario, situationId: number): string | null {
    const situation = scenario.situations.find(s => s.situationId === situationId);
    if (situation) {
        return situation.name;
    }

    const terminal = scenario.terminalSituations.find(t => t.situationId === situationId);
    if (terminal) {
        return terminal.name;
    }

    const playerCombo = scenario.player?.comboStarters.find(c => c.situationId === situationId);
    if (playerCombo) {
        return playerCombo.name;
    }

    const opponentCombo = scenario.opponent?.comboStarters.find(c => c.situationId === situationId);
    if (opponentCombo) {
        return opponentCombo.name;
    }

    return null;
}

/**
 * Find the type of situation by ID.
 * Returns the collection name where the situation was found.
 */
export type SituationType = 'situation' | 'terminal' | 'playerCombo' | 'opponentCombo' | null;

export function getSituationType(scenario: Scenario, situationId: number): SituationType {
    if (scenario.situations.find(s => s.situationId === situationId)) {
        return 'situation';
    }
    if (scenario.terminalSituations.find(t => t.situationId === situationId)) {
        return 'terminal';
    }
    if (scenario.player?.comboStarters.find(c => c.situationId === situationId)) {
        return 'playerCombo';
    }
    if (scenario.opponent?.comboStarters.find(c => c.situationId === situationId)) {
        return 'opponentCombo';
    }
    return null;
}
