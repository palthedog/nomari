import type {
    Action,
    GameDefinition,
    ResourceConsumption,
    Situation,
    TerminalSituation,
    Transition,
} from '@mari/ts-proto';
import {
    CornerState,
    ResourceType,
} from '@mari/ts-proto';
import { generateId } from './game-definition-utils';

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
 * Create a Judo GameDefinition
 */
export function createJudoGameDefinition(): GameDefinition {
    const advantageSituationId = generateId('situation');
    const cornerNeutralSituationId = generateId('situation');
    const neutralSituationId = generateId('situation');

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
 * Create a heavy Dimachaerus comboGameDefinition
 */
export function createHeavyDimachaerusComboGameDefinition(): GameDefinition {
    return {
        "gameId": "game_1768562188643_vykwo3r0f",
        "name": "強ディマ>溜強P",
        "description": "",
        "rootSituationId": "situation_1768562188643_aim9qkpt0",
        "situations": [
            {
                "situationId": "situation_1768562188643_aim9qkpt0",
                "description": "強ディマ > 溜強P +47F",
                "playerActions": {
                    "actions": [
                        {
                            "actionId": "action_1768562188643_7ykmucfkj",
                            "name": "前ジャンプ",
                            "description": ""
                        },
                        {
                            "actionId": "action_1768562188643_8rdqtiw63",
                            "name": "前ステップ",
                            "description": ""
                        }
                    ]
                },
                "opponentActions": {
                    "actions": [
                        {
                            "actionId": "action_1768562188643_q29k4akzb",
                            "name": "待機",
                            "description": "TODO: 選択肢が空でも動くように（選択肢が1つと同じ）"
                        }
                    ]
                },
                "transitions": [
                    {
                        "playerActionId": "action_1768562188643_7ykmucfkj",
                        "opponentActionId": "action_1768562188643_q29k4akzb",
                        "nextSituationId": "situation_1768562317722_w3iieyvlf",
                        "resourceConsumptions": []
                    },
                    {
                        "playerActionId": "action_1768562188643_8rdqtiw63",
                        "opponentActionId": "action_1768562188643_q29k4akzb",
                        "nextSituationId": "situation_1768562534072_airzum1nt",
                        "resourceConsumptions": []
                    }
                ]
            },
            {
                "situationId": "situation_1768562317722_w3iieyvlf",
                "description": "密着 +4F",
                "playerActions": {
                    "actions": [
                        {
                            "actionId": "action_1768563502958_looc06uln",
                            "name": "中PTC > 中ディマ",
                            "description": "TODO: 本当は起き攻めついてくる"
                        },
                        {
                            "actionId": "action_1768563510125_8nmft3c9i",
                            "name": "投げ",
                            "description": ""
                        },
                        {
                            "actionId": "action_1768563515438_waelytwoy",
                            "name": "コマ投げ",
                            "description": ""
                        },
                        {
                            "actionId": "action_1768565086736_jtasbecz6",
                            "name": "ガード",
                            "description": "様子見(ぼっ立ち）"
                        }
                    ]
                },
                "opponentActions": {
                    "actions": [
                        {
                            "actionId": "action_1768563521104_ln4i1w919",
                            "name": "遅らせグラップ",
                            "description": ""
                        },
                        {
                            "actionId": "action_1768563540040_hpjsgguwo",
                            "name": "ガード",
                            "description": ""
                        },
                        {
                            "actionId": "action_1768563545886_2shig2cmp",
                            "name": "垂直ジャンプ",
                            "description": ""
                        },
                        {
                            "actionId": "action_1768565012018_t8dl58krt",
                            "name": "無敵暴れ",
                            "description": ""
                        }
                    ]
                },
                "transitions": [
                    {
                        "playerActionId": "action_1768563502958_looc06uln",
                        "opponentActionId": "action_1768563521104_ln4i1w919",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": []
                    },
                    {
                        "playerActionId": "action_1768563502958_looc06uln",
                        "opponentActionId": "action_1768563540040_hpjsgguwo",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": []
                    },
                    {
                        "playerActionId": "action_1768563502958_looc06uln",
                        "opponentActionId": "action_1768563545886_2shig2cmp",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": [
                            {
                                "resourceType": 2,
                                "value": 2160
                            }
                        ]
                    },
                    {
                        "playerActionId": "action_1768563502958_looc06uln",
                        "opponentActionId": "action_1768565012018_t8dl58krt",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": [
                            {
                                "resourceType": 1,
                                "value": 1600
                            }
                        ]
                    },
                    {
                        "playerActionId": "action_1768563510125_8nmft3c9i",
                        "opponentActionId": "action_1768563521104_ln4i1w919",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": []
                    },
                    {
                        "playerActionId": "action_1768563510125_8nmft3c9i",
                        "opponentActionId": "action_1768563540040_hpjsgguwo",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": [
                            {
                                "resourceType": 2,
                                "value": 1200
                            }
                        ]
                    },
                    {
                        "playerActionId": "action_1768563510125_8nmft3c9i",
                        "opponentActionId": "action_1768563545886_2shig2cmp",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": [
                            {
                                "resourceType": 1,
                                "value": 1500
                            }
                        ]
                    },
                    {
                        "playerActionId": "action_1768563510125_8nmft3c9i",
                        "opponentActionId": "action_1768565012018_t8dl58krt",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": [
                            {
                                "resourceType": 1,
                                "value": 1600
                            }
                        ]
                    },
                    {
                        "playerActionId": "action_1768563515438_waelytwoy",
                        "opponentActionId": "action_1768563521104_ln4i1w919",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": [
                            {
                                "resourceType": 2,
                                "value": 2000
                            }
                        ]
                    },
                    {
                        "playerActionId": "action_1768563515438_waelytwoy",
                        "opponentActionId": "action_1768563540040_hpjsgguwo",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": [
                            {
                                "resourceType": 2,
                                "value": 2000
                            }
                        ]
                    },
                    {
                        "playerActionId": "action_1768563515438_waelytwoy",
                        "opponentActionId": "action_1768563545886_2shig2cmp",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": [
                            {
                                "resourceType": 1,
                                "value": 1500
                            }
                        ]
                    },
                    {
                        "playerActionId": "action_1768563515438_waelytwoy",
                        "opponentActionId": "action_1768565012018_t8dl58krt",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": [
                            {
                                "resourceType": 1,
                                "value": 1600
                            }
                        ]
                    },
                    {
                        "playerActionId": "action_1768565086736_jtasbecz6",
                        "opponentActionId": "action_1768563521104_ln4i1w919",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": [
                            {
                                "resourceType": 1,
                                "value": 1600
                            }
                        ]
                    },
                    {
                        "playerActionId": "action_1768565086736_jtasbecz6",
                        "opponentActionId": "action_1768563540040_hpjsgguwo",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": []
                    },
                    {
                        "playerActionId": "action_1768565086736_jtasbecz6",
                        "opponentActionId": "action_1768563545886_2shig2cmp",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": [
                            {
                                "resourceType": 2,
                                "value": 1000
                            }
                        ]
                    },
                    {
                        "playerActionId": "action_1768565086736_jtasbecz6",
                        "opponentActionId": "action_1768565012018_t8dl58krt",
                        "nextSituationId": "situation_1768562188643_aim9qkpt0",
                        "resourceConsumptions": [
                            {
                                "resourceType": 2,
                                "value": 3910
                            }
                        ]
                    }
                ]
            },
            {
                "situationId": "situation_1768562328142_adqu7v5tb",
                "description": "投げ間合い +3F",
                "playerActions": {
                    "actions": [
                        {
                            "actionId": "action_1768563727245_6f13679cf",
                            "name": "投げ",
                            "description": ""
                        },
                        {
                            "actionId": "action_1768564316704_uk4rn55oq",
                            "name": "コマ投げ",
                            "description": ""
                        },
                        {
                            "actionId": "action_1768564321626_s6cx8rwca",
                            "name": "シミー",
                            "description": ""
                        }
                    ]
                },
                "opponentActions": {
                    "actions": [
                        {
                            "actionId": "action_1768564332974_wq5lqi8cz",
                            "name": "遅らせグラップ",
                            "description": ""
                        },
                        {
                            "actionId": "action_1768564341884_hab2cwuau",
                            "name": "無敵暴れ",
                            "description": ""
                        },
                        {
                            "actionId": "action_1768564353897_jy1c67jrh",
                            "name": "垂直ジャンプ",
                            "description": ""
                        }
                    ]
                },
                "transitions": [
                    {
                        "playerActionId": "action_1768563727245_6f13679cf",
                        "opponentActionId": "action_1768564332974_wq5lqi8cz",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": []
                    },
                    {
                        "playerActionId": "action_1768563727245_6f13679cf",
                        "opponentActionId": "action_1768564341884_hab2cwuau",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": [
                            {
                                "resourceType": 1,
                                "value": 1600
                            }
                        ]
                    },
                    {
                        "playerActionId": "action_1768563727245_6f13679cf",
                        "opponentActionId": "action_1768564353897_jy1c67jrh",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": [
                            {
                                "resourceType": 1,
                                "value": 1500
                            }
                        ]
                    },
                    {
                        "playerActionId": "action_1768564316704_uk4rn55oq",
                        "opponentActionId": "action_1768564332974_wq5lqi8cz",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": [
                            {
                                "resourceType": 2,
                                "value": 2000
                            }
                        ]
                    },
                    {
                        "playerActionId": "action_1768564316704_uk4rn55oq",
                        "opponentActionId": "action_1768564341884_hab2cwuau",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": [
                            {
                                "resourceType": 1,
                                "value": 1600
                            }
                        ]
                    },
                    {
                        "playerActionId": "action_1768564316704_uk4rn55oq",
                        "opponentActionId": "action_1768564353897_jy1c67jrh",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": [
                            {
                                "resourceType": 1,
                                "value": 1500
                            }
                        ]
                    },
                    {
                        "playerActionId": "action_1768564321626_s6cx8rwca",
                        "opponentActionId": "action_1768564332974_wq5lqi8cz",
                        "nextSituationId": "situation_1768562188643_aim9qkpt0",
                        "resourceConsumptions": [
                            {
                                "resourceType": 2,
                                "value": 3760
                            }
                        ]
                    },
                    {
                        "playerActionId": "action_1768564321626_s6cx8rwca",
                        "opponentActionId": "action_1768564341884_hab2cwuau",
                        "nextSituationId": "situation_1768562188643_aim9qkpt0",
                        "resourceConsumptions": [
                            {
                                "resourceType": 2,
                                "value": 3910
                            }
                        ]
                    },
                    {
                        "playerActionId": "action_1768564321626_s6cx8rwca",
                        "opponentActionId": "action_1768564353897_jy1c67jrh",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": [
                            {
                                "resourceType": 2,
                                "value": 1000
                            }
                        ]
                    }
                ]
            },
            {
                "situationId": "situation_1768562534072_airzum1nt",
                "description": "前ステ後 +25F",
                "playerActions": {
                    "actions": [
                        {
                            "actionId": "action_1768562856650_fx896zwox",
                            "name": "歩き投げ",
                            "description": ""
                        },
                        {
                            "actionId": "action_1768562866618_h6qt5hi5l",
                            "name": "タメ膝",
                            "description": "ガード時 +3F, ヒット時コンボ"
                        },
                        {
                            "actionId": "action_1768562909931_ucaj841jg",
                            "name": "シミー",
                            "description": ""
                        }
                    ]
                },
                "opponentActions": {
                    "actions": [
                        {
                            "actionId": "action_1768562931257_ex1f6p8u0",
                            "name": "ガード",
                            "description": ""
                        },
                        {
                            "actionId": "action_1768562947089_0t6sdytbu",
                            "name": "垂直ジャンプ",
                            "description": ""
                        },
                        {
                            "actionId": "action_1768562987704_l5gyoqv4y",
                            "name": "無敵暴れ",
                            "description": ""
                        },
                        {
                            "actionId": "action_1768563014357_uizbd9ph1",
                            "name": "投げ抜け",
                            "description": ""
                        }
                    ]
                },
                "transitions": [
                    {
                        "playerActionId": "action_1768562856650_fx896zwox",
                        "opponentActionId": "action_1768562931257_ex1f6p8u0",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": [
                            {
                                "resourceType": 2,
                                "value": 1200
                            }
                        ]
                    },
                    {
                        "playerActionId": "action_1768562856650_fx896zwox",
                        "opponentActionId": "action_1768562947089_0t6sdytbu",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": [
                            {
                                "resourceType": 1,
                                "value": 2500
                            }
                        ]
                    },
                    {
                        "playerActionId": "action_1768562856650_fx896zwox",
                        "opponentActionId": "action_1768562987704_l5gyoqv4y",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": [
                            {
                                "resourceType": 1,
                                "value": 1600
                            }
                        ]
                    },
                    {
                        "playerActionId": "action_1768562856650_fx896zwox",
                        "opponentActionId": "action_1768563014357_uizbd9ph1",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": []
                    },
                    {
                        "playerActionId": "action_1768562866618_h6qt5hi5l",
                        "opponentActionId": "action_1768562931257_ex1f6p8u0",
                        "nextSituationId": "situation_1768562328142_adqu7v5tb",
                        "resourceConsumptions": []
                    },
                    {
                        "playerActionId": "action_1768562866618_h6qt5hi5l",
                        "opponentActionId": "action_1768562947089_0t6sdytbu",
                        "nextSituationId": "situation_1768562188643_aim9qkpt0",
                        "resourceConsumptions": [
                            {
                                "resourceType": 2,
                                "value": 3560
                            }
                        ]
                    },
                    {
                        "playerActionId": "action_1768562866618_h6qt5hi5l",
                        "opponentActionId": "action_1768562987704_l5gyoqv4y",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": [
                            {
                                "resourceType": 1,
                                "value": 1600
                            }
                        ]
                    },
                    {
                        "playerActionId": "action_1768562866618_h6qt5hi5l",
                        "opponentActionId": "action_1768563014357_uizbd9ph1",
                        "nextSituationId": "situation_1768562188643_aim9qkpt0",
                        "resourceConsumptions": [
                            {
                                "resourceType": 2,
                                "value": 3560
                            }
                        ]
                    },
                    {
                        "playerActionId": "action_1768562909931_ucaj841jg",
                        "opponentActionId": "action_1768562931257_ex1f6p8u0",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": []
                    },
                    {
                        "playerActionId": "action_1768562909931_ucaj841jg",
                        "opponentActionId": "action_1768562947089_0t6sdytbu",
                        "nextSituationId": "situation_1768562188643_3jwicvshw",
                        "resourceConsumptions": [
                            {
                                "resourceType": 2,
                                "value": 1000
                            }
                        ]
                    },
                    {
                        "playerActionId": "action_1768562909931_ucaj841jg",
                        "opponentActionId": "action_1768562987704_l5gyoqv4y",
                        "nextSituationId": "situation_1768562188643_aim9qkpt0",
                        "resourceConsumptions": [
                            {
                                "resourceType": 2,
                                "value": 3910
                            }
                        ]
                    },
                    {
                        "playerActionId": "action_1768562909931_ucaj841jg",
                        "opponentActionId": "action_1768563014357_uizbd9ph1",
                        "nextSituationId": "situation_1768562188643_aim9qkpt0",
                        "resourceConsumptions": [
                            {
                                "resourceType": 2,
                                "value": 3910
                            }
                        ]
                    }
                ]
            }
        ],
        "terminalSituations": [
            {
                "situationId": "situation_1768562188643_3jwicvshw",
                "name": "ニュートラル",
                "description": "",
                "cornerState": 1
            }
        ],
        "initialDynamicState": {
            "resources": [
                {
                    "resourceType": 1,
                    "value": 10000
                },
                {
                    "resourceType": 2,
                    "value": 7000
                }
            ]
        },
        "rewardComputationMethod": {
            "method": {
                "oneofKind": "damageRace",
                "damageRace": {}
            }
        }
    } as GameDefinition;
}
