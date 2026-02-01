import type {
    Scenario,
    Situation,
    TerminalSituation,
    Action,
    Character,
} from '@nomari/ts-proto';
import {
    ActionType,
    CornerState,
    ResourceType,
} from '@nomari/ts-proto';
import { generateId } from './scenario-utils';

function createInitialSituation(): Situation {
    return {
        situationId: generateId(),
        name: "開始状況",
        playerActionIds: [],
        opponentActionIds: [],
        transitions: [],
    };
}

function createInitialTerminalSituation(): TerminalSituation {
    return {
        situationId: generateId(),
        name: "起き攻め状況終わり",
        description: "キャラクター同士の距離が離れて起き攻めが続かない",
        cornerState: CornerState.NONE,
    };
}

/**
 * Create a default action
 */
function createAction(
    id: number,
    name: string,
    actionType: ActionType = ActionType.NORMAL
): Action {
    return {
        actionId: id,
        name,
        description: '',
        actionType,
    };
}

/**
 * Create an empty Character
 */
function createEmptyCharacter(name: string): Character {
    return {
        name,
        actions: [],
        comboStarters: [],
    };
}

export function createEmptyScenario(): Scenario {
    const initialSituation = createInitialSituation();
    return {
        gameId: 0,
        name: "",
        description: "",
        rootSituationId: initialSituation.situationId,
        situations: [
            initialSituation,
        ],
        terminalSituations: [
            createInitialTerminalSituation(),
        ],
        initialDynamicState: {
            resources: [
                {
                    resourceType: ResourceType.PLAYER_HEALTH,
                    value: 10000 
                },
                {
                    resourceType: ResourceType.OPPONENT_HEALTH,
                    value: 10000 
                },
                {
                    resourceType: ResourceType.PLAYER_OD_GAUGE,
                    value: 6 
                },
                {
                    resourceType: ResourceType.OPPONENT_OD_GAUGE,
                    value: 6 
                },
                {
                    resourceType: ResourceType.PLAYER_SA_GAUGE,
                    value: 0 
                },
                {
                    resourceType: ResourceType.OPPONENT_SA_GAUGE,
                    value: 0 
                },
            ],
        },
        rewardComputationMethod: {
            method: {
                oneofKind: 'damageRace',
                damageRace: {},
            },
        },
        player: createEmptyCharacter('プレイヤー'),
        opponent: createEmptyCharacter('相手'),
    };
}

/**
 * Create a Judo Scenario with new Character-based structure
 */
