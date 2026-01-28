import type {
    GameDefinition,
    Situation,
    TerminalSituation,
} from '@nomari/ts-proto';
import {
    CornerState,
    ResourceType,
} from '@nomari/ts-proto';
import { generateId } from './game-definition-utils';

function createInitialSituation(): Situation {
    return {
        situationId: generateId(),
        name: "開始状況",
        playerActions: {
            actions: [],
        },
        opponentActions: {
            actions: [],
        },
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

export function createEmptyGameDefinition(): GameDefinition {
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
        playerComboStarters: [],
        opponentComboStarters: [],
    };
}

/**
 * Create a Judo GameDefinition
 */
export function createJudoGameDefinition(): GameDefinition {
    return {
        gameId: 11,
        name: "画面端柔道",
        description: "",
        rootSituationId: 1,
        situations: [
            {
                situationId: 1,
                name: "画面端 有利",
                playerActions: {
                    actions: [
                        // All actions must specify the required fields: actionId, name, and description
                        {
                            actionId: 4,
                            name: "打撃重ね",
                            description: "" 
                        },
                        {
                            actionId: 5,
                            name: "投げ",
                            description: "" 
                        },
                        {
                            actionId: 6,
                            name: "シミー",
                            description: "" 
                        }
                    ]
                },
                opponentActions: {
                    actions: [
                        {
                            actionId: 7,
                            name: "遅らせグラップ",
                            description: "遅らせ投げ抜け" 
                        },
                        {
                            actionId: 8,
                            name: "ガード",
                            description: "" 
                        },
                        {
                            actionId: 9,
                            name: "無敵暴れ",
                            description: "" 
                        },
                        {
                            actionId: 10,
                            name: "前ジャンプ",
                            description: "" 
                        }
                    ]
                },
                transitions: [
                    // All transitions must specify resourceConsumptions even if it's empty
                    {
                        playerActionId: 4,
                        opponentActionId: 7,
                        nextSituationId: 2,
                        resourceConsumptions: [],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: 4,
                        opponentActionId: 8,
                        nextSituationId: 2,
                        resourceConsumptions: [],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: 4,
                        opponentActionId: 9,
                        nextSituationId: 2,
                        resourceConsumptions: [
                            {
                                resourceType: 1,
                                value: 1600 
                            }
                        ],
                        resourceRequirements: []
                    },
                    {
                        playerActionId: 4,
                        opponentActionId: 10,
                        nextSituationId: 12,
                        resourceConsumptions: [],
                        resourceRequirements: [] 
                    },

                    {
                        playerActionId: 5,
                        opponentActionId: 7,
                        nextSituationId: 2,
                        resourceConsumptions: [],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: 5,
                        opponentActionId: 8,
                        nextSituationId: 1,
                        resourceConsumptions: [
                            {
                                resourceType: ResourceType.OPPONENT_HEALTH,
                                value: 1200 
                            }
                        ],
                        resourceRequirements: []
                    },
                    {
                        playerActionId: 5,
                        opponentActionId: 9,
                        nextSituationId: 2,
                        resourceConsumptions: [
                            {
                                resourceType: 1,
                                value: 1600 
                            }
                        ],
                        resourceRequirements: []
                    },
                    {
                        playerActionId: 5,
                        opponentActionId: 10,
                        nextSituationId: 3,
                        resourceConsumptions: [],
                        resourceRequirements: [] 
                    },

                    {
                        playerActionId: 6,
                        opponentActionId: 7,
                        nextSituationId: 13,
                        resourceConsumptions: [],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: 6,
                        opponentActionId: 8,
                        nextSituationId: 2,
                        resourceConsumptions: [],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: 6,
                        opponentActionId: 9,
                        nextSituationId: 13,
                        resourceConsumptions: [],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: 6,
                        opponentActionId: 10,
                        nextSituationId: 3,
                        resourceConsumptions: [
                            {
                                resourceType: ResourceType.OPPONENT_HEALTH,
                                value: 1600 
                            }
                        ],
                        resourceRequirements: []
                    }
                ]
            },
            {
                situationId: 12,
                name: "打撃ヒット",
                playerActions: {
                    actions: [
                        {
                            actionId: 14,
                            name: "打撃ヒット",
                            description: "" 
                        }
                    ]
                },
                opponentActions: {
                    actions: [
                        {
                            actionId: 15,
                            name: "受け",
                            description: "" 
                        }
                    ]
                },
                transitions: [
                    {
                        playerActionId: 14,
                        opponentActionId: 15,
                        nextSituationId: 1,
                        resourceConsumptions: [
                            {
                                resourceType: ResourceType.OPPONENT_HEALTH,
                                value: 2000 
                            }
                        ],
                        resourceRequirements: []
                    }
                ]
            },
            {
                situationId: 13,
                name: "打撃パニカンヒット",
                playerActions: {
                    actions: [
                        {
                            actionId: 16,
                            name: "パニカンヒット",
                            description: "" 
                        }
                    ]
                },
                opponentActions: {
                    actions: [
                        {
                            actionId: 17,
                            name: "受け",
                            description: "" 
                        }
                    ]
                },
                transitions: [
                    {
                        playerActionId: 16,
                        opponentActionId: 17,
                        nextSituationId: 1,
                        resourceConsumptions: [
                            {
                                resourceType: ResourceType.OPPONENT_HEALTH,
                                value: 3000 
                            }
                        ],
                        resourceRequirements: []
                    }
                ]
            }
        ],
        terminalSituations: [
            {
                situationId: 2,
                name: "画面端 五分",
                description: "画面端にいるけど、距離がいったん離れた",
                cornerState: CornerState.OPPONENT_IN_CORNER
            },
            {
                situationId: 3,
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
                "oneofKind": 'damageRace',
                "damageRace": {}
            }
        },
        playerComboStarters: [],
        opponentComboStarters: []
    }
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
                        {
                            actionId: rootJumpActionId,
                            name: '前ジャンプ',
                            description: '' 
                        },
                        {
                            actionId: rootDashActionId,
                            name: '前ステップ',
                            description: '' 
                        },
                    ],
                },
                opponentActions: {
                    actions: [
                        {
                            actionId: rootWaitActionId,
                            name: '待機',
                            description: '' 
                        },
                    ],
                },
                transitions: [
                    {
                        playerActionId: rootJumpActionId,
                        opponentActionId: rootWaitActionId,
                        nextSituationId: closeRangeSituationId,
                        resourceConsumptions: [],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: rootDashActionId,
                        opponentActionId: rootWaitActionId,
                        nextSituationId: afterDashSituationId,
                        resourceConsumptions: [],
                        resourceRequirements: [] 
                    },
                ],
            },
            {
                situationId: closeRangeSituationId,
                name: '密着 +4F',
                playerActions: {
                    actions: [
                        {
                            actionId: closeTcActionId,
                            name: '中PTC > 中ディマ',
                            description: '' 
                        },
                        {
                            actionId: closeThrowActionId,
                            name: '投げ',
                            description: '' 
                        },
                        {
                            actionId: closeCommandThrowActionId,
                            name: 'コマ投げ',
                            description: '' 
                        },
                        {
                            actionId: closeGuardActionId,
                            name: 'ガード',
                            description: '様子見' 
                        },
                    ],
                },
                opponentActions: {
                    actions: [
                        {
                            actionId: closeDelayGrapActionId,
                            name: '遅らせグラップ',
                            description: '' 
                        },
                        {
                            actionId: closeGuardOppActionId,
                            name: 'ガード',
                            description: '' 
                        },
                        {
                            actionId: closeJumpOppActionId,
                            name: '垂直ジャンプ',
                            description: '' 
                        },
                        {
                            actionId: closeInvincibleActionId,
                            name: '無敵暴れ',
                            description: '' 
                        },
                    ],
                },
                transitions: [
                    {
                        playerActionId: closeTcActionId,
                        opponentActionId: closeDelayGrapActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: closeTcActionId,
                        opponentActionId: closeGuardOppActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: closeTcActionId,
                        opponentActionId: closeJumpOppActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.OPPONENT_HEALTH,
                            value: 2160 
                        }],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: closeTcActionId,
                        opponentActionId: closeInvincibleActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.PLAYER_HEALTH,
                            value: 1600 
                        }],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: closeThrowActionId,
                        opponentActionId: closeDelayGrapActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: closeThrowActionId,
                        opponentActionId: closeGuardOppActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.OPPONENT_HEALTH,
                            value: 1200 
                        }],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: closeThrowActionId,
                        opponentActionId: closeJumpOppActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.PLAYER_HEALTH,
                            value: 1500 
                        }],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: closeThrowActionId,
                        opponentActionId: closeInvincibleActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.PLAYER_HEALTH,
                            value: 1600 
                        }],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: closeCommandThrowActionId,
                        opponentActionId: closeDelayGrapActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.OPPONENT_HEALTH,
                            value: 2000 
                        }],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: closeCommandThrowActionId,
                        opponentActionId: closeGuardOppActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.OPPONENT_HEALTH,
                            value: 2000 
                        }],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: closeCommandThrowActionId,
                        opponentActionId: closeJumpOppActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.PLAYER_HEALTH,
                            value: 1500 
                        }],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: closeCommandThrowActionId,
                        opponentActionId: closeInvincibleActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.PLAYER_HEALTH,
                            value: 1600 
                        }],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: closeGuardActionId,
                        opponentActionId: closeDelayGrapActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.PLAYER_HEALTH,
                            value: 1600 
                        }],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: closeGuardActionId,
                        opponentActionId: closeGuardOppActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: closeGuardActionId,
                        opponentActionId: closeJumpOppActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.OPPONENT_HEALTH,
                            value: 1000 
                        }],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: closeGuardActionId,
                        opponentActionId: closeInvincibleActionId,
                        nextSituationId: rootSituationId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.OPPONENT_HEALTH,
                            value: 3910 
                        }],
                        resourceRequirements: [] 
                    },
                ],
            },
            {
                situationId: throwRangeSituationId,
                name: '投げ間合い +3F',
                playerActions: {
                    actions: [
                        {
                            actionId: throwThrowActionId,
                            name: '投げ',
                            description: '' 
                        },
                        {
                            actionId: throwCommandThrowActionId,
                            name: 'コマ投げ',
                            description: '' 
                        },
                        {
                            actionId: throwShimmyActionId,
                            name: 'シミー',
                            description: '' 
                        },
                    ],
                },
                opponentActions: {
                    actions: [
                        {
                            actionId: throwDelayGrapActionId,
                            name: '遅らせグラップ',
                            description: '' 
                        },
                        {
                            actionId: throwInvincibleActionId,
                            name: '無敵暴れ',
                            description: '' 
                        },
                        {
                            actionId: throwJumpActionId,
                            name: '垂直ジャンプ',
                            description: '' 
                        },
                    ],
                },
                transitions: [
                    {
                        playerActionId: throwThrowActionId,
                        opponentActionId: throwDelayGrapActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: throwThrowActionId,
                        opponentActionId: throwInvincibleActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.PLAYER_HEALTH,
                            value: 1600 
                        }],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: throwThrowActionId,
                        opponentActionId: throwJumpActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.PLAYER_HEALTH,
                            value: 1500 
                        }],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: throwCommandThrowActionId,
                        opponentActionId: throwDelayGrapActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.OPPONENT_HEALTH,
                            value: 2000 
                        }],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: throwCommandThrowActionId,
                        opponentActionId: throwInvincibleActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.PLAYER_HEALTH,
                            value: 1600 
                        }],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: throwCommandThrowActionId,
                        opponentActionId: throwJumpActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.PLAYER_HEALTH,
                            value: 1500 
                        }],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: throwShimmyActionId,
                        opponentActionId: throwDelayGrapActionId,
                        nextSituationId: rootSituationId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.OPPONENT_HEALTH,
                            value: 3760 
                        }],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: throwShimmyActionId,
                        opponentActionId: throwInvincibleActionId,
                        nextSituationId: rootSituationId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.OPPONENT_HEALTH,
                            value: 3910 
                        }],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: throwShimmyActionId,
                        opponentActionId: throwJumpActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.OPPONENT_HEALTH,
                            value: 1000 
                        }],
                        resourceRequirements: [] 
                    },
                ],
            },
            {
                situationId: afterDashSituationId,
                name: '前ステ後 +25F',
                playerActions: {
                    actions: [
                        {
                            actionId: dashWalkThrowActionId,
                            name: '歩き投げ',
                            description: '' 
                        },
                        {
                            actionId: dashKneeActionId,
                            name: 'タメ膝',
                            description: 'ガード時 +3F, ヒット時コンボ' 
                        },
                        {
                            actionId: dashShimmyActionId,
                            name: 'シミー',
                            description: '' 
                        },
                    ],
                },
                opponentActions: {
                    actions: [
                        {
                            actionId: dashGuardActionId,
                            name: 'ガード',
                            description: '' 
                        },
                        {
                            actionId: dashJumpActionId,
                            name: '垂直ジャンプ',
                            description: '' 
                        },
                        {
                            actionId: dashInvincibleActionId,
                            name: '無敵暴れ',
                            description: '' 
                        },
                        {
                            actionId: dashThrowEscapeActionId,
                            name: '投げ抜け',
                            description: '' 
                        },
                    ],
                },
                transitions: [
                    {
                        playerActionId: dashWalkThrowActionId,
                        opponentActionId: dashGuardActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.OPPONENT_HEALTH,
                            value: 1200 
                        }],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: dashWalkThrowActionId,
                        opponentActionId: dashJumpActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.PLAYER_HEALTH,
                            value: 2500 
                        }],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: dashWalkThrowActionId,
                        opponentActionId: dashInvincibleActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.PLAYER_HEALTH,
                            value: 1600 
                        }],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: dashWalkThrowActionId,
                        opponentActionId: dashThrowEscapeActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: dashKneeActionId,
                        opponentActionId: dashGuardActionId,
                        nextSituationId: throwRangeSituationId,
                        resourceConsumptions: [],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: dashKneeActionId,
                        opponentActionId: dashJumpActionId,
                        nextSituationId: rootSituationId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.OPPONENT_HEALTH,
                            value: 3560 
                        }],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: dashKneeActionId,
                        opponentActionId: dashInvincibleActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.PLAYER_HEALTH,
                            value: 1600 
                        }],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: dashKneeActionId,
                        opponentActionId: dashThrowEscapeActionId,
                        nextSituationId: rootSituationId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.OPPONENT_HEALTH,
                            value: 3560 
                        }],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: dashShimmyActionId,
                        opponentActionId: dashGuardActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: dashShimmyActionId,
                        opponentActionId: dashJumpActionId,
                        nextSituationId: neutralTerminalId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.OPPONENT_HEALTH,
                            value: 1000 
                        }],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: dashShimmyActionId,
                        opponentActionId: dashInvincibleActionId,
                        nextSituationId: rootSituationId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.OPPONENT_HEALTH,
                            value: 3910 
                        }],
                        resourceRequirements: [] 
                    },
                    {
                        playerActionId: dashShimmyActionId,
                        opponentActionId: dashThrowEscapeActionId,
                        nextSituationId: rootSituationId,
                        resourceConsumptions: [{
                            resourceType: ResourceType.OPPONENT_HEALTH,
                            value: 3910 
                        }],
                        resourceRequirements: [] 
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
        playerComboStarters: [],
        opponentComboStarters: [],
    };
}
