import { buildGameTree, GameTreeBuildErrorCode } from './game-tree-builder';
import {
    GameDefinition,
    ResourceType,
    CornerState,
} from '@nomari/ts-proto';
import type { NodeTransition } from '@nomari/game-tree/game-tree';

describe('gameTreeBuilder', () => {
    describe('basic game tree generation', () => {
        it('should fail when there is a cycle without DynamicState changes', () => {
            const gameDefinition: GameDefinition = {
                gameId: 1,
                name: 'Test Game',
                description: 'Test game with two cyclic situations.',
                rootSituationId: 101,
                situations: [
                    {
                        situationId: 101,
                        name: 'First situation',
                        playerActions: {
                            actions: [
                                {
                                    actionId: 1001,
                                    name: '',
                                    description: 'Action 1' 
                                },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                {
                                    actionId: 1002,
                                    name: '',
                                    description: 'Action 2' 
                                },
                            ],
                        },
                        transitions: [
                            {
                                playerActionId: 1001,
                                opponentActionId: 1002,
                                nextSituationId: 102,
                                resourceConsumptions: [],
                                resourceRequirements: [],
                            },
                        ],
                    },
                    {
                        situationId: 102,
                        name: 'Second situation',
                        playerActions: {
                            actions: [
                                {
                                    actionId: 1003,
                                    name: '',
                                    description: 'Action 3' 
                                },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                {
                                    actionId: 1004,
                                    name: '',
                                    description: 'Action 4' 
                                },
                            ],
                        },
                        transitions: [
                            {
                                playerActionId: 1003,
                                opponentActionId: 1004,
                                nextSituationId: 101,
                                resourceConsumptions: [],
                                resourceRequirements: [],
                            },
                        ],
                    },
                ],
                terminalSituations: [],
                initialDynamicState: {
                    resources: [
                        {
                            resourceType: ResourceType.PLAYER_HEALTH,
                            value: 5000 
                        },
                        {
                            resourceType: ResourceType.OPPONENT_HEALTH,
                            value: 4000 
                        },
                    ],
                },
                playerComboStarters: [],
                opponentComboStarters: [],
            };

            // Cyclic references without any change in DynamicState should return an error
            const result = buildGameTree(gameDefinition);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.code).toBe(GameTreeBuildErrorCode.CYCLE_DETECTED);
                expect(result.error.message).toContain('Cycle detected');
            }
        });

        it('should create a simple game tree with terminal situation', () => {
            const gameDefinition: GameDefinition = {
                gameId: 1,
                name: 'Test Game',
                description: 'A simple test game with terminal',
                rootSituationId: 101,
                situations: [
                    {
                        situationId: 101,
                        name: 'First situation',
                        playerActions: {
                            actions: [
                                {
                                    actionId: 1001,
                                    name: '',
                                    description: 'Action 1' 
                                },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                {
                                    actionId: 1002,
                                    name: '',
                                    description: 'Action 2' 
                                },
                            ],
                        },
                        transitions: [
                            {
                                playerActionId: 1001,
                                opponentActionId: 1002,
                                nextSituationId: 200,
                                resourceConsumptions: [],
                                resourceRequirements: [],
                            },
                        ],
                    },
                ],
                terminalSituations: [
                    {
                        situationId: 200,
                        name: 'Neutral',
                        description: 'Neutral terminal situation',
                    },
                ],
                initialDynamicState: {
                    resources: [
                        {
                            resourceType: ResourceType.PLAYER_HEALTH,
                            value: 5000 
                        },
                        {
                            resourceType: ResourceType.OPPONENT_HEALTH,
                            value: 4000 
                        },
                    ],
                },
                playerComboStarters: [],
                opponentComboStarters: [],
            };

            const result = buildGameTree(gameDefinition);
            expect(result.success).toBe(true);
            if (!result.success) {
                throw new Error('Expected success but got error: ' + result.error.message);
            }
            const gameTree = result.gameTree;

            expect(gameTree.id).toBe(1);
            expect(gameTree.root).toBeDefined();
            const rootNode = gameTree.nodes[gameTree.root];
            expect(rootNode).toBeDefined();
            expect(rootNode.nodeId).toContain('101');
            expect(rootNode.playerActions).toBeDefined();
            expect(rootNode.opponentActions).toBeDefined();
            expect(rootNode.transitions.length).toBeGreaterThan(0);
            // Check if transition leads to a terminal node
            const firstTransition = rootNode.transitions[0];
            expect(firstTransition.nextNodeId).toBeDefined();
            const nextNode = gameTree.nodes[firstTransition.nextNodeId!];
            expect(nextNode).toBeDefined();
            expect(nextNode.playerReward).toBeDefined();
            expect(nextNode.opponentReward).toBeDefined();
        });
    });

    describe('resource consumption', () => {
        it('should apply resource consumptions and create different nodes for different states', () => {
            const gameDefinition: GameDefinition = {
                gameId: 2,
                name: 'Damage Game',
                description: 'A game with damage',
                rootSituationId: 101,
                situations: [
                    {
                        situationId: 101,
                        name: 'Attack situation',
                        playerActions: {
                            actions: [
                                {
                                    actionId: 2001,
                                    name: '',
                                    description: 'Attack' 
                                },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                {
                                    actionId: 2002,
                                    name: '',
                                    description: 'Guard' 
                                },
                            ],
                        },
                        transitions: [
                            {
                                playerActionId: 2001,
                                opponentActionId: 2002,
                                nextSituationId: 102,
                                resourceConsumptions: [
                                    {
                                        resourceType: ResourceType.OPPONENT_HEALTH,
                                        value: 2000,
                                    },
                                ],
                                resourceRequirements: [],
                            },
                        ],
                    },
                    {
                        situationId: 102,
                        name: 'Next situation',
                        playerActions: {
                            actions: [
                                {
                                    actionId: 1001,
                                    name: '',
                                    description: 'Action 1' 
                                },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                {
                                    actionId: 1002,
                                    name: '',
                                    description: 'Action 2' 
                                },
                            ],
                        },
                        transitions: [],
                    },
                ],
                terminalSituations: [],
                initialDynamicState: {
                    resources: [
                        {
                            resourceType: ResourceType.PLAYER_HEALTH,
                            value: 5000 
                        },
                        {
                            resourceType: ResourceType.OPPONENT_HEALTH,
                            value: 4000 
                        },
                    ],
                },
                playerComboStarters: [],
                opponentComboStarters: [],
            };

            const result = buildGameTree(gameDefinition);
            expect(result.success).toBe(true);
            if (!result.success) {
                throw new Error('Expected success but got error: ' + result.error.message);
            }
            const gameTree = result.gameTree;
            const rootNode = gameTree.nodes[gameTree.root];

            // Find the transition
            const transition = rootNode.transitions.find(
                (t: NodeTransition) => t.playerActionId === 2001 && t.opponentActionId === 2002
            );
            expect(transition).toBeDefined();
            // Check if transition leads to a non-terminal node
            expect(transition!.nextNodeId).toBeDefined();
            const nextNode = gameTree.nodes[transition!.nextNodeId!];
            expect(nextNode).toBeDefined();
            expect(nextNode.playerReward).toBeUndefined();
            expect(nextNode.opponentReward).toBeUndefined();

            // The next node should have reduced opponent health
            // We can't directly check the state, but we can verify the tree structure
            expect(transition!.nextNodeId).toBeDefined();
        });
    });

    describe('automatic terminal node creation', () => {
        it('should create win terminal node when opponent health reaches 0', () => {
            const gameDefinition: GameDefinition = {
                gameId: 3,
                name: 'Win Game',
                description: 'A game that ends with win',
                rootSituationId: 101,
                situations: [
                    {
                        situationId: 101,
                        name: 'Attack situation',
                        playerActions: {
                            actions: [
                                {
                                    actionId: 2001,
                                    name: '',
                                    description: 'Attack' 
                                },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                {
                                    actionId: 2002,
                                    name: '',
                                    description: 'Guard' 
                                },
                            ],
                        },
                        transitions: [
                            {
                                playerActionId: 2001,
                                opponentActionId: 2002,
                                nextSituationId: 102,
                                resourceConsumptions: [
                                    {
                                        resourceType: ResourceType.OPPONENT_HEALTH,
                                        value: 5000, // Enough to kill opponent
                                    },
                                ],
                                resourceRequirements: [],
                            },
                        ],
                    },
                ],
                terminalSituations: [],
                initialDynamicState: {
                    resources: [
                        {
                            resourceType: ResourceType.PLAYER_HEALTH,
                            value: 5000 
                        },
                        {
                            resourceType: ResourceType.OPPONENT_HEALTH,
                            value: 4000 
                        },
                    ],
                },
                playerComboStarters: [],
                opponentComboStarters: [],
                rewardComputationMethod: {
                    method: {
                        oneofKind: 'winProbability',
                        winProbability: {
                            cornerBonus: 0,
                            odGaugeBonus: 0,
                            saGaugeBonus: 0,
                        }
                    }
                }
            };

            const result = buildGameTree(gameDefinition);
            expect(result.success).toBe(true);
            if (!result.success) {
                throw new Error('Expected success but got error: ' + result.error.message);
            }
            const gameTree = result.gameTree;
            const rootNode = gameTree.nodes[gameTree.root];

            const transition = rootNode.transitions[0];
            expect(transition).toBeDefined();
            // Check if transition leads to a terminal node
            expect(transition.nextNodeId).toBeDefined();
            const nextNode = gameTree.nodes[transition.nextNodeId!];
            expect(nextNode).toBeDefined();
            expect(nextNode.playerReward).toBeDefined();
            expect(nextNode.playerReward!.value).toBe(10000);
            expect(nextNode.opponentReward).toBeDefined();
            expect(nextNode.opponentReward!.value).toBe(-10000);
        });

        it('should create lose terminal node when player health reaches 0', () => {
            const gameDefinition: GameDefinition = {
                gameId: 4,
                name: 'Lose Game',
                description: 'A game that ends with lose',
                rootSituationId: 101,
                situations: [
                    {
                        situationId: 101,
                        name: 'Defense situation',
                        playerActions: {
                            actions: [
                                {
                                    actionId: 2002,
                                    name: '',
                                    description: 'Guard' 
                                },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                {
                                    actionId: 2001,
                                    name: '',
                                    description: 'Attack' 
                                },
                            ],
                        },
                        transitions: [
                            {
                                playerActionId: 2002,
                                opponentActionId: 2001,
                                nextSituationId: 102,
                                resourceConsumptions: [
                                    {
                                        resourceType: ResourceType.PLAYER_HEALTH,
                                        value: 6000, // Enough to kill player
                                    },
                                ],
                                resourceRequirements: [],
                            },
                        ],
                    },
                ],
                terminalSituations: [],
                initialDynamicState: {
                    resources: [
                        {
                            resourceType: ResourceType.PLAYER_HEALTH,
                            value: 5000 
                        },
                        {
                            resourceType: ResourceType.OPPONENT_HEALTH,
                            value: 4000 
                        },
                    ],
                },
                playerComboStarters: [],
                opponentComboStarters: [],
                rewardComputationMethod: {
                    method: {
                        oneofKind: 'winProbability',
                        winProbability: {
                            cornerBonus: 0,
                            odGaugeBonus: 0,
                            saGaugeBonus: 0,
                        }
                    }
                }
            };

            const result = buildGameTree(gameDefinition);
            expect(result.success).toBe(true);
            if (!result.success) {
                throw new Error('Expected success but got error: ' + result.error.message);
            }
            const gameTree = result.gameTree;
            const rootNode = gameTree.nodes[gameTree.root];

            const transition = rootNode.transitions[0];
            expect(transition).toBeDefined();
            // Check if transition leads to a terminal node
            expect(transition.nextNodeId).toBeDefined();
            const nextNode = gameTree.nodes[transition.nextNodeId!];
            expect(nextNode).toBeDefined();
            expect(nextNode.playerReward).toBeDefined();
            expect(nextNode.playerReward!.value).toBe(-10000);
            expect(nextNode.opponentReward).toBeDefined();
            expect(nextNode.opponentReward!.value).toBe(10000);
        });

        it('should create draw terminal node when both healths reach 0', () => {
            const gameDefinition: GameDefinition = {
                gameId: 5,
                name: 'Draw Game',
                description: 'A game that ends with draw',
                rootSituationId: 101,
                situations: [
                    {
                        situationId: 101,
                        name: 'Mutual attack',
                        playerActions: {
                            actions: [
                                {
                                    actionId: 2001,
                                    name: '',
                                    description: 'Attack' 
                                },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                {
                                    actionId: 2001,
                                    name: '',
                                    description: 'Attack' 
                                },
                            ],
                        },
                        transitions: [
                            {
                                playerActionId: 2001,
                                opponentActionId: 2001,
                                nextSituationId: 102,
                                resourceConsumptions: [
                                    {
                                        resourceType: ResourceType.PLAYER_HEALTH,
                                        value: 6000, // Kill player
                                    },
                                    {
                                        resourceType: ResourceType.OPPONENT_HEALTH,
                                        value: 5000, // Kill opponent
                                    },
                                ],
                                resourceRequirements: [],
                            },
                        ],
                    },
                ],
                terminalSituations: [],
                initialDynamicState: {
                    resources: [
                        {
                            resourceType: ResourceType.PLAYER_HEALTH,
                            value: 5000 
                        },
                        {
                            resourceType: ResourceType.OPPONENT_HEALTH,
                            value: 4000 
                        },
                    ],
                },
                playerComboStarters: [],
                opponentComboStarters: [],
                rewardComputationMethod: {
                    method: {
                        oneofKind: 'winProbability',
                        winProbability: {
                            cornerBonus: 0,
                            odGaugeBonus: 0,
                            saGaugeBonus: 0,
                        }
                    }
                }
            };

            const result = buildGameTree(gameDefinition);
            expect(result.success).toBe(true);
            if (!result.success) {
                throw new Error('Expected success but got error: ' + result.error.message);
            }
            const gameTree = result.gameTree;
            const rootNode = gameTree.nodes[gameTree.root];

            const transition = rootNode.transitions[0];
            expect(transition).toBeDefined();
            // Check if transition leads to a terminal node
            expect(transition.nextNodeId).toBeDefined();
            const nextNode = gameTree.nodes[transition.nextNodeId!];
            expect(nextNode).toBeDefined();
            expect(nextNode.playerReward).toBeDefined();
            expect(nextNode.opponentReward).toBeDefined();
            // Draw rewards should be calculated based on neutral calculation
            // Since both are 0, winProbability = 0.5, so reward = 0.5 * 20000 - 10000 = 0
            expect(nextNode.playerReward!.value).toBeCloseTo(0, 5);
            expect(nextNode.opponentReward!.value).toBeCloseTo(0, 5);
        });
    });

    describe('neutral terminal situation', () => {
        it('should calculate rewards based on win probability for neutral terminal', () => {
            const gameDefinition: GameDefinition = {
                gameId: 6,
                name: 'Neutral Game',
                description: 'A game with neutral terminal',
                rootSituationId: 101,
                situations: [
                    {
                        situationId: 101,
                        name: 'First situation',
                        playerActions: {
                            actions: [
                                {
                                    actionId: 1001,
                                    name: '',
                                    description: 'Action 1' 
                                },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                {
                                    actionId: 1002,
                                    name: '',
                                    description: 'Action 2' 
                                },
                            ],
                        },
                        transitions: [
                            {
                                playerActionId: 1001,
                                opponentActionId: 1002,
                                nextSituationId: 200,
                                resourceConsumptions: [],
                                resourceRequirements: [],
                            },
                        ],
                    },
                ],
                terminalSituations: [
                    {
                        situationId: 200,
                        name: 'Neutral',
                        description: 'Neutral terminal situation',
                        cornerState: CornerState.NONE,
                    },
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
                        },
                    ],
                },
                playerComboStarters: [],
                opponentComboStarters: [],
                rewardComputationMethod: {
                    method: {
                        oneofKind: 'winProbability',
                        winProbability: {
                            cornerBonus: 0,
                            odGaugeBonus: 0,
                            saGaugeBonus: 0,
                        }
                    }
                }
            };

            const result = buildGameTree(gameDefinition);
            expect(result.success).toBe(true);
            if (!result.success) {
                throw new Error('Expected success but got error: ' + result.error.message);
            }
            const gameTree = result.gameTree;
            const rootNode = gameTree.nodes[gameTree.root];

            const transition = rootNode.transitions[0];
            expect(transition).toBeDefined();
            // Check if transition leads to a terminal node
            expect(transition.nextNodeId).toBeDefined();
            const nextNode = gameTree.nodes[transition.nextNodeId!];
            expect(nextNode).toBeDefined();
            expect(nextNode.playerReward).toBeDefined();
            expect(nextNode.opponentReward).toBeDefined();

            // Win probability = 0.5
            expect(nextNode.playerReward!.value).toBeCloseTo(0, 1);
            expect(nextNode.opponentReward!.value).toBeCloseTo(0, 1);
        });
    });

    describe('cycle prevention', () => {
        it('should fail when there is a cycle without DynamicState changes', () => {
            const gameDefinition: GameDefinition = {
                gameId: 7,
                name: 'Cycle Game',
                description: 'A game with cycles',
                rootSituationId: 101,
                situations: [
                    {
                        situationId: 101,
                        name: 'First situation',
                        playerActions: {
                            actions: [
                                {
                                    actionId: 1001,
                                    name: '',
                                    description: 'Action 1' 
                                },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                {
                                    actionId: 1002,
                                    name: '',
                                    description: 'Action 2' 
                                },
                            ],
                        },
                        transitions: [
                            {
                                playerActionId: 1001,
                                opponentActionId: 1002,
                                nextSituationId: 102,
                                resourceConsumptions: [],
                                resourceRequirements: [],
                            },
                        ],
                    },
                    {
                        situationId: 102,
                        name: 'Second situation',
                        playerActions: {
                            actions: [
                                {
                                    actionId: 1003,
                                    name: '',
                                    description: 'Action 3' 
                                },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                {
                                    actionId: 1004,
                                    name: '',
                                    description: 'Action 4' 
                                },
                            ],
                        },
                        transitions: [
                            {
                                playerActionId: 1003,
                                opponentActionId: 1004,
                                nextSituationId: 101,
                                resourceConsumptions: [],
                                resourceRequirements: [],
                            },
                        ],
                    },
                ],
                terminalSituations: [],
                initialDynamicState: {
                    resources: [
                        {
                            resourceType: ResourceType.PLAYER_HEALTH,
                            value: 5000 
                        },
                        {
                            resourceType: ResourceType.OPPONENT_HEALTH,
                            value: 4000 
                        },
                    ],
                },
                playerComboStarters: [],
                opponentComboStarters: [],
            };

            // Cycle with no DynamicState change should be an error
            const result = buildGameTree(gameDefinition);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.code).toBe(GameTreeBuildErrorCode.CYCLE_DETECTED);
                expect(result.error.message).toContain('Cycle detected');
            }
        });

        it('should allow cycles when DynamicState changes', () => {
            const gameDefinition: GameDefinition = {
                gameId: 8,
                name: 'Cycle Game with State Change',
                description: 'A game with cycles but state changes',
                rootSituationId: 101,
                situations: [
                    {
                        situationId: 101,
                        name: 'First situation',
                        playerActions: {
                            actions: [
                                {
                                    actionId: 1001,
                                    name: '',
                                    description: 'Action 1' 
                                },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                {
                                    actionId: 1002,
                                    name: '',
                                    description: 'Action 2' 
                                },
                            ],
                        },
                        transitions: [
                            {
                                playerActionId: 1001,
                                opponentActionId: 1002,
                                nextSituationId: 102,
                                resourceConsumptions: [
                                    {
                                        resourceType: ResourceType.OPPONENT_HEALTH,
                                        value: 100,
                                    },
                                ],
                                resourceRequirements: [],
                            },
                        ],
                    },
                    {
                        situationId: 102,
                        name: 'Second situation',
                        playerActions: {
                            actions: [
                                {
                                    actionId: 1003,
                                    name: '',
                                    description: 'Action 3' 
                                },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                {
                                    actionId: 1004,
                                    name: '',
                                    description: 'Action 4' 
                                },
                            ],
                        },
                        transitions: [
                            {
                                playerActionId: 1003,
                                opponentActionId: 1004,
                                nextSituationId: 101,
                                resourceConsumptions: [
                                    {
                                        resourceType: ResourceType.PLAYER_HEALTH,
                                        value: 100,
                                    },
                                ],
                                resourceRequirements: [],
                            },
                        ],
                    },
                ],
                terminalSituations: [],
                initialDynamicState: {
                    resources: [
                        {
                            resourceType: ResourceType.PLAYER_HEALTH,
                            value: 5000 
                        },
                        {
                            resourceType: ResourceType.OPPONENT_HEALTH,
                            value: 4000 
                        },
                    ],
                },
                playerComboStarters: [],
                opponentComboStarters: [],
            };

            // Cycle with DynamicState change is allowed (health decreases continuously, so it will eventually reach a terminal node)
            const result = buildGameTree(gameDefinition);
            expect(result.success).toBe(true);
            if (!result.success) {
                throw new Error('Expected success but got error: ' + result.error.message);
            }
            const gameTree = result.gameTree;
            expect(gameTree.root).toBeDefined();
            const rootNode = gameTree.nodes[gameTree.root];
            expect(rootNode).toBeDefined();
            expect(rootNode.transitions.length).toBeGreaterThan(0);
        });
    });

    describe('reward computation methods', () => {
        describe('damage race', () => {
            it('should calculate rewards based on damage race for neutral terminal', () => {
                const gameDefinition: GameDefinition = {
                    gameId: 9,
                    name: 'Damage Race Game',
                    description: 'A game with damage race reward computation',
                    rootSituationId: 101,
                    situations: [
                        {
                            situationId: 101,
                            name: 'First situation',
                            playerActions: {
                                actions: [
                                    {
                                        actionId: 1001,
                                        name: '',
                                        description: 'Action 1' 
                                    },
                                ],
                            },
                            opponentActions: {
                                actions: [
                                    {
                                        actionId: 1002,
                                        name: '',
                                        description: 'Action 2' 
                                    },
                                ],
                            },
                            transitions: [
                                {
                                    playerActionId: 1001,
                                    opponentActionId: 1002,
                                    nextSituationId: 200,
                                    resourceConsumptions: [
                                        {
                                            resourceType: ResourceType.OPPONENT_HEALTH,
                                            value: 1000,
                                        },
                                        {
                                            resourceType: ResourceType.PLAYER_HEALTH,
                                            value: 500,
                                        },
                                    ],
                                    resourceRequirements: [],
                                },
                            ],
                        },
                    ],
                    terminalSituations: [
                        {
                            situationId: 200,
                            name: 'Neutral',
                            description: 'Neutral terminal situation',
                            cornerState: CornerState.UNKNOWN,
                        },
                    ],
                    initialDynamicState: {
                        resources: [
                            {
                                resourceType: ResourceType.PLAYER_HEALTH,
                                value: 5000 
                            },
                            {
                                resourceType: ResourceType.OPPONENT_HEALTH,
                                value: 4000 
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

                const result = buildGameTree(gameDefinition);
                expect(result.success).toBe(true);
                if (!result.success) {
                    throw new Error('Expected success but got error: ' + result.error.message);
                }
                const gameTree = result.gameTree;
                const rootNode = gameTree.nodes[gameTree.root];

                const transition = rootNode.transitions[0];
                expect(transition).toBeDefined();
                expect(transition.nextNodeId).toBeDefined();
                const nextNode = gameTree.nodes[transition.nextNodeId!];
                expect(nextNode).toBeDefined();
                expect(nextNode.playerReward).toBeDefined();
                expect(nextNode.opponentReward).toBeDefined();

                // Damage dealt = 4000 - 3000 = 1000
                // Damage received = 5000 - 4500 = 500
                // Damage race = 1000 - 500 = 500
                expect(nextNode.playerReward!.value).toBe(500);
                expect(nextNode.opponentReward!.value).toBe(-500);
            });

            it('should calculate rewards based on damage race for draw terminal', () => {
                const gameDefinition: GameDefinition = {
                    gameId: 10,
                    name: 'Damage Race Draw Game',
                    description: 'A game with damage race reward computation ending in draw',
                    rootSituationId: 101,
                    situations: [
                        {
                            situationId: 101,
                            name: 'Mutual attack',
                            playerActions: {
                                actions: [
                                    {
                                        actionId: 2001,
                                        name: '',
                                        description: 'Attack' 
                                    },
                                ],
                            },
                            opponentActions: {
                                actions: [
                                    {
                                        actionId: 2001,
                                        name: '',
                                        description: 'Attack' 
                                    },
                                ],
                            },
                            transitions: [
                                {
                                    playerActionId: 2001,
                                    opponentActionId: 2001,
                                    nextSituationId: 102,
                                    resourceConsumptions: [
                                        {
                                            resourceType: ResourceType.PLAYER_HEALTH,
                                            value: 5000,
                                        },
                                        {
                                            resourceType: ResourceType.OPPONENT_HEALTH,
                                            value: 5000,
                                        },
                                    ],
                                    resourceRequirements: [],
                                },
                            ],
                        },
                    ],
                    terminalSituations: [],
                    initialDynamicState: {
                        resources: [
                            {
                                resourceType: ResourceType.PLAYER_HEALTH,
                                value: 5000 
                            },
                            {
                                resourceType: ResourceType.OPPONENT_HEALTH,
                                value: 5000 
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

                const result = buildGameTree(gameDefinition);
                expect(result.success).toBe(true);
                if (!result.success) {
                    throw new Error('Expected success but got error: ' + result.error.message);
                }
                const gameTree = result.gameTree;
                const rootNode = gameTree.nodes[gameTree.root];

                const transition = rootNode.transitions[0];
                expect(transition).toBeDefined();
                expect(transition.nextNodeId).toBeDefined();
                const nextNode = gameTree.nodes[transition.nextNodeId!];
                expect(nextNode).toBeDefined();
                expect(nextNode.playerReward).toBeDefined();
                expect(nextNode.opponentReward).toBeDefined();

                // Damage dealt = 5000 - 0 = 5000
                // Damage received = 5000 - 0 = 5000
                // Damage race = 5000 - 5000 = 0
                expect(nextNode.playerReward!.value).toBeCloseTo(0, 5);
                expect(nextNode.opponentReward!.value).toBeCloseTo(0, 5);
            });

            it('should calculate rewards based on damage race for win terminal', () => {
                const gameDefinition: GameDefinition = {
                    gameId: 11,
                    name: 'Damage Race Win Game',
                    description: 'A game with damage race reward computation ending in win',
                    rootSituationId: 101,
                    situations: [
                        {
                            situationId: 101,
                            name: 'Attack opponent',
                            playerActions: {
                                actions: [
                                    {
                                        actionId: 2001,
                                        name: '',
                                        description: 'Attack' 
                                    },
                                ],
                            },
                            opponentActions: {
                                actions: [
                                    {
                                        actionId: 2003,
                                        name: '',
                                        description: 'Defend' 
                                    },
                                ],
                            },
                            transitions: [
                                {
                                    playerActionId: 2001,
                                    opponentActionId: 2003,
                                    nextSituationId: 102,
                                    resourceConsumptions: [
                                        {
                                            resourceType: ResourceType.OPPONENT_HEALTH,
                                            value: 2000,
                                        },
                                    ],
                                    resourceRequirements: [],
                                },
                            ],
                        },
                    ],
                    terminalSituations: [],
                    initialDynamicState: {
                        resources: [
                            {
                                resourceType: ResourceType.PLAYER_HEALTH,
                                value: 2000 
                            },
                            {
                                resourceType: ResourceType.OPPONENT_HEALTH,
                                value: 2000 
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

                const result = buildGameTree(gameDefinition);
                expect(result.success).toBe(true);
                if (!result.success) {
                    throw new Error('Expected success but got error: ' + result.error.message);
                }
                const gameTree = result.gameTree;
                const rootNode = gameTree.nodes[gameTree.root];

                const transition = rootNode.transitions[0];
                expect(transition).toBeDefined();
                expect(transition.nextNodeId).toBeDefined();
                const nextNode = gameTree.nodes[transition.nextNodeId!];
                expect(nextNode).toBeDefined();
                expect(nextNode.playerReward).toBeDefined();
                expect(nextNode.opponentReward).toBeDefined();

                // Damage dealt = 2000 - 0 = 2000
                // Damage received = 2000 - 2000 = 0
                // Damage race = 2000 - 0 = 2000
                expect(nextNode.playerReward!.value).toBe(2000);
                expect(nextNode.opponentReward!.value).toBe(-2000);
            });

            it('should calculate rewards based on damage race for lose terminal', () => {
                const gameDefinition: GameDefinition = {
                    gameId: 12,
                    name: 'Damage Race Lose Game',
                    description: 'A game with damage race reward computation ending in lose',
                    rootSituationId: 101,
                    situations: [
                        {
                            situationId: 101,
                            name: 'Opponent attacks',
                            playerActions: {
                                actions: [
                                    {
                                        actionId: 2003,
                                        name: '',
                                        description: 'Defend' 
                                    },
                                ],
                            },
                            opponentActions: {
                                actions: [
                                    {
                                        actionId: 2001,
                                        name: '',
                                        description: 'Attack' 
                                    },
                                ],
                            },
                            transitions: [
                                {
                                    playerActionId: 2003,
                                    opponentActionId: 2001,
                                    nextSituationId: 102,
                                    resourceConsumptions: [
                                        {
                                            resourceType: ResourceType.PLAYER_HEALTH,
                                            value: 2000,
                                        },
                                    ],
                                    resourceRequirements: [],
                                },
                            ],
                        },
                    ],
                    terminalSituations: [],
                    initialDynamicState: {
                        resources: [
                            {
                                resourceType: ResourceType.PLAYER_HEALTH,
                                value: 2000 
                            },
                            {
                                resourceType: ResourceType.OPPONENT_HEALTH,
                                value: 2000 
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

                const result = buildGameTree(gameDefinition);
                expect(result.success).toBe(true);
                if (!result.success) {
                    throw new Error('Expected success but got error: ' + result.error.message);
                }
                const gameTree = result.gameTree;
                const rootNode = gameTree.nodes[gameTree.root];

                const transition = rootNode.transitions[0];
                expect(transition).toBeDefined();
                expect(transition.nextNodeId).toBeDefined();
                const nextNode = gameTree.nodes[transition.nextNodeId!];
                expect(nextNode).toBeDefined();
                expect(nextNode.playerReward).toBeDefined();
                expect(nextNode.opponentReward).toBeDefined();

                // Damage dealt = 2000 - 2000 = 0
                // Damage received = 2000 - 0 = 2000
                // Damage race = 0 - 2000 = -2000
                expect(nextNode.playerReward!.value).toBe(-2000);
                expect(nextNode.opponentReward!.value).toBe(2000);
            });
        });

        describe('win probability with corner', () => {
            it('should calculate rewards based on win probability when player is in corner', () => {
                const gameDefinition: GameDefinition = {
                    gameId: 13,
                    name: 'Corner Game',
                    description: 'A game with corner bonus for opponent',
                    rootSituationId: 101,
                    situations: [
                        {
                            situationId: 101,
                            name: 'First situation',
                            playerActions: {
                                actions: [
                                    {
                                        actionId: 1001,
                                        name: '',
                                        description: 'Action 1' 
                                    },
                                ],
                            },
                            opponentActions: {
                                actions: [
                                    {
                                        actionId: 1002,
                                        name: '',
                                        description: 'Action 2' 
                                    },
                                ],
                            },
                            transitions: [
                                {
                                    playerActionId: 1001,
                                    opponentActionId: 1002,
                                    nextSituationId: 200,
                                    resourceConsumptions: [],
                                    resourceRequirements: [],
                                },
                            ],
                        },
                    ],
                    terminalSituations: [
                        {
                            situationId: 200,
                            name: 'Neutral',
                            description: 'Neutral terminal situation',
                            cornerState: CornerState.PLAYER_IN_CORNER,
                        },
                    ],
                    initialDynamicState: {
                        resources: [
                            {
                                resourceType: ResourceType.PLAYER_HEALTH,
                                value: 6000 
                            },
                            {
                                resourceType: ResourceType.OPPONENT_HEALTH,
                                value: 4000 
                            },
                        ],
                    },
                    rewardComputationMethod: {
                        method: {
                            oneofKind: 'winProbability',
                            winProbability: {
                                // HP1000 worth of bonus for the player attacking into corner
                                cornerBonus: 1000, 
                            },
                        },
                    },
                    playerComboStarters: [],
                    opponentComboStarters: [],
                };

                const result = buildGameTree(gameDefinition);
                expect(result.success).toBe(true);
                if (!result.success) {
                    throw new Error('Expected success but got error: ' + result.error.message);
                }
                const gameTree = result.gameTree;
                const rootNode = gameTree.nodes[gameTree.root];

                const transition = rootNode.transitions[0];
                expect(transition).toBeDefined();
                expect(transition.nextNodeId).toBeDefined();
                const nextNode = gameTree.nodes[transition.nextNodeId!];
                expect(nextNode).toBeDefined();
                expect(nextNode.playerReward).toBeDefined();
                expect(nextNode.opponentReward).toBeDefined();

                // Player in corner: opponent gets corner bonus (3000 damage per turn)
                // Player damage: 2000, opponent damage: 3000
                // Player turns to kill: ceil(4000/2000) = 2
                // Opponent turns to kill: 1 + ceil((6000-3000)/3000) = 2
                // Win probability = 2/(2+2) = 0.5, Reward = 0
                expect(nextNode.playerReward!.value).toBeCloseTo(0, 5);
                expect(nextNode.opponentReward!.value).toBeCloseTo(0, 5);
            });

            it('should calculate rewards based on win probability when opponent is in corner', () => {
                const gameDefinition: GameDefinition = {
                    gameId: 14,
                    name: 'Corner Bonus Game',
                    description: 'A game with corner bonus for player',
                    rootSituationId: 101,
                    situations: [
                        {
                            situationId: 101,
                            name: 'First situation',
                            playerActions: {
                                actions: [
                                    {
                                        actionId: 1001,
                                        name: '',
                                        description: 'Action 1' 
                                    },
                                ],
                            },
                            opponentActions: {
                                actions: [
                                    {
                                        actionId: 1002,
                                        name: '',
                                        description: 'Action 2' 
                                    },
                                ],
                            },
                            transitions: [
                                {
                                    playerActionId: 1001,
                                    opponentActionId: 1002,
                                    nextSituationId: 200,
                                    resourceConsumptions: [],
                                    resourceRequirements: [],
                                },
                            ],
                        },
                    ],
                    terminalSituations: [
                        {
                            situationId: 200,
                            name: 'Neutral',
                            description: 'Neutral terminal situation',
                            cornerState: CornerState.OPPONENT_IN_CORNER,
                        },
                    ],
                    initialDynamicState: {
                        resources: [
                            {
                                resourceType: ResourceType.PLAYER_HEALTH,
                                value: 4000 
                            },
                            {
                                resourceType: ResourceType.OPPONENT_HEALTH,
                                value: 6000 
                            },
                        ],
                    },
                    rewardComputationMethod: {
                        method: {
                            oneofKind: 'winProbability',
                            winProbability: {
                                // HP1000 worth of bonus for player (opponent in corner)
                                cornerBonus: 1000, 
                            },
                        },
                    },
                    playerComboStarters: [],
                    opponentComboStarters: [],
                };

                const result = buildGameTree(gameDefinition);
                expect(result.success).toBe(true);
                if (!result.success) {
                    throw new Error('Expected success but got error: ' + result.error.message);
                }
                const gameTree = result.gameTree;
                const rootNode = gameTree.nodes[gameTree.root];

                const transition = rootNode.transitions[0];
                expect(transition).toBeDefined();
                expect(transition.nextNodeId).toBeDefined();
                const nextNode = gameTree.nodes[transition.nextNodeId!];
                expect(nextNode).toBeDefined();
                expect(nextNode.playerReward).toBeDefined();
                expect(nextNode.opponentReward).toBeDefined();

                // Opponent in corner: player gets corner bonus (3000 damage per turn)
                // Player damage: 3000, opponent damage: 2000
                // Player turns to kill: 1 + ceil((6000-3000)/3000) = 2
                // Opponent turns to kill: ceil(4000/2000) = 2
                // Win probability = 2/(2+2) = 0.5, Reward = 0
                expect(nextNode.playerReward!.value).toBeCloseTo(0, 5);
                expect(nextNode.opponentReward!.value).toBeCloseTo(0, 5);
            });

            it('should not apply corner bonus when corner state is NONE', () => {
                const gameDefinition: GameDefinition = {
                    gameId: 15,
                    name: 'No Corner Bonus Game',
                    description: 'A game without corner bonus',
                    rootSituationId: 101,
                    situations: [
                        {
                            situationId: 101,
                            name: 'First situation',
                            playerActions: {
                                actions: [
                                    {
                                        actionId: 1001,
                                        name: '',
                                        description: 'Action 1' 
                                    },
                                ],
                            },
                            opponentActions: {
                                actions: [
                                    {
                                        actionId: 1002,
                                        name: '',
                                        description: 'Action 2' 
                                    },
                                ],
                            },
                            transitions: [
                                {
                                    playerActionId: 1001,
                                    opponentActionId: 1002,
                                    nextSituationId: 200,
                                    resourceConsumptions: [],
                                    resourceRequirements: [],
                                },
                            ],
                        },
                    ],
                    terminalSituations: [
                        {
                            situationId: 200,
                            name: 'Neutral',
                            description: 'Neutral terminal situation',
                            cornerState: CornerState.NONE,
                        },
                    ],
                    initialDynamicState: {
                        resources: [
                            {
                                resourceType: ResourceType.PLAYER_HEALTH,
                                value: 6000 
                            },
                            {
                                resourceType: ResourceType.OPPONENT_HEALTH,
                                value: 4000 
                            },
                        ],
                    },
                    rewardComputationMethod: {
                        method: {
                            oneofKind: 'winProbability',
                            winProbability: {
                                cornerBonus: 1000 
                            },
                        },
                    },
                    playerComboStarters: [],
                    opponentComboStarters: [],
                };

                const result = buildGameTree(gameDefinition);
                expect(result.success).toBe(true);
                if (!result.success) {
                    throw new Error('Expected success but got error: ' + result.error.message);
                }
                const gameTree = result.gameTree;
                const rootNode = gameTree.nodes[gameTree.root];

                const transition = rootNode.transitions[0];
                expect(transition).toBeDefined();
                expect(transition.nextNodeId).toBeDefined();
                const nextNode = gameTree.nodes[transition.nextNodeId!];
                expect(nextNode).toBeDefined();
                expect(nextNode.playerReward).toBeDefined();
                expect(nextNode.opponentReward).toBeDefined();

                // Corner state NONE: no corner bonus applied
                // Both players deal 2000 damage per turn
                // Player turns to kill: ceil(4000/2000) = 2
                // Opponent turns to kill: ceil(6000/2000) = 3
                // Win probability = 3/(2+3) = 0.6, Reward = 0.6 * 20000 - 10000 = 2000
                expect(nextNode.playerReward!.value).toBe(2000);
                expect(nextNode.opponentReward!.value).toBe(-2000);
            });

            it('should apply symmetric adjustments around 50% probability using HP difference', () => {
                // Test that symmetric HP penalties from 50% probability are symmetric
                const gameDefinitionPlayerInCorner: GameDefinition = {
                    gameId: 16,
                    name: 'Symmetric Test Player Corner',
                    description: 'Test symmetric adjustment with player in corner',
                    rootSituationId: 101,
                    situations: [
                        {
                            situationId: 101,
                            name: 'First situation',
                            playerActions: {
                                actions: [
                                    {
                                        actionId: 1001,
                                        name: '',
                                        description: 'Action 1' 
                                    },
                                ],
                            },
                            opponentActions: {
                                actions: [
                                    {
                                        actionId: 1002,
                                        name: '',
                                        description: 'Action 2' 
                                    },
                                ],
                            },
                            transitions: [
                                {
                                    playerActionId: 1001,
                                    opponentActionId: 1002,
                                    nextSituationId: 200,
                                    resourceConsumptions: [],
                                    resourceRequirements: [],
                                },
                            ],
                        },
                    ],
                    terminalSituations: [
                        {
                            situationId: 200,
                            name: 'Neutral',
                            description: 'Neutral terminal situation',
                            cornerState: CornerState.PLAYER_IN_CORNER,
                        },
                    ],
                    initialDynamicState: {
                        resources: [
                            {
                                resourceType: ResourceType.PLAYER_HEALTH,
                                value: 5000 
                            },
                            {
                                resourceType: ResourceType.OPPONENT_HEALTH,
                                value: 5000 
                            },
                        ],
                    },
                    rewardComputationMethod: {
                        method: {
                            oneofKind: 'winProbability',
                            // HP3000 worth of penalty
                            winProbability: {
                                cornerBonus: 3000,
                            },
                        },
                    },
                    playerComboStarters: [],
                    opponentComboStarters: [],
                };

                const gameDefinitionOpponentInCorner: GameDefinition = {
                    gameId: 17,
                    name: 'Symmetric Test Opponent Corner',
                    description: 'Test symmetric adjustment with opponent in corner',
                    rootSituationId: 101,
                    situations: [
                        {
                            situationId: 101,
                            name: 'First situation',
                            playerActions: {
                                actions: [
                                    {
                                        actionId: 1001,
                                        name: '',
                                        description: 'Action 1' 
                                    },
                                ],
                            },
                            opponentActions: {
                                actions: [
                                    {
                                        actionId: 1002,
                                        name: '',
                                        description: 'Action 2' 
                                    },
                                ],
                            },
                            transitions: [
                                {
                                    playerActionId: 1001,
                                    opponentActionId: 1002,
                                    nextSituationId: 200,
                                    resourceConsumptions: [],
                                    resourceRequirements: [],
                                },
                            ],
                        },
                    ],
                    terminalSituations: [
                        {
                            situationId: 200,
                            name: 'Neutral',
                            description: 'Neutral terminal situation',
                            cornerState: CornerState.OPPONENT_IN_CORNER,
                        },
                    ],
                    initialDynamicState: {
                        resources: [
                            {
                                resourceType: ResourceType.PLAYER_HEALTH,
                                value: 5000 
                            },
                            {
                                resourceType: ResourceType.OPPONENT_HEALTH,
                                value: 5000 
                            },
                        ],
                    },
                    rewardComputationMethod: {
                        method: {
                            oneofKind: 'winProbability',
                            winProbability: {
                                // HP3000 worth of bonus (opponent in corner)
                                cornerBonus: 3000, 
                            },
                        },
                    },
                    playerComboStarters: [],
                    opponentComboStarters: [],
                };

                const resultPlayer = buildGameTree(gameDefinitionPlayerInCorner);
                expect(resultPlayer.success).toBe(true);
                if (!resultPlayer.success) {
                    throw new Error('Expected success but got error: ' + resultPlayer.error.message);
                }

                const resultOpponent = buildGameTree(gameDefinitionOpponentInCorner);
                expect(resultOpponent.success).toBe(true);
                if (!resultOpponent.success) {
                    throw new Error('Expected success but got error: ' + resultOpponent.error.message);
                }

                const gameTreePlayer = resultPlayer.gameTree;
                const gameTreeOpponent = resultOpponent.gameTree;
                const rootNodePlayer = gameTreePlayer.nodes[gameTreePlayer.root];
                const rootNodeOpponent = gameTreeOpponent.nodes[gameTreeOpponent.root];

                const transitionPlayer = rootNodePlayer.transitions[0];
                const transitionOpponent = rootNodeOpponent.transitions[0];
                const nextNodePlayer = gameTreePlayer.nodes[transitionPlayer.nextNodeId!];
                const nextNodeOpponent = gameTreeOpponent.nodes[transitionOpponent.nextNodeId!];

                // Score with player in corner = 5000 - 5000 - 3000 = -3000
                // Win probability = 1 / (1 + exp(-0.0003 * -3000)) ≈ 0.2890
                // Reward ≈ 0.2890 * 20000 - 10000 ≈ -4220
                // Score with opponent in corner = 5000 - 5000 + 3000 = 3000
                // Win probability = 1 / (1 + exp(-0.0003 * 3000)) ≈ 0.7110
                // Reward ≈ 0.7110 * 20000 - 10000 ≈ 4220
                // The absolute values should be symmetric (approximately equal)
                const rewardPlayer = nextNodePlayer.playerReward!.value;
                const rewardOpponent = nextNodeOpponent.playerReward!.value;

                expect(rewardPlayer).toBeLessThan(0); // Player in corner should reduce reward
                expect(rewardOpponent).toBeGreaterThan(0); // Opponent in corner should increase reward
                expect(Math.abs(rewardPlayer)).toBeCloseTo(Math.abs(rewardOpponent), 0);
            });

            it('should have high win probability when player has HP advantage even in corner', () => {
                const gameDefinition: GameDefinition = {
                    gameId: 18,
                    name: 'High Probability Corner Game',
                    description: 'A game with high win probability even when player in corner',
                    rootSituationId: 101,
                    situations: [
                        {
                            situationId: 101,
                            name: 'First situation',
                            playerActions: {
                                actions: [
                                    {
                                        actionId: 1001,
                                        name: '',
                                        description: 'Action 1' 
                                    },
                                ],
                            },
                            opponentActions: {
                                actions: [
                                    {
                                        actionId: 1002,
                                        name: '',
                                        description: 'Action 2' 
                                    },
                                ],
                            },
                            transitions: [
                                {
                                    playerActionId: 1001,
                                    opponentActionId: 1002,
                                    nextSituationId: 200,
                                    resourceConsumptions: [],
                                    resourceRequirements: [],
                                },
                            ],
                        },
                    ],
                    terminalSituations: [
                        {
                            situationId: 200,
                            name: 'Neutral',
                            description: 'Neutral terminal situation',
                            cornerState: CornerState.PLAYER_IN_CORNER,
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
                                value: 1 
                            },
                        ],
                    },
                    rewardComputationMethod: {
                        method: {
                            oneofKind: 'winProbability',
                            winProbability: {
                                // HP1000 worth of bonus for opponent (player in corner)
                                cornerBonus: 1000, 
                            },
                        },
                    },
                    playerComboStarters: [],
                    opponentComboStarters: [],
                };

                const result = buildGameTree(gameDefinition);
                expect(result.success).toBe(true);
                if (!result.success) {
                    throw new Error('Expected success but got error: ' + result.error.message);
                }
                const gameTree = result.gameTree;
                const rootNode = gameTree.nodes[gameTree.root];

                const transition = rootNode.transitions[0];
                expect(transition).toBeDefined();
                expect(transition.nextNodeId).toBeDefined();
                const nextNode = gameTree.nodes[transition.nextNodeId!];
                expect(nextNode).toBeDefined();
                expect(nextNode.playerReward).toBeDefined();
                expect(nextNode.opponentReward).toBeDefined();

                // Player in corner: opponent gets corner bonus (3000 damage per turn)
                // Player damage: 2000, kills opponent in 1 turn (2000 >= 1)
                // Opponent damage: 3000, needs 1 + ceil((10000-3000)/3000) = 1+3 = 4 turns
                // Win probability = 4/(1+4) = 0.8, Reward = 0.8 * 20000 - 10000 = 6000
                expect(nextNode.playerReward!.value).toBe(6000);
                expect(nextNode.opponentReward!.value).toBe(-6000);
            });

            it('should have low win probability when opponent has HP advantage even in corner', () => {
                const gameDefinition: GameDefinition = {
                    gameId: 19,
                    name: 'Low Probability Corner Game',
                    description: 'A game with low win probability even when opponent in corner',
                    rootSituationId: 101,
                    situations: [
                        {
                            situationId: 101,
                            name: 'First situation',
                            playerActions: {
                                actions: [
                                    {
                                        actionId: 1001,
                                        name: '',
                                        description: 'Action 1' 
                                    },
                                ],
                            },
                            opponentActions: {
                                actions: [
                                    {
                                        actionId: 1002,
                                        name: '',
                                        description: 'Action 2' 
                                    },
                                ],
                            },
                            transitions: [
                                {
                                    playerActionId: 1001,
                                    opponentActionId: 1002,
                                    nextSituationId: 200,
                                    resourceConsumptions: [],
                                    resourceRequirements: [],
                                },
                            ],
                        },
                    ],
                    terminalSituations: [
                        {
                            situationId: 200,
                            name: 'Neutral',
                            description: 'Neutral terminal situation',
                            cornerState: CornerState.OPPONENT_IN_CORNER,
                        },
                    ],
                    initialDynamicState: {
                        resources: [
                            {
                                resourceType: ResourceType.PLAYER_HEALTH,
                                value: 1 
                            },
                            {
                                resourceType: ResourceType.OPPONENT_HEALTH,
                                value: 10000 
                            },
                        ],
                    },
                    rewardComputationMethod: {
                        method: {
                            oneofKind: 'winProbability',
                            winProbability: {
                                // HP1000 worth of bonus for player (opponent in corner)
                                cornerBonus: 1000, 
                            },
                        },
                    },
                    playerComboStarters: [],
                    opponentComboStarters: [],
                };

                const result = buildGameTree(gameDefinition);
                expect(result.success).toBe(true);
                if (!result.success) {
                    throw new Error('Expected success but got error: ' + result.error.message);
                }
                const gameTree = result.gameTree;
                const rootNode = gameTree.nodes[gameTree.root];

                const transition = rootNode.transitions[0];
                expect(transition).toBeDefined();
                expect(transition.nextNodeId).toBeDefined();
                const nextNode = gameTree.nodes[transition.nextNodeId!];
                expect(nextNode).toBeDefined();
                expect(nextNode.playerReward).toBeDefined();
                expect(nextNode.opponentReward).toBeDefined();

                // Opponent in corner: player gets corner bonus (3000 damage per turn)
                // Player damage: 3000, needs 1 + ceil((10000-3000)/3000) = 1+3 = 4 turns
                // Opponent damage: 2000, kills player in 1 turn (2000 >= 1)
                // Win probability = 1/(4+1) = 0.2, Reward = 0.2 * 20000 - 10000 = -6000
                expect(nextNode.playerReward!.value).toBe(-6000);
                expect(nextNode.opponentReward!.value).toBe(6000);
            });
        });
    });
});
