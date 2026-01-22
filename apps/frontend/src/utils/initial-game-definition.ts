import type {
    Action,
    GameDefinition,
    ResourceConsumption,
    Situation,
    TerminalSituation,
    Transition,
} from '@nomari/ts-proto';
import {
    CornerState,
    ResourceType,
} from '@nomari/ts-proto';
import { generateId } from './game-definition-utils';

function generateAction(name: string, description: string): Action {
    return {
        actionId: generateId(),
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
 * Create a Judo GameDefinition
 */
export function createJudoGameDefinition(): GameDefinition {
    const advantageSituationId = generateId();
    const cornerNeutralSituationId = generateId();
    const neutralSituationId = generateId();

    const initialTerminalSituations: TerminalSituation[] =
        [
            {
                situationId: cornerNeutralSituationId,
                name: '画面端 五分',
                description: '画面端にいるけど、距離がいったん離れた',
                cornerState: CornerState.OPPONENT_IN_CORNER,
            },
            {
                situationId: neutralSituationId,
                name: '脱出 五分',
                description: '画面端脱出',
                cornerState: CornerState.PLAYER_IN_CORNER,
            },
        ];

    const defPlayerActions: Action[] = [
        generateAction('打撃重ね', ''),
        generateAction('投げ', ''),
        generateAction('シミー', ''),
    ];
    const defOpponentActions: Action[] = [
        generateAction('遅らせグラップ', '遅らせ投げ抜け'),
        generateAction('ガード', ''),
        generateAction('無敵暴れ', ''),
        generateAction('前ジャンプ', ''),
    ];

    function createTransition(
        playerActionName: string,
        opponentActionName: string,
        nextSituationId: number,
        playerDamage: number,
        opponentDamage: number): Transition {
        // Find playerAction from defPlayerActions by name
        const playerAction = defPlayerActions.find(action => action.name === playerActionName);
        // Find opponentAction from defOpponentActions by name
        const opponentAction = defOpponentActions.find(action => action.name === opponentActionName);

        const resourceConsumptions: ResourceConsumption[] = [];
        if (playerDamage > 0) {
            resourceConsumptions.push(generateResourceConsumption(ResourceType.PLAYER_HEALTH, playerDamage));
        }
        if (opponentDamage > 0) {
            resourceConsumptions.push(generateResourceConsumption(ResourceType.OPPONENT_HEALTH, opponentDamage));
        }

        // Find nextSituation from initialTerminalSituations by name
        return {
            playerActionId: playerAction?.actionId ?? 0,
            opponentActionId: opponentAction?.actionId ?? 0,
            nextSituationId: nextSituationId,
            resourceConsumptions: resourceConsumptions,
        };
    }

    const transitions: Transition[] = [
        createTransition('打撃重ね', '遅らせグラップ', cornerNeutralSituationId, 0, 0),
        createTransition('打撃重ね', 'ガード', cornerNeutralSituationId, 0, 0),
        createTransition('打撃重ね', '無敵暴れ', cornerNeutralSituationId, 1600, 0),
        createTransition('打撃重ね', '前ジャンプ', neutralSituationId, 0, 3000),
        createTransition('投げ', '遅らせグラップ', cornerNeutralSituationId, 0, 0),
        createTransition('投げ', 'ガード', advantageSituationId, 0, 1200),
        createTransition('投げ', '無敵暴れ', cornerNeutralSituationId, 1600, 0),
        createTransition('投げ', '前ジャンプ', neutralSituationId, 0, 0),
        createTransition('シミー', '遅らせグラップ', advantageSituationId, 0, 2000),
        createTransition('シミー', 'ガード', cornerNeutralSituationId, 0, 0),
        createTransition('シミー', '無敵暴れ', advantageSituationId, 0, 3000),
        createTransition('シミー', '前ジャンプ', advantageSituationId, 0, 1600),
    ];


    const initialSituation: Situation = {
        situationId: advantageSituationId,
        name: '画面端 有利',
        playerActions: { actions: defPlayerActions },
        opponentActions: { actions: defOpponentActions },
        transitions: transitions,
    };

    return {
        gameId: generateId(),
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
 * Create a heavy Dimachaerus combo GameDefinition
 * Uses numeric IDs for all situation and action references
 */
export function createHeavyDimachaerusComboGameDefinition(): GameDefinition {
    // Situation IDs (using generateId for consistency)
    const gameId = generateId();
    const rootSituationId = generateId();
    const closeRangeSituationId = generateId();
    const throwRangeSituationId = generateId();
    const afterDashSituationId = generateId();
    const neutralTerminalId = generateId();

    // Action IDs for root situation
    const rootJumpActionId = generateId();
    const rootDashActionId = generateId();
    const rootWaitActionId = generateId();

    // Action IDs for close range situation (player)
    const closeTcActionId = generateId();
    const closeThrowActionId = generateId();
    const closeCommandThrowActionId = generateId();
    const closeGuardActionId = generateId();

    // Action IDs for close range situation (opponent)
    const closeDelayGrapActionId = generateId();
    const closeGuardOppActionId = generateId();
    const closeJumpOppActionId = generateId();
    const closeInvincibleActionId = generateId();

    // Action IDs for throw range situation (player)
    const throwThrowActionId = generateId();
    const throwCommandThrowActionId = generateId();
    const throwShimmyActionId = generateId();

    // Action IDs for throw range situation (opponent)
    const throwDelayGrapActionId = generateId();
    const throwInvincibleActionId = generateId();
    const throwJumpActionId = generateId();

    // Action IDs for after dash situation (player)
    const dashWalkThrowActionId = generateId();
    const dashKneeActionId = generateId();
    const dashShimmyActionId = generateId();

    // Action IDs for after dash situation (opponent)
    const dashGuardActionId = generateId();
    const dashJumpActionId = generateId();
    const dashInvincibleActionId = generateId();
    const dashThrowEscapeActionId = generateId();

    return {
        gameId: gameId,
        name: '強ディマ>溜強P',
        description: '',
        rootSituationId: rootSituationId,
        situations: [
            {
                situationId: rootSituationId,
                name: '強ディマ > 溜強P +47F',
                playerActions: {
                    actions: [
                        { actionId: rootJumpActionId, name: '前ジャンプ', description: '' },
                        { actionId: rootDashActionId, name: '前ステップ', description: '' },
                    ],
                },
                opponentActions: {
                    actions: [
                        { actionId: rootWaitActionId, name: '待機', description: '' },
                    ],
                },
                transitions: [
                    { playerActionId: rootJumpActionId, opponentActionId: rootWaitActionId, nextSituationId: closeRangeSituationId, resourceConsumptions: [] },
                    { playerActionId: rootDashActionId, opponentActionId: rootWaitActionId, nextSituationId: afterDashSituationId, resourceConsumptions: [] },
                ],
            },
            {
                situationId: closeRangeSituationId,
                name: '密着 +4F',
                playerActions: {
                    actions: [
                        { actionId: closeTcActionId, name: '中PTC > 中ディマ', description: '' },
                        { actionId: closeThrowActionId, name: '投げ', description: '' },
                        { actionId: closeCommandThrowActionId, name: 'コマ投げ', description: '' },
                        { actionId: closeGuardActionId, name: 'ガード', description: '様子見' },
                    ],
                },
                opponentActions: {
                    actions: [
                        { actionId: closeDelayGrapActionId, name: '遅らせグラップ', description: '' },
                        { actionId: closeGuardOppActionId, name: 'ガード', description: '' },
                        { actionId: closeJumpOppActionId, name: '垂直ジャンプ', description: '' },
                        { actionId: closeInvincibleActionId, name: '無敵暴れ', description: '' },
                    ],
                },
                transitions: [
                    { playerActionId: closeTcActionId, opponentActionId: closeDelayGrapActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [] },
                    { playerActionId: closeTcActionId, opponentActionId: closeGuardOppActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [] },
                    { playerActionId: closeTcActionId, opponentActionId: closeJumpOppActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [{ resourceType: ResourceType.OPPONENT_HEALTH, value: 2160 }] },
                    { playerActionId: closeTcActionId, opponentActionId: closeInvincibleActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [{ resourceType: ResourceType.PLAYER_HEALTH, value: 1600 }] },
                    { playerActionId: closeThrowActionId, opponentActionId: closeDelayGrapActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [] },
                    { playerActionId: closeThrowActionId, opponentActionId: closeGuardOppActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [{ resourceType: ResourceType.OPPONENT_HEALTH, value: 1200 }] },
                    { playerActionId: closeThrowActionId, opponentActionId: closeJumpOppActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [{ resourceType: ResourceType.PLAYER_HEALTH, value: 1500 }] },
                    { playerActionId: closeThrowActionId, opponentActionId: closeInvincibleActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [{ resourceType: ResourceType.PLAYER_HEALTH, value: 1600 }] },
                    { playerActionId: closeCommandThrowActionId, opponentActionId: closeDelayGrapActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [{ resourceType: ResourceType.OPPONENT_HEALTH, value: 2000 }] },
                    { playerActionId: closeCommandThrowActionId, opponentActionId: closeGuardOppActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [{ resourceType: ResourceType.OPPONENT_HEALTH, value: 2000 }] },
                    { playerActionId: closeCommandThrowActionId, opponentActionId: closeJumpOppActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [{ resourceType: ResourceType.PLAYER_HEALTH, value: 1500 }] },
                    { playerActionId: closeCommandThrowActionId, opponentActionId: closeInvincibleActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [{ resourceType: ResourceType.PLAYER_HEALTH, value: 1600 }] },
                    { playerActionId: closeGuardActionId, opponentActionId: closeDelayGrapActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [{ resourceType: ResourceType.PLAYER_HEALTH, value: 1600 }] },
                    { playerActionId: closeGuardActionId, opponentActionId: closeGuardOppActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [] },
                    { playerActionId: closeGuardActionId, opponentActionId: closeJumpOppActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [{ resourceType: ResourceType.OPPONENT_HEALTH, value: 1000 }] },
                    { playerActionId: closeGuardActionId, opponentActionId: closeInvincibleActionId, nextSituationId: rootSituationId, resourceConsumptions: [{ resourceType: ResourceType.OPPONENT_HEALTH, value: 3910 }] },
                ],
            },
            {
                situationId: throwRangeSituationId,
                name: '投げ間合い +3F',
                playerActions: {
                    actions: [
                        { actionId: throwThrowActionId, name: '投げ', description: '' },
                        { actionId: throwCommandThrowActionId, name: 'コマ投げ', description: '' },
                        { actionId: throwShimmyActionId, name: 'シミー', description: '' },
                    ],
                },
                opponentActions: {
                    actions: [
                        { actionId: throwDelayGrapActionId, name: '遅らせグラップ', description: '' },
                        { actionId: throwInvincibleActionId, name: '無敵暴れ', description: '' },
                        { actionId: throwJumpActionId, name: '垂直ジャンプ', description: '' },
                    ],
                },
                transitions: [
                    { playerActionId: throwThrowActionId, opponentActionId: throwDelayGrapActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [] },
                    { playerActionId: throwThrowActionId, opponentActionId: throwInvincibleActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [{ resourceType: ResourceType.PLAYER_HEALTH, value: 1600 }] },
                    { playerActionId: throwThrowActionId, opponentActionId: throwJumpActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [{ resourceType: ResourceType.PLAYER_HEALTH, value: 1500 }] },
                    { playerActionId: throwCommandThrowActionId, opponentActionId: throwDelayGrapActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [{ resourceType: ResourceType.OPPONENT_HEALTH, value: 2000 }] },
                    { playerActionId: throwCommandThrowActionId, opponentActionId: throwInvincibleActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [{ resourceType: ResourceType.PLAYER_HEALTH, value: 1600 }] },
                    { playerActionId: throwCommandThrowActionId, opponentActionId: throwJumpActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [{ resourceType: ResourceType.PLAYER_HEALTH, value: 1500 }] },
                    { playerActionId: throwShimmyActionId, opponentActionId: throwDelayGrapActionId, nextSituationId: rootSituationId, resourceConsumptions: [{ resourceType: ResourceType.OPPONENT_HEALTH, value: 3760 }] },
                    { playerActionId: throwShimmyActionId, opponentActionId: throwInvincibleActionId, nextSituationId: rootSituationId, resourceConsumptions: [{ resourceType: ResourceType.OPPONENT_HEALTH, value: 3910 }] },
                    { playerActionId: throwShimmyActionId, opponentActionId: throwJumpActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [{ resourceType: ResourceType.OPPONENT_HEALTH, value: 1000 }] },
                ],
            },
            {
                situationId: afterDashSituationId,
                name: '前ステ後 +25F',
                playerActions: {
                    actions: [
                        { actionId: dashWalkThrowActionId, name: '歩き投げ', description: '' },
                        { actionId: dashKneeActionId, name: 'タメ膝', description: 'ガード時 +3F, ヒット時コンボ' },
                        { actionId: dashShimmyActionId, name: 'シミー', description: '' },
                    ],
                },
                opponentActions: {
                    actions: [
                        { actionId: dashGuardActionId, name: 'ガード', description: '' },
                        { actionId: dashJumpActionId, name: '垂直ジャンプ', description: '' },
                        { actionId: dashInvincibleActionId, name: '無敵暴れ', description: '' },
                        { actionId: dashThrowEscapeActionId, name: '投げ抜け', description: '' },
                    ],
                },
                transitions: [
                    { playerActionId: dashWalkThrowActionId, opponentActionId: dashGuardActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [{ resourceType: ResourceType.OPPONENT_HEALTH, value: 1200 }] },
                    { playerActionId: dashWalkThrowActionId, opponentActionId: dashJumpActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [{ resourceType: ResourceType.PLAYER_HEALTH, value: 2500 }] },
                    { playerActionId: dashWalkThrowActionId, opponentActionId: dashInvincibleActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [{ resourceType: ResourceType.PLAYER_HEALTH, value: 1600 }] },
                    { playerActionId: dashWalkThrowActionId, opponentActionId: dashThrowEscapeActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [] },
                    { playerActionId: dashKneeActionId, opponentActionId: dashGuardActionId, nextSituationId: throwRangeSituationId, resourceConsumptions: [] },
                    { playerActionId: dashKneeActionId, opponentActionId: dashJumpActionId, nextSituationId: rootSituationId, resourceConsumptions: [{ resourceType: ResourceType.OPPONENT_HEALTH, value: 3560 }] },
                    { playerActionId: dashKneeActionId, opponentActionId: dashInvincibleActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [{ resourceType: ResourceType.PLAYER_HEALTH, value: 1600 }] },
                    { playerActionId: dashKneeActionId, opponentActionId: dashThrowEscapeActionId, nextSituationId: rootSituationId, resourceConsumptions: [{ resourceType: ResourceType.OPPONENT_HEALTH, value: 3560 }] },
                    { playerActionId: dashShimmyActionId, opponentActionId: dashGuardActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [] },
                    { playerActionId: dashShimmyActionId, opponentActionId: dashJumpActionId, nextSituationId: neutralTerminalId, resourceConsumptions: [{ resourceType: ResourceType.OPPONENT_HEALTH, value: 1000 }] },
                    { playerActionId: dashShimmyActionId, opponentActionId: dashInvincibleActionId, nextSituationId: rootSituationId, resourceConsumptions: [{ resourceType: ResourceType.OPPONENT_HEALTH, value: 3910 }] },
                    { playerActionId: dashShimmyActionId, opponentActionId: dashThrowEscapeActionId, nextSituationId: rootSituationId, resourceConsumptions: [{ resourceType: ResourceType.OPPONENT_HEALTH, value: 3910 }] },
                ],
            },
        ],
        terminalSituations: [
            {
                situationId: neutralTerminalId,
                name: 'ニュートラル',
                description: '',
                cornerState: CornerState.NONE,
            },
        ],
        initialDynamicState: {
            resources: [
                { resourceType: ResourceType.PLAYER_HEALTH, value: 10000 },
                { resourceType: ResourceType.OPPONENT_HEALTH, value: 7000 },
            ],
        },
        rewardComputationMethod: {
            method: {
                oneofKind: 'damageRace',
                damageRace: {},
            },
        },
    };
}