export function createJudoScenario(): Scenario {
    // Action IDs
    const strikeActionId = generateId();
    const throwActionId = generateId();
    const shimmyActionId = generateId();
    const delayGrapActionId = generateId();
    const guardActionId = generateId();
    const invincibleActionId = generateId();
    const jumpActionId = generateId();
    const strikeHitActionId = generateId();
    const receiveActionId = generateId();
    const panicanHitActionId = generateId();
    const panicanReceiveActionId = generateId();

    // Situation IDs
    const mainSituationId = generateId();
    const strikeHitSituationId = generateId();
    const panicanHitSituationId = generateId();
    const evenTerminalId = generateId();
    const escapeTerminalId = generateId();

    return {
        gameId: generateId(),
        name: "画面端柔道",
        description: "",
        rootSituationId: mainSituationId,
        situations: [
            {
                situationId: mainSituationId,
                name: "画面端 有利",
                playerActionIds: [strikeActionId, throwActionId, shimmyActionId],
                opponentActionIds: [delayGrapActionId, guardActionId, invincibleActionId, jumpActionId],
                transitions: [
                    {
                        playerActionId: strikeActionId,
                        opponentActionId: delayGrapActionId,
                        nextSituationId: evenTerminalId 
                    },
                    {
                        playerActionId: strikeActionId,
                        opponentActionId: guardActionId,
                        nextSituationId: evenTerminalId 
                    },
                    {
                        playerActionId: strikeActionId,
                        opponentActionId: invincibleActionId,
                        nextSituationId: evenTerminalId 
                    },
                    {
                        playerActionId: strikeActionId,
                        opponentActionId: jumpActionId,
                        nextSituationId: strikeHitSituationId 
                    },
                    {
                        playerActionId: throwActionId,
                        opponentActionId: delayGrapActionId,
                        nextSituationId: evenTerminalId 
                    },
                    {
                        playerActionId: throwActionId,
                        opponentActionId: guardActionId,
                        nextSituationId: mainSituationId 
                    },
                    {
                        playerActionId: throwActionId,
                        opponentActionId: invincibleActionId,
                        nextSituationId: evenTerminalId 
                    },
                    {
                        playerActionId: throwActionId,
                        opponentActionId: jumpActionId,
                        nextSituationId: escapeTerminalId 
                    },
                    {
                        playerActionId: shimmyActionId,
                        opponentActionId: delayGrapActionId,
                        nextSituationId: panicanHitSituationId 
                    },
                    {
                        playerActionId: shimmyActionId,
                        opponentActionId: guardActionId,
                        nextSituationId: evenTerminalId 
                    },
                    {
                        playerActionId: shimmyActionId,
                        opponentActionId: invincibleActionId,
                        nextSituationId: panicanHitSituationId 
                    },
                    {
                        playerActionId: shimmyActionId,
                        opponentActionId: jumpActionId,
                        nextSituationId: escapeTerminalId 
                    },
                ]
            },
            {
                situationId: strikeHitSituationId,
                name: "打撃ヒット",
                playerActionIds: [strikeHitActionId],
                opponentActionIds: [receiveActionId],
                transitions: [
                    {
                        playerActionId: strikeHitActionId,
                        opponentActionId: receiveActionId,
                        nextSituationId: mainSituationId 
                    }
                ]
            },
            {
                situationId: panicanHitSituationId,
                name: "打撃パニカンヒット",
                playerActionIds: [panicanHitActionId],
                opponentActionIds: [panicanReceiveActionId],
                transitions: [
                    {
                        playerActionId: panicanHitActionId,
                        opponentActionId: panicanReceiveActionId,
                        nextSituationId: mainSituationId 
                    }
                ]
            }
        ],
        terminalSituations: [
            {
                situationId: evenTerminalId,
                name: "画面端 五分",
                description: "画面端にいるけど、距離がいったん離れた",
                cornerState: CornerState.OPPONENT_IN_CORNER
            },
            {
                situationId: escapeTerminalId,
                name: "脱出 五分",
                description: "画面端脱出",
                cornerState: CornerState.PLAYER_IN_CORNER
            }
        ],
        initialDynamicState: {
            resources: [
                {
                    resourceType: ResourceType.PLAYER_HEALTH,
                    value: 4000 
                },
                {
                    resourceType: ResourceType.OPPONENT_HEALTH,
                    value: 4000 
                }
            ]
        },
        rewardComputationMethod: {
            method: {
                oneofKind: 'damageRace',
                damageRace: {}
            }
        },
        player: {
            name: 'プレイヤー',
            actions: [
                createAction(strikeActionId, "打撃重ね"),
                createAction(throwActionId, "投げ"),
                createAction(shimmyActionId, "シミー"),
                createAction(strikeHitActionId, "打撃ヒット"),
                createAction(panicanHitActionId, "パニカンヒット"),
            ],
            comboStarters: [],
        },
        opponent: {
            name: '相手',
            actions: [
                createAction(delayGrapActionId, "遅らせグラップ"),
                createAction(guardActionId, "ガード"),
                createAction(invincibleActionId, "無敵暴れ"),
                createAction(jumpActionId, "前ジャンプ"),
                createAction(receiveActionId, "受け"),
                createAction(panicanReceiveActionId, "受け"),
            ],
            comboStarters: [],
        },
    };
}

/**
 * Create a heavy Dimachaerus combo Scenario
 * Uses numeric IDs for all situation and action references
 */
