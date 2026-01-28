import type { GameDefinition, Situation } from '@nomari/ts-proto';

export interface ValidationError {
    field: string;
    message: string;
}

/**
 * Collect all valid situation IDs from the game definition
 */
function collectAllSituationIds(gameDefinition: GameDefinition): Set<number> {
    const ids = new Set<number>();
    for (const s of gameDefinition.situations) {
        ids.add(s.situationId);
    }
    for (const t of gameDefinition.terminalSituations) {
        ids.add(t.situationId);
    }
    for (const c of gameDefinition.playerComboStarters) {
        ids.add(c.situationId);
    }
    for (const c of gameDefinition.opponentComboStarters) {
        ids.add(c.situationId);
    }
    return ids;
}

/**
 * Validate root situation
 */
function validateRootSituation(
    gameDefinition: GameDefinition,
    allSituationIds: Set<number>
): ValidationError[] {
    if (!gameDefinition.rootSituationId) {
        return [{ field: '初期状況', message: '初期状況を設定してください' }];
    }
    if (!allSituationIds.has(gameDefinition.rootSituationId)) {
        return [{ field: '初期状況', message: '初期状況に設定されている状況が存在しません' }];
    }
    return [];
}

/**
 * Build a set of defined transition keys for a situation
 */
function buildDefinedTransitionKeys(situation: Situation): Set<string> {
    const keys = new Set<string>();
    for (const t of situation.transitions) {
        keys.add(`${t.playerActionId}-${t.opponentActionId}`);
    }
    return keys;
}

/**
 * Find missing action combinations in a situation
 */
function findMissingTransitions(situation: Situation): ValidationError[] {
    const playerActions = situation.playerActions?.actions ?? [];
    const opponentActions = situation.opponentActions?.actions ?? [];

    if (playerActions.length === 0 || opponentActions.length === 0) {
        return [];
    }

    const definedKeys = buildDefinedTransitionKeys(situation);
    const errors: ValidationError[] = [];
    const situationName = situation.name || '(説明なし)';

    for (const pa of playerActions) {
        for (const oa of opponentActions) {
            const key = `${pa.actionId}-${oa.actionId}`;
            if (definedKeys.has(key)) {
                continue;
            }
            const paName = pa.name || `アクション${pa.actionId}`;
            const oaName = oa.name || `アクション${oa.actionId}`;
            errors.push({
                field: `状況「${situationName}」`,
                message: `「${paName}」と「${oaName}」の組み合わせに対する遷移が定義されていません`,
            });
        }
    }
    return errors;
}

/**
 * Validate transition destinations in a situation
 */
function validateTransitionDestinations(
    situation: Situation,
    allSituationIds: Set<number>
): ValidationError[] {
    const errors: ValidationError[] = [];
    const situationName = situation.name || '(説明なし)';

    for (const transition of situation.transitions) {
        if (!transition.nextSituationId) {
            errors.push({
                field: `状況「${situationName}」`,
                message: '遷移先が設定されていません',
            });
            continue;
        }
        if (!allSituationIds.has(transition.nextSituationId)) {
            errors.push({
                field: `状況「${situationName}」`,
                message: '遷移先に存在しない状況が設定されています',
            });
        }
    }
    return errors;
}

/**
 * Validate a single situation
 */
function validateSituation(
    situation: Situation,
    allSituationIds: Set<number>
): ValidationError[] {
    return [
        ...findMissingTransitions(situation),
        ...validateTransitionDestinations(situation, allSituationIds),
    ];
}

/**
 * Validate a GameDefinition
 */
export function validateGameDefinition(gameDefinition: GameDefinition): ValidationError[] {
    const errors: ValidationError[] = [];
    const allSituationIds = collectAllSituationIds(gameDefinition);

    errors.push(...validateRootSituation(gameDefinition, allSituationIds));

    for (const situation of gameDefinition.situations) {
        errors.push(...validateSituation(situation, allSituationIds));
    }

    if (!gameDefinition.initialDynamicState?.resources?.length) {
        errors.push({
            field: '初期動的状態',
            message: 'リソースを1つ以上設定してください',
        });
    }

    if (gameDefinition.situations.length === 0) {
        errors.push({
            field: '状況',
            message: '状況を1つ以上作成してください',
        });
    }

    if (gameDefinition.terminalSituations.length === 0) {
        errors.push({
            field: '終了条件',
            message: '終了条件を1つ以上作成してください',
        });
    }

    return errors;
}
