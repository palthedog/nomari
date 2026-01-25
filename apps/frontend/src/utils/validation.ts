import type {
    GameDefinition,
} from '@nomari/ts-proto';

export interface ValidationError {
    field: string;
    message: string;
}

/**
 * Validate a GameDefinition
 */
export function validateGameDefinition(gameDefinition: GameDefinition): ValidationError[] {
    const errors: ValidationError[] = [];

    // Collect all valid situation IDs (situations, terminals, and combo starters share the same ID space)
    const allSituationIds = new Set<number>();
    gameDefinition.situations.forEach((s) => allSituationIds.add(s.situationId));
    gameDefinition.terminalSituations.forEach((t) => allSituationIds.add(t.situationId));
    gameDefinition.playerComboStarters.forEach((c) => allSituationIds.add(c.situationId));
    gameDefinition.opponentComboStarters.forEach((c) => allSituationIds.add(c.situationId));

    if (!gameDefinition.rootSituationId) {
        errors.push({
            field: '初期状況',
            message: '初期状況を設定してください',
        });
    } else if (!allSituationIds.has(gameDefinition.rootSituationId)) {
        errors.push({
            field: '初期状況',
            message: '初期状況に設定されている状況が存在しません',
        });
    }

    // Validate all transitions reference existing situations
    for (const situation of gameDefinition.situations) {
        const situationName = situation.name || '(説明なし)';
        for (const transition of situation.transitions) {
            if (!transition.nextSituationId) {
                errors.push({
                    field: `状況「${situationName}」`,
                    message: '遷移先が設定されていません',
                });
            } else if (!allSituationIds.has(transition.nextSituationId)) {
                errors.push({
                    field: `状況「${situationName}」`,
                    message: '遷移先に存在しない状況が設定されています',
                });
            }
        }
    }

    // Validate initialDynamicState has at least one resource
    if (!gameDefinition.initialDynamicState ||
        !gameDefinition.initialDynamicState.resources ||
        gameDefinition.initialDynamicState.resources.length === 0) {
        errors.push({
            field: '初期動的状態',
            message: 'リソースを1つ以上設定してください',
        });
    }

    // Validate that there is at least one Situation
    if (gameDefinition.situations.length === 0) {
        errors.push({
            field: '状況',
            message: '状況を1つ以上作成してください',
        });
    }

    // Validate that there is at least one TerminalSituation
    if (gameDefinition.terminalSituations.length === 0) {
        errors.push({
            field: '終了条件',
            message: '終了条件を1つ以上作成してください',
        });
    }

    return errors;
}