export function createHeavyDimachaerusComboScenario(): Scenario {
    // Situation IDs
    const gameId = generateId();
    const rootSituationId = generateId();
    const closeRangeSituationId = generateId();
    const throwRangeSituationId = generateId();
    const afterDashSituationId = generateId();
    const neutralTerminalId = generateId();

    // Player Action IDs
    const rootJumpActionId = generateId();
    const rootDashActionId = generateId();
    const closeTcActionId = generateId();
    const closeThrowActionId = generateId();
    const closeCommandThrowActionId = generateId();
    const closeGuardActionId = generateId();
    const throwThrowActionId = generateId();
    const throwCommandThrowActionId = generateId();
    const throwShimmyActionId = generateId();
    const dashWalkThrowActionId = generateId();
    const dashKneeActionId = generateId();
    const dashShimmyActionId = generateId();

    // Opponent Action IDs
    const rootWaitActionId = generateId();
    const closeDelayGrapActionId = generateId();
    const closeGuardOppActionId = generateId();
    const closeJumpOppActionId = generateId();
    const closeInvincibleActionId = generateId();
    const throwDelayGrapActionId = generateId();
    const throwInvincibleActionId = generateId();
    const throwJumpActionId = generateId();
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
                playerActionIds: [rootJumpActionId, rootDashActionId],
                opponentActionIds: [rootWaitActionId],
                transitions: [
                    {
                        playerActionId: rootJumpActionId,
                        opponentActionId: rootWaitActionId,
                        nextSituationId: closeRangeSituationId 
                    },
                    {
                        playerActionId: rootDashActionId,
                        opponentActionId: rootWaitActionId,
                        nextSituationId: afterDashSituationId 
                    },
                ],
            },
            {
                situationId: closeRangeSituationId,
                name: '密着 +4F',
                playerActionIds: [closeTcActionId, closeThrowActionId, closeCommandThrowActionId, closeGuardActionId],
                opponentActionIds: [closeDelayGrapActionId, closeGuardOppActionId, closeJumpOppActionId, closeInvincibleActionId],
                transitions: [
                    {
                        playerActionId: closeTcActionId,
                        opponentActionId: closeDelayGrapActionId,
                        nextSituationId: neutralTerminalId 
                    },
                    {
                        playerActionId: closeTcActionId,
                        opponentActionId: closeGuardOppActionId,
                        nextSituationId: neutralTerminalId 
                    },
                    {
                        playerActionId: closeTcActionId,
                        opponentActionId: closeJumpOppActionId,
                        nextSituationId: neutralTerminalId 
                    },
                    {
                        playerActionId: closeTcActionId,
                        opponentActionId: closeInvincibleActionId,
                        nextSituationId: neutralTerminalId 
                    },
                    {
                        playerActionId: closeThrowActionId,
                        opponentActionId: closeDelayGrapActionId,
                        nextSituationId: neutralTerminalId 
                    },
                    {
                        playerActionId: closeThrowActionId,
                        opponentActionId: closeGuardOppActionId,
                        nextSituationId: neutralTerminalId 
                    },
                    {
                        playerActionId: closeThrowActionId,
                        opponentActionId: closeJumpOppActionId,
                        nextSituationId: neutralTerminalId 
                    },
                    {
                        playerActionId: closeThrowActionId,
                        opponentActionId: closeInvincibleActionId,
                        nextSituationId: neutralTerminalId 
                    },
                    {
                        playerActionId: closeCommandThrowActionId,
                        opponentActionId: closeDelayGrapActionId,
                        nextSituationId: neutralTerminalId 
                    },
                    {
                        playerActionId: closeCommandThrowActionId,
                        opponentActionId: closeGuardOppActionId,
                        nextSituationId: neutralTerminalId 
                    },
                    {
                        playerActionId: closeCommandThrowActionId,
                        opponentActionId: closeJumpOppActionId,
                        nextSituationId: neutralTerminalId 
                    },
                    {
                        playerActionId: closeCommandThrowActionId,
                        opponentActionId: closeInvincibleActionId,
                        nextSituationId: neutralTerminalId 
                    },
                    {
                        playerActionId: closeGuardActionId,
                        opponentActionId: closeDelayGrapActionId,
                        nextSituationId: neutralTerminalId 
                    },
                    {
                        playerActionId: closeGuardActionId,
                        opponentActionId: closeGuardOppActionId,
                        nextSituationId: neutralTerminalId 
                    },
                    {
                        playerActionId: closeGuardActionId,
                        opponentActionId: closeJumpOppActionId,
                        nextSituationId: neutralTerminalId 
                    },
                    {
                        playerActionId: closeGuardActionId,
                        opponentActionId: closeInvincibleActionId,
                        nextSituationId: rootSituationId 
                    },
                ],
            },
            {
                situationId: throwRangeSituationId,
                name: '投げ間合い +3F',
                playerActionIds: [throwThrowActionId, throwCommandThrowActionId, throwShimmyActionId],
                opponentActionIds: [throwDelayGrapActionId, throwInvincibleActionId, throwJumpActionId],
                transitions: [
                    {
                        playerActionId: throwThrowActionId,
                        opponentActionId: throwDelayGrapActionId,
                        nextSituationId: neutralTerminalId 
                    },
                    {
                        playerActionId: throwThrowActionId,
                        opponentActionId: throwInvincibleActionId,
                        nextSituationId: neutralTerminalId 
                    },
                    {
                        playerActionId: throwThrowActionId,
                        opponentActionId: throwJumpActionId,
                        nextSituationId: neutralTerminalId 
                    },
                    {
                        playerActionId: throwCommandThrowActionId,
                        opponentActionId: throwDelayGrapActionId,
                        nextSituationId: neutralTerminalId 
                    },
                    {
                        playerActionId: throwCommandThrowActionId,
                        opponentActionId: throwInvincibleActionId,
                        nextSituationId: neutralTerminalId 
                    },
                    {
                        playerActionId: throwCommandThrowActionId,
                        opponentActionId: throwJumpActionId,
                        nextSituationId: neutralTerminalId 
                    },
                    {
                        playerActionId: throwShimmyActionId,
                        opponentActionId: throwDelayGrapActionId,
                        nextSituationId: rootSituationId 
                    },
                    {
                        playerActionId: throwShimmyActionId,
                        opponentActionId: throwInvincibleActionId,
                        nextSituationId: rootSituationId 
                    },
                    {
                        playerActionId: throwShimmyActionId,
                        opponentActionId: throwJumpActionId,
                        nextSituationId: neutralTerminalId 
                    },
                ],
            },
            {
                situationId: afterDashSituationId,
                name: '前ステ後 +25F',
                playerActionIds: [dashWalkThrowActionId, dashKneeActionId, dashShimmyActionId],
                opponentActionIds: [dashGuardActionId, dashJumpActionId, dashInvincibleActionId, dashThrowEscapeActionId],
                transitions: [
                    {
                        playerActionId: dashWalkThrowActionId,
                        opponentActionId: dashGuardActionId,
                        nextSituationId: neutralTerminalId 
                    },
                    {
                        playerActionId: dashWalkThrowActionId,
                        opponentActionId: dashJumpActionId,
                        nextSituationId: neutralTerminalId 
                    },
                    {
                        playerActionId: dashWalkThrowActionId,
                        opponentActionId: dashInvincibleActionId,
                        nextSituationId: neutralTerminalId 
                    },
                    {
                        playerActionId: dashWalkThrowActionId,
                        opponentActionId: dashThrowEscapeActionId,
                        nextSituationId: neutralTerminalId 
                    },
                    {
                        playerActionId: dashKneeActionId,
                        opponentActionId: dashGuardActionId,
                        nextSituationId: throwRangeSituationId 
                    },
                    {
                        playerActionId: dashKneeActionId,
                        opponentActionId: dashJumpActionId,
                        nextSituationId: rootSituationId 
                    },
                    {
                        playerActionId: dashKneeActionId,
                        opponentActionId: dashInvincibleActionId,
                        nextSituationId: neutralTerminalId 
                    },
                    {
                        playerActionId: dashKneeActionId,
                        opponentActionId: dashThrowEscapeActionId,
                        nextSituationId: rootSituationId 
                    },
                    {
                        playerActionId: dashShimmyActionId,
                        opponentActionId: dashGuardActionId,
                        nextSituationId: neutralTerminalId 
                    },
                    {
                        playerActionId: dashShimmyActionId,
                        opponentActionId: dashJumpActionId,
                        nextSituationId: neutralTerminalId 
                    },
                    {
                        playerActionId: dashShimmyActionId,
                        opponentActionId: dashInvincibleActionId,
                        nextSituationId: rootSituationId 
                    },
                    {
                        playerActionId: dashShimmyActionId,
                        opponentActionId: dashThrowEscapeActionId,
                        nextSituationId: rootSituationId 
                    },
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
                {
                    resourceType: ResourceType.PLAYER_HEALTH,
                    value: 10000 
                },
                {
                    resourceType: ResourceType.OPPONENT_HEALTH,
                    value: 7000 
                },
            ],
        },
        rewardComputationMethod: {
            method: {
                oneofKind: 'damageRace',
                damageRace: {},
            },
        },
        player: {
            name: 'プレイヤー',
            actions: [
                createAction(rootJumpActionId, '前ジャンプ'),
                createAction(rootDashActionId, '前ステップ'),
                createAction(closeTcActionId, '中PTC > 中ディマ'),
                createAction(closeThrowActionId, '投げ'),
                createAction(closeCommandThrowActionId, 'コマ投げ'),
                createAction(closeGuardActionId, 'ガード'),
                createAction(throwThrowActionId, '投げ'),
                createAction(throwCommandThrowActionId, 'コマ投げ'),
                createAction(throwShimmyActionId, 'シミー'),
                createAction(dashWalkThrowActionId, '歩き投げ'),
                createAction(dashKneeActionId, 'タメ膝'),
                createAction(dashShimmyActionId, 'シミー'),
            ],
            comboStarters: [],
        },
        opponent: {
            name: '相手',
            actions: [
                createAction(rootWaitActionId, '待機'),
                createAction(closeDelayGrapActionId, '遅らせグラップ'),
                createAction(closeGuardOppActionId, 'ガード'),
                createAction(closeJumpOppActionId, '垂直ジャンプ'),
                createAction(closeInvincibleActionId, '無敵暴れ'),
                createAction(throwDelayGrapActionId, '遅らせグラップ'),
                createAction(throwInvincibleActionId, '無敵暴れ'),
                createAction(throwJumpActionId, '垂直ジャンプ'),
                createAction(dashGuardActionId, 'ガード'),
                createAction(dashJumpActionId, '垂直ジャンプ'),
                createAction(dashInvincibleActionId, '無敵暴れ'),
                createAction(dashThrowEscapeActionId, '投げ抜け'),
            ],
            comboStarters: [],
        },
    };
}
