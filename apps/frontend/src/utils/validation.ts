import type {
    GameDefinition,
} from '@mari/game-definition/types';

export interface ValidationError {
    field: string;
    message: string;
}

/**
 * Validate a GameDefinition
 */
export function validateGameDefinition(gameDefinition: GameDefinition): ValidationError[] {
    const errors: ValidationError[] = [];

    // Validate rootSituationId exists
    const allSituationIds = new Set<string>();
    gameDefinition.situations.forEach((s) => allSituationIds.add(s.situationId));
    gameDefinition.terminalSituations.forEach((t) => allSituationIds.add(t.situationId));

    if (!gameDefinition.rootSituationId) {
        errors.push({
            field: 'rootSituationId',
            message: 'Root Situation ID is required',
        });
    } else if (!allSituationIds.has(gameDefinition.rootSituationId)) {
        errors.push({
            field: 'rootSituationId',
            message: `Root Situation ID "${gameDefinition.rootSituationId}" does not exist in situations or terminal situations`,
        });
    }

    // Validate all transitions reference existing situations
    for (const situation of gameDefinition.situations) {
        for (const transition of situation.transitions) {
            if (!transition.nextSituationId) {
                errors.push({
                    field: `situation.${situation.situationId}.transitions`,
                    message: `Transition in situation "${situation.situationId}" has no nextSituationId`,
                });
            } else if (!allSituationIds.has(transition.nextSituationId)) {
                errors.push({
                    field: `situation.${situation.situationId}.transitions`,
                    message: `Transition in situation "${situation.situationId}" references non-existent situation "${transition.nextSituationId}"`,
                });
            }
        }
    }

    // Validate initialDynamicState has at least one resource
    if (!gameDefinition.initialDynamicState.resources || gameDefinition.initialDynamicState.resources.length === 0) {
        errors.push({
            field: 'initialDynamicState',
            message: 'Initial Dynamic State must have at least one resource',
        });
    }

    // Validate that there is at least one Situation
    if (gameDefinition.situations.length === 0) {
        errors.push({
            field: 'situations',
            message: 'At least one Situation is required',
        });
    }

    // Validate that there is at least one TerminalSituation
    if (gameDefinition.terminalSituations.length === 0) {
        errors.push({
            field: 'terminalSituations',
            message: 'At least one Terminal Situation is required',
        });
    }

    return errors;
}
