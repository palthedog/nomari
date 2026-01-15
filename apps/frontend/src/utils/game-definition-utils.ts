import type {
    Action,
    GameDefinition,
    ResourceConsumption,
    Situation,
    TerminalSituation,
    Transition,
} from '@mari/ts-proto';
import {
    ResourceType,
} from '@mari/ts-proto';

/**
 * Generate a unique ID with a prefix
 */
export function generateId(prefix: string = 'id'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function generateAction(name: string, description: string): Action {
    return {
        actionId: generateId('action'),
        name: name,
        description: description,
    };
}

function generateResourceConsumption(resourceType: ResourceType, value: number): ResourceConsumption {
    return {
        resourceType: resourceType,
        value: value,
    };
}

/**
 * Create an initial GameDefinition
 */
export function createInitialGameDefinition(): GameDefinition {
    const advantageSituationId = generateId('situation');
    const cornerNeutralSituationId = generateId('situation');
    const neutralSituationId = generateId('situation');

    const initialTerminalSituations: TerminalSituation[] =
        [
            {
                situationId: cornerNeutralSituationId,
                name: '画面端 五分',
                description: '画面端にいるけど、距離がいったん離れた',
            },
            {
                situationId: neutralSituationId,
                name: '脱出 五分',
                description: '画面端脱出',
            },
        ];

    const defPlayerActions: Action[] = [
        generateAction('投げ', ''),
        generateAction('シミー', ''),
    ];
    const defOpponentActions: Action[] = [
        generateAction('グラップ', '遅らせグラップ'),
        generateAction('ガード', ''),
        generateAction('無敵暴れ', ''),
        generateAction('前ジャンプ', ''),
    ];

    function createTransition(
        playerActionName: string,
        opponentActionName: string,
        nextSituationId: string,
        playerDamage: number,
        opponentDamage: number): Transition {
        // Find playerAction from defPlayerActions by name
        const playerAction = defPlayerActions.find(action => action.name === playerActionName);
        // Find opponentAction from defOpponentActions by name
        const opponentAction = defOpponentActions.find(action => action.name === opponentActionName);

        let resourceConsumptions: ResourceConsumption[] = [];
        if (playerDamage > 0) {
            resourceConsumptions.push(generateResourceConsumption(ResourceType.PLAYER_HEALTH, playerDamage));
        }
        if (opponentDamage > 0) {
            resourceConsumptions.push(generateResourceConsumption(ResourceType.OPPONENT_HEALTH, opponentDamage));
        }

        // Find nextSituation from initialTerminalSituations by name
        return {
            playerActionId: playerAction?.actionId ?? '',
            opponentActionId: opponentAction?.actionId ?? '',
            nextSituationId: nextSituationId,
            resourceConsumptions: resourceConsumptions,
        };
    }

    const transitions: Transition[] = [
        createTransition('投げ', 'グラップ', cornerNeutralSituationId, 0, 0),
        createTransition('投げ', 'ガード', advantageSituationId, 0, 1200),
        createTransition('投げ', '無敵暴れ', cornerNeutralSituationId, 1600, 0),
        createTransition('投げ', '前ジャンプ', neutralSituationId, 0, 0),
        createTransition('シミー', 'グラップ', advantageSituationId, 0, 2000),
        createTransition('シミー', 'ガード', cornerNeutralSituationId, 0, 0),
        createTransition('シミー', '無敵暴れ', advantageSituationId, 0, 3000),
        createTransition('シミー', '前ジャンプ', advantageSituationId, 0, 1600),
    ];


    const initialSituation: Situation = {
        situationId: advantageSituationId,
        description: '画面端 有利',
        playerActions: { actions: defPlayerActions },
        opponentActions: { actions: defOpponentActions },
        transitions: transitions,
    };

    return {
        gameId: generateId('game'),
        name: '画面端柔道',
        description: '',
        rootSituationId: advantageSituationId,
        situations: [initialSituation],
        terminalSituations: initialTerminalSituations,
        initialDynamicState: {
            resources: [
                {
                    resourceType: ResourceType.PLAYER_HEALTH,
                    value: 4000,
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
