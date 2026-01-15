import { buildGameTree, GameTreeBuildErrorCode } from './game-tree-builder';
import {
    GameDefinition,
    ResourceType,
    RewardComputationMethod,
    CornerState,
} from '@mari/ts-proto';
import type { NodeTransition } from '@mari/game-tree/game-tree';

describe('gameTreeBuilder', () => {
    describe('basic game tree generation', () => {
        it('should fail when there is a cycle without DynamicState changes', () => {
            const gameDefinition: GameDefinition = {
                gameId: 'test-game',
                name: 'Test Game',
                description: 'Test game with two cyclic situations.',
                rootSituationId: 'situation1',
                situations: [
                    {
                        situationId: 'situation1',
                        description: 'First situation',
                        playerActions: {
                            actions: [
                                { actionId: 'action1', name: '', description: 'Action 1' },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                { actionId: 'action2', name: '', description: 'Action 2' },
                            ],
                        },
                        transitions: [
                            {
                                playerActionId: 'action1',
                                opponentActionId: 'action2',
                                nextSituationId: 'situation2',
                                resourceConsumptions: [],
                            },
                        ],
                    },
                    {
                        situationId: 'situation2',
                        description: 'Second situation',
                        playerActions: {
                            actions: [
                                { actionId: 'action3', name: '', description: 'Action 3' },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                { actionId: 'action4', name: '', description: 'Action 4' },
                            ],
                        },
                        transitions: [
                            {
                                playerActionId: 'action3',
                                opponentActionId: 'action4',
                                nextSituationId: 'situation1',
                                resourceConsumptions: [],
                            },
                        ],
                    },
                ],
                terminalSituations: [],
                initialDynamicState: {
                    resources: [
                        { resourceType: ResourceType.PLAYER_HEALTH, value: 5000 },
                        { resourceType: ResourceType.OPPONENT_HEALTH, value: 4000 },
                    ],
                },
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
                gameId: 'test-game',
                name: 'Test Game',
                description: 'A simple test game with terminal',
                rootSituationId: 'situation1',
                situations: [
                    {
                        situationId: 'situation1',
                        description: 'First situation',
                        playerActions: {
                            actions: [
                                { actionId: 'action1', name: '', description: 'Action 1' },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                { actionId: 'action2', name: '', description: 'Action 2' },
                            ],
                        },
                        transitions: [
                            {
                                playerActionId: 'action1',
                                opponentActionId: 'action2',
                                nextSituationId: 'neutral',
                                resourceConsumptions: [],
                            },
                        ],
                    },
                ],
                terminalSituations: [
                    {
                        situationId: 'neutral',
                        name: 'Neutral',
                        description: 'Neutral terminal situation',
                    },
                ],
                initialDynamicState: {
                    resources: [
                        { resourceType: ResourceType.PLAYER_HEALTH, value: 5000 },
                        { resourceType: ResourceType.OPPONENT_HEALTH, value: 4000 },
                    ],
                },
            };

            const result = buildGameTree(gameDefinition);
            expect(result.success).toBe(true);
            if (!result.success) {
                throw new Error('Expected success but got error: ' + result.error.message);
            }
            const gameTree = result.gameTree;

            expect(gameTree.id).toBe('test-game');
            expect(gameTree.root).toBeDefined();
            const rootNode = gameTree.nodes[gameTree.root];
            expect(rootNode).toBeDefined();
            expect(rootNode.nodeId).toContain('situation1');
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
                gameId: 'damage-game',
                name: 'Damage Game',
                description: 'A game with damage',
                rootSituationId: 'situation1',
                situations: [
                    {
                        situationId: 'situation1',
                        description: 'Attack situation',
                        playerActions: {
                            actions: [
                                { actionId: 'attack', name: '', description: 'Attack' },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                { actionId: 'guard', name: '', description: 'Guard' },
                            ],
                        },
                        transitions: [
                            {
                                playerActionId: 'attack',
                                opponentActionId: 'guard',
                                nextSituationId: 'situation2',
                                resourceConsumptions: [
                                    {
                                        resourceType: ResourceType.OPPONENT_HEALTH,
                                        value: 2000,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        situationId: 'situation2',
                        description: 'Next situation',
                        playerActions: {
                            actions: [
                                { actionId: 'action1', name: '', description: 'Action 1' },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                { actionId: 'action2', name: '', description: 'Action 2' },
                            ],
                        },
                        transitions: [],
                    },
                ],
                terminalSituations: [],
                initialDynamicState: {
                    resources: [
                        { resourceType: ResourceType.PLAYER_HEALTH, value: 5000 },
                        { resourceType: ResourceType.OPPONENT_HEALTH, value: 4000 },
                    ],
                },
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
                (t: NodeTransition) => t.playerActionId === 'attack' && t.opponentActionId === 'guard'
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
                gameId: 'win-game',
                name: 'Win Game',
                description: 'A game that ends with win',
                rootSituationId: 'situation1',
                situations: [
                    {
                        situationId: 'situation1',
                        description: 'Attack situation',
                        playerActions: {
                            actions: [
                                { actionId: 'attack', name: '', description: 'Attack' },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                { actionId: 'guard', name: '', description: 'Guard' },
                            ],
                        },
                        transitions: [
                            {
                                playerActionId: 'attack',
                                opponentActionId: 'guard',
                                nextSituationId: 'situation2',
                                resourceConsumptions: [
                                    {
                                        resourceType: ResourceType.OPPONENT_HEALTH,
                                        value: 5000, // Enough to kill opponent
                                    },
                                ],
                            },
                        ],
                    },
                ],
                terminalSituations: [],
                initialDynamicState: {
                    resources: [
                        { resourceType: ResourceType.PLAYER_HEALTH, value: 5000 },
                        { resourceType: ResourceType.OPPONENT_HEALTH, value: 4000 },
                    ],
                },
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
                gameId: 'lose-game',
                name: 'Lose Game',
                description: 'A game that ends with lose',
                rootSituationId: 'situation1',
                situations: [
                    {
                        situationId: 'situation1',
                        description: 'Defense situation',
                        playerActions: {
                            actions: [
                                { actionId: 'guard', name: '', description: 'Guard' },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                { actionId: 'attack', name: '', description: 'Attack' },
                            ],
                        },
                        transitions: [
                            {
                                playerActionId: 'guard',
                                opponentActionId: 'attack',
                                nextSituationId: 'situation2',
                                resourceConsumptions: [
                                    {
                                        resourceType: ResourceType.PLAYER_HEALTH,
                                        value: 6000, // Enough to kill player
                                    },
                                ],
                            },
                        ],
                    },
                ],
                terminalSituations: [],
                initialDynamicState: {
                    resources: [
                        { resourceType: ResourceType.PLAYER_HEALTH, value: 5000 },
                        { resourceType: ResourceType.OPPONENT_HEALTH, value: 4000 },
                    ],
                },
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
                gameId: 'draw-game',
                name: 'Draw Game',
                description: 'A game that ends with draw',
                rootSituationId: 'situation1',
                situations: [
                    {
                        situationId: 'situation1',
                        description: 'Mutual attack',
                        playerActions: {
                            actions: [
                                { actionId: 'attack', name: '', description: 'Attack' },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                { actionId: 'attack', name: '', description: 'Attack' },
                            ],
                        },
                        transitions: [
                            {
                                playerActionId: 'attack',
                                opponentActionId: 'attack',
                                nextSituationId: 'situation2',
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
                            },
                        ],
                    },
                ],
                terminalSituations: [],
                initialDynamicState: {
                    resources: [
                        { resourceType: ResourceType.PLAYER_HEALTH, value: 5000 },
                        { resourceType: ResourceType.OPPONENT_HEALTH, value: 4000 },
                    ],
                },
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
                gameId: 'neutral-game',
                name: 'Neutral Game',
                description: 'A game with neutral terminal',
                rootSituationId: 'situation1',
                situations: [
                    {
                        situationId: 'situation1',
                        description: 'First situation',
                        playerActions: {
                            actions: [
                                { actionId: 'action1', name: '', description: 'Action 1' },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                { actionId: 'action2', name: '', description: 'Action 2' },
                            ],
                        },
                        transitions: [
                            {
                                playerActionId: 'action1',
                                opponentActionId: 'action2',
                                nextSituationId: 'neutral',
                                resourceConsumptions: [],
                            },
                        ],
                    },
                ],
                terminalSituations: [
                    {
                        situationId: 'neutral',
                        name: 'Neutral',
                        description: 'Neutral terminal situation',
                    },
                ],
                initialDynamicState: {
                    resources: [
                        { resourceType: ResourceType.PLAYER_HEALTH, value: 6000 },
                        { resourceType: ResourceType.OPPONENT_HEALTH, value: 4000 },
                    ],
                },
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

            // Win probability = 6000 / (6000 + 4000) = 0.6
            // Reward = 0.6 * 20000 - 10000 = 2000
            expect(nextNode.playerReward!.value).toBeCloseTo(2000, 1);
            expect(nextNode.opponentReward!.value).toBeCloseTo(-2000, 1);
        });
    });

    describe('cycle prevention', () => {
        it('should fail when there is a cycle without DynamicState changes', () => {
            const gameDefinition: GameDefinition = {
                gameId: 'cycle-game',
                name: 'Cycle Game',
                description: 'A game with cycles',
                rootSituationId: 'situation1',
                situations: [
                    {
                        situationId: 'situation1',
                        description: 'First situation',
                        playerActions: {
                            actions: [
                                { actionId: 'action1', name: '', description: 'Action 1' },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                { actionId: 'action2', name: '', description: 'Action 2' },
                            ],
                        },
                        transitions: [
                            {
                                playerActionId: 'action1',
                                opponentActionId: 'action2',
                                nextSituationId: 'situation2',
                                resourceConsumptions: [],
                            },
                        ],
                    },
                    {
                        situationId: 'situation2',
                        description: 'Second situation',
                        playerActions: {
                            actions: [
                                { actionId: 'action3', name: '', description: 'Action 3' },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                { actionId: 'action4', name: '', description: 'Action 4' },
                            ],
                        },
                        transitions: [
                            {
                                playerActionId: 'action3',
                                opponentActionId: 'action4',
                                nextSituationId: 'situation1',
                                resourceConsumptions: [],
                            },
                        ],
                    },
                ],
                terminalSituations: [],
                initialDynamicState: {
                    resources: [
                        { resourceType: ResourceType.PLAYER_HEALTH, value: 5000 },
                        { resourceType: ResourceType.OPPONENT_HEALTH, value: 4000 },
                    ],
                },
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
                gameId: 'cycle-with-state-change',
                name: 'Cycle Game with State Change',
                description: 'A game with cycles but state changes',
                rootSituationId: 'situation1',
                situations: [
                    {
                        situationId: 'situation1',
                        description: 'First situation',
                        playerActions: {
                            actions: [
                                { actionId: 'action1', name: '', description: 'Action 1' },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                { actionId: 'action2', name: '', description: 'Action 2' },
                            ],
                        },
                        transitions: [
                            {
                                playerActionId: 'action1',
                                opponentActionId: 'action2',
                                nextSituationId: 'situation2',
                                resourceConsumptions: [
                                    {
                                        resourceType: ResourceType.OPPONENT_HEALTH,
                                        value: 100,
                                    },
                                ],
                            },
                        ],
                    },
                    {
                        situationId: 'situation2',
                        description: 'Second situation',
                        playerActions: {
                            actions: [
                                { actionId: 'action3', name: '', description: 'Action 3' },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                { actionId: 'action4', name: '', description: 'Action 4' },
                            ],
                        },
                        transitions: [
                            {
                                playerActionId: 'action3',
                                opponentActionId: 'action4',
                                nextSituationId: 'situation1',
                                resourceConsumptions: [
                                    {
                                        resourceType: ResourceType.PLAYER_HEALTH,
                                        value: 100,
                                    },
                                ],
                            },
                        ],
                    },
                ],
                terminalSituations: [],
                initialDynamicState: {
                    resources: [
                        { resourceType: ResourceType.PLAYER_HEALTH, value: 5000 },
                        { resourceType: ResourceType.OPPONENT_HEALTH, value: 4000 },
                    ],
                },
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
                    gameId: 'damage-race-game',
                    name: 'Damage Race Game',
                    description: 'A game with damage race reward computation',
                    rootSituationId: 'situation1',
                    situations: [
                        {
                            situationId: 'situation1',
                            description: 'First situation',
                            playerActions: {
                                actions: [
                                    { actionId: 'action1', name: '', description: 'Action 1' },
                                ],
                            },
                            opponentActions: {
                                actions: [
                                    { actionId: 'action2', name: '', description: 'Action 2' },
                                ],
                            },
                            transitions: [
                                {
                                    playerActionId: 'action1',
                                    opponentActionId: 'action2',
                                    nextSituationId: 'neutral',
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
                                },
                            ],
                        },
                    ],
                    terminalSituations: [
                        {
                            situationId: 'neutral',
                            name: 'Neutral',
                            description: 'Neutral terminal situation',
                            cornerState: CornerState.UNKNOWN,
                        },
                    ],
                    initialDynamicState: {
                        resources: [
                            { resourceType: ResourceType.PLAYER_HEALTH, value: 5000 },
                            { resourceType: ResourceType.OPPONENT_HEALTH, value: 4000 },
                        ],
                    },
                    rewardComputationMethod: {
                        method: {
                            oneofKind: 'damageRace',
                            damageRace: {},
                        },
                    },
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
                    gameId: 'damage-race-draw-game',
                    name: 'Damage Race Draw Game',
                    description: 'A game with damage race reward computation ending in draw',
                    rootSituationId: 'situation1',
                    situations: [
                        {
                            situationId: 'situation1',
                            description: 'Mutual attack',
                            playerActions: {
                                actions: [
                                    { actionId: 'attack', name: '', description: 'Attack' },
                                ],
                            },
                            opponentActions: {
                                actions: [
                                    { actionId: 'attack', name: '', description: 'Attack' },
                                ],
                            },
                            transitions: [
                                {
                                    playerActionId: 'attack',
                                    opponentActionId: 'attack',
                                    nextSituationId: 'situation2',
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
                                },
                            ],
                        },
                    ],
                    terminalSituations: [],
                    initialDynamicState: {
                        resources: [
                            { resourceType: ResourceType.PLAYER_HEALTH, value: 5000 },
                            { resourceType: ResourceType.OPPONENT_HEALTH, value: 5000 },
                        ],
                    },
                    rewardComputationMethod: {
                        method: {
                            oneofKind: 'damageRace',
                            damageRace: {},
                        },
                    },
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
                    gameId: 'damage-race-win-game',
                    name: 'Damage Race Win Game',
                    description: 'A game with damage race reward computation ending in win',
                    rootSituationId: 'situation1',
                    situations: [
                        {
                            situationId: 'situation1',
                            description: 'Attack opponent',
                            playerActions: {
                                actions: [
                                    { actionId: 'attack', name: '', description: 'Attack' },
                                ],
                            },
                            opponentActions: {
                                actions: [
                                    { actionId: 'defend', name: '', description: 'Defend' },
                                ],
                            },
                            transitions: [
                                {
                                    playerActionId: 'attack',
                                    opponentActionId: 'defend',
                                    nextSituationId: 'situation2',
                                    resourceConsumptions: [
                                        {
                                            resourceType: ResourceType.OPPONENT_HEALTH,
                                            value: 2000,
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                    terminalSituations: [],
                    initialDynamicState: {
                        resources: [
                            { resourceType: ResourceType.PLAYER_HEALTH, value: 2000 },
                            { resourceType: ResourceType.OPPONENT_HEALTH, value: 2000 },
                        ],
                    },
                    rewardComputationMethod: {
                        method: {
                            oneofKind: 'damageRace',
                            damageRace: {},
                        },
                    },
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
                    gameId: 'damage-race-lose-game',
                    name: 'Damage Race Lose Game',
                    description: 'A game with damage race reward computation ending in lose',
                    rootSituationId: 'situation1',
                    situations: [
                        {
                            situationId: 'situation1',
                            description: 'Opponent attacks',
                            playerActions: {
                                actions: [
                                    { actionId: 'defend', name: '', description: 'Defend' },
                                ],
                            },
                            opponentActions: {
                                actions: [
                                    { actionId: 'attack', name: '', description: 'Attack' },
                                ],
                            },
                            transitions: [
                                {
                                    playerActionId: 'defend',
                                    opponentActionId: 'attack',
                                    nextSituationId: 'situation2',
                                    resourceConsumptions: [
                                        {
                                            resourceType: ResourceType.PLAYER_HEALTH,
                                            value: 2000,
                                        },
                                    ],
                                },
                            ],
                        },
                    ],
                    terminalSituations: [],
                    initialDynamicState: {
                        resources: [
                            { resourceType: ResourceType.PLAYER_HEALTH, value: 2000 },
                            { resourceType: ResourceType.OPPONENT_HEALTH, value: 2000 },
                        ],
                    },
                    rewardComputationMethod: {
                        method: {
                            oneofKind: 'damageRace',
                            damageRace: {},
                        },
                    },
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
            it('should calculate rewards based on win probability with corner penalty when player is in corner', () => {
                const gameDefinition: GameDefinition = {
                    gameId: 'corner-penalty-game',
                    name: 'Corner Penalty Game',
                    description: 'A game with corner penalty',
                    rootSituationId: 'situation1',
                    situations: [
                        {
                            situationId: 'situation1',
                            description: 'First situation',
                            playerActions: {
                                actions: [
                                    { actionId: 'action1', name: '', description: 'Action 1' },
                                ],
                            },
                            opponentActions: {
                                actions: [
                                    { actionId: 'action2', name: '', description: 'Action 2' },
                                ],
                            },
                            transitions: [
                                {
                                    playerActionId: 'action1',
                                    opponentActionId: 'action2',
                                    nextSituationId: 'neutral',
                                    resourceConsumptions: [],
                                },
                            ],
                        },
                    ],
                    terminalSituations: [
                        {
                            situationId: 'neutral',
                            name: 'Neutral',
                            description: 'Neutral terminal situation',
                            cornerState: CornerState.PLAYER_IN_CORNER,
                        },
                    ],
                    initialDynamicState: {
                        resources: [
                            { resourceType: ResourceType.PLAYER_HEALTH, value: 6000 },
                            { resourceType: ResourceType.OPPONENT_HEALTH, value: 4000 },
                        ],
                    },
                    rewardComputationMethod: {
                        method: {
                            oneofKind: 'winProbability',
                            winProbability: {
                                cornerPenalty: 1000, // HP1000 worth of penalty
                            },
                        },
                    },
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

                // Score = 6000 - 4000 - 1000 = 1000 (player in corner, so subtract penalty)
                // Win probability = 1 / (1 + exp(-0.0003 * 1000)) ≈ 0.5744
                // Reward = 0.5744 * 20000 - 10000 ≈ 1488
                expect(nextNode.playerReward!.value).toBeCloseTo(1488, 0);
                expect(nextNode.opponentReward!.value).toBeCloseTo(-1488, 0);
            });

            it('should calculate rewards based on win probability with corner bonus when opponent is in corner', () => {
                const gameDefinition: GameDefinition = {
                    gameId: 'corner-bonus-game',
                    name: 'Corner Bonus Game',
                    description: 'A game with corner bonus',
                    rootSituationId: 'situation1',
                    situations: [
                        {
                            situationId: 'situation1',
                            description: 'First situation',
                            playerActions: {
                                actions: [
                                    { actionId: 'action1', name: '', description: 'Action 1' },
                                ],
                            },
                            opponentActions: {
                                actions: [
                                    { actionId: 'action2', name: '', description: 'Action 2' },
                                ],
                            },
                            transitions: [
                                {
                                    playerActionId: 'action1',
                                    opponentActionId: 'action2',
                                    nextSituationId: 'neutral',
                                    resourceConsumptions: [],
                                },
                            ],
                        },
                    ],
                    terminalSituations: [
                        {
                            situationId: 'neutral',
                            name: 'Neutral',
                            description: 'Neutral terminal situation',
                            cornerState: CornerState.OPPONENT_IN_CORNER,
                        },
                    ],
                    initialDynamicState: {
                        resources: [
                            { resourceType: ResourceType.PLAYER_HEALTH, value: 4000 },
                            { resourceType: ResourceType.OPPONENT_HEALTH, value: 6000 },
                        ],
                    },
                    rewardComputationMethod: {
                        method: {
                            oneofKind: 'winProbability',
                            winProbability: {
                                cornerPenalty: 1000, // HP1000 worth of bonus (opponent in corner)
                            },
                        },
                    },
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

                // Score = 4000 - 6000 + 1000 = -1000 (opponent in corner, so add bonus)
                // Win probability = 1 / (1 + exp(-0.0003 * -1000)) ≈ 0.4256
                // Reward = 0.4256 * 20000 - 10000 ≈ -1488
                expect(nextNode.playerReward!.value).toBeCloseTo(-1488, 0);
                expect(nextNode.opponentReward!.value).toBeCloseTo(1488, 0);
            });

            it('should not apply corner penalty when corner state is NONE', () => {
                const gameDefinition: GameDefinition = {
                    gameId: 'no-corner-penalty-game',
                    name: 'No Corner Penalty Game',
                    description: 'A game without corner penalty',
                    rootSituationId: 'situation1',
                    situations: [
                        {
                            situationId: 'situation1',
                            description: 'First situation',
                            playerActions: {
                                actions: [
                                    { actionId: 'action1', name: '', description: 'Action 1' },
                                ],
                            },
                            opponentActions: {
                                actions: [
                                    { actionId: 'action2', name: '', description: 'Action 2' },
                                ],
                            },
                            transitions: [
                                {
                                    playerActionId: 'action1',
                                    opponentActionId: 'action2',
                                    nextSituationId: 'neutral',
                                    resourceConsumptions: [],
                                },
                            ],
                        },
                    ],
                    terminalSituations: [
                        {
                            situationId: 'neutral',
                            name: 'Neutral',
                            description: 'Neutral terminal situation',
                            cornerState: CornerState.NONE,
                        },
                    ],
                    initialDynamicState: {
                        resources: [
                            { resourceType: ResourceType.PLAYER_HEALTH, value: 6000 },
                            { resourceType: ResourceType.OPPONENT_HEALTH, value: 4000 },
                        ],
                    },
                    rewardComputationMethod: {
                        method: {
                            oneofKind: 'winProbability',
                            winProbability: {
                                cornerPenalty: 1000,
                            },
                        },
                    },
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

                // Score = 6000 - 4000 = 2000 (no corner penalty applied)
                // Win probability = 1 / (1 + exp(-0.0003 * 2000)) ≈ 0.6457
                // Reward = 0.6457 * 20000 - 10000 ≈ 2914
                expect(nextNode.playerReward!.value).toBeCloseTo(2914, 0);
                expect(nextNode.opponentReward!.value).toBeCloseTo(-2914, 0);
            });

            it('should apply symmetric adjustments around 50% probability using HP difference', () => {
                // Test that symmetric HP penalties from 50% probability are symmetric
                const gameDefinitionPlayerInCorner: GameDefinition = {
                    gameId: 'symmetric-test-player-corner',
                    name: 'Symmetric Test Player Corner',
                    description: 'Test symmetric adjustment with player in corner',
                    rootSituationId: 'situation1',
                    situations: [
                        {
                            situationId: 'situation1',
                            description: 'First situation',
                            playerActions: {
                                actions: [
                                    { actionId: 'action1', name: '', description: 'Action 1' },
                                ],
                            },
                            opponentActions: {
                                actions: [
                                    { actionId: 'action2', name: '', description: 'Action 2' },
                                ],
                            },
                            transitions: [
                                {
                                    playerActionId: 'action1',
                                    opponentActionId: 'action2',
                                    nextSituationId: 'neutral',
                                    resourceConsumptions: [],
                                },
                            ],
                        },
                    ],
                    terminalSituations: [
                        {
                            situationId: 'neutral',
                            name: 'Neutral',
                            description: 'Neutral terminal situation',
                            cornerState: CornerState.PLAYER_IN_CORNER,
                        },
                    ],
                    initialDynamicState: {
                        resources: [
                            { resourceType: ResourceType.PLAYER_HEALTH, value: 5000 },
                            { resourceType: ResourceType.OPPONENT_HEALTH, value: 5000 },
                        ],
                    },
                    rewardComputationMethod: {
                        method: {
                            oneofKind: 'winProbability',
                            winProbability: {
                                cornerPenalty: 3000, // HP3000 worth of penalty
                            },
                        },
                    },
                };

                const gameDefinitionOpponentInCorner: GameDefinition = {
                    gameId: 'symmetric-test-opponent-corner',
                    name: 'Symmetric Test Opponent Corner',
                    description: 'Test symmetric adjustment with opponent in corner',
                    rootSituationId: 'situation1',
                    situations: [
                        {
                            situationId: 'situation1',
                            description: 'First situation',
                            playerActions: {
                                actions: [
                                    { actionId: 'action1', name: '', description: 'Action 1' },
                                ],
                            },
                            opponentActions: {
                                actions: [
                                    { actionId: 'action2', name: '', description: 'Action 2' },
                                ],
                            },
                            transitions: [
                                {
                                    playerActionId: 'action1',
                                    opponentActionId: 'action2',
                                    nextSituationId: 'neutral',
                                    resourceConsumptions: [],
                                },
                            ],
                        },
                    ],
                    terminalSituations: [
                        {
                            situationId: 'neutral',
                            name: 'Neutral',
                            description: 'Neutral terminal situation',
                            cornerState: CornerState.OPPONENT_IN_CORNER,
                        },
                    ],
                    initialDynamicState: {
                        resources: [
                            { resourceType: ResourceType.PLAYER_HEALTH, value: 5000 },
                            { resourceType: ResourceType.OPPONENT_HEALTH, value: 5000 },
                        ],
                    },
                    rewardComputationMethod: {
                        method: {
                            oneofKind: 'winProbability',
                            winProbability: {
                                cornerPenalty: 3000, // HP3000 worth of bonus (opponent in corner)
                            },
                        },
                    },
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

            it('should keep probability at 100% even when player is in corner', () => {
                const gameDefinition: GameDefinition = {
                    gameId: 'max-probability-corner-game',
                    name: 'Max Probability Corner Game',
                    description: 'A game with 100% win probability and corner penalty',
                    rootSituationId: 'situation1',
                    situations: [
                        {
                            situationId: 'situation1',
                            description: 'First situation',
                            playerActions: {
                                actions: [
                                    { actionId: 'action1', name: '', description: 'Action 1' },
                                ],
                            },
                            opponentActions: {
                                actions: [
                                    { actionId: 'action2', name: '', description: 'Action 2' },
                                ],
                            },
                            transitions: [
                                {
                                    playerActionId: 'action1',
                                    opponentActionId: 'action2',
                                    nextSituationId: 'neutral',
                                    resourceConsumptions: [],
                                },
                            ],
                        },
                    ],
                    terminalSituations: [
                        {
                            situationId: 'neutral',
                            name: 'Neutral',
                            description: 'Neutral terminal situation',
                            cornerState: CornerState.PLAYER_IN_CORNER,
                        },
                    ],
                    initialDynamicState: {
                        resources: [
                            { resourceType: ResourceType.PLAYER_HEALTH, value: 10000 },
                            { resourceType: ResourceType.OPPONENT_HEALTH, value: 1 },
                        ],
                    },
                    rewardComputationMethod: {
                        method: {
                            oneofKind: 'winProbability',
                            winProbability: {
                                cornerPenalty: 1000, // HP1000 worth of penalty
                            },
                        },
                    },
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

                // Score = 10000 - 1 - 1000 = 8999
                // Win probability = 1 / (1 + exp(-0.0003 * 8999)) ≈ 0.9999 (very close to 100%)
                // Reward ≈ 0.9999 * 20000 - 10000 ≈ 9998
                expect(nextNode.playerReward!.value).toBeGreaterThan(9990);
                expect(nextNode.opponentReward!.value).toBeLessThan(-9990);
            });

            it('should keep probability at 0% even when opponent is in corner', () => {
                const gameDefinition: GameDefinition = {
                    gameId: 'min-probability-corner-game',
                    name: 'Min Probability Corner Game',
                    description: 'A game with 0% win probability and corner bonus',
                    rootSituationId: 'situation1',
                    situations: [
                        {
                            situationId: 'situation1',
                            description: 'First situation',
                            playerActions: {
                                actions: [
                                    { actionId: 'action1', name: '', description: 'Action 1' },
                                ],
                            },
                            opponentActions: {
                                actions: [
                                    { actionId: 'action2', name: '', description: 'Action 2' },
                                ],
                            },
                            transitions: [
                                {
                                    playerActionId: 'action1',
                                    opponentActionId: 'action2',
                                    nextSituationId: 'neutral',
                                    resourceConsumptions: [],
                                },
                            ],
                        },
                    ],
                    terminalSituations: [
                        {
                            situationId: 'neutral',
                            name: 'Neutral',
                            description: 'Neutral terminal situation',
                            cornerState: CornerState.OPPONENT_IN_CORNER,
                        },
                    ],
                    initialDynamicState: {
                        resources: [
                            { resourceType: ResourceType.PLAYER_HEALTH, value: 1 },
                            { resourceType: ResourceType.OPPONENT_HEALTH, value: 10000 },
                        ],
                    },
                    rewardComputationMethod: {
                        method: {
                            oneofKind: 'winProbability',
                            winProbability: {
                                cornerPenalty: 1000, // HP1000 worth of bonus (opponent in corner)
                            },
                        },
                    },
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

                // Score = 1 - 10000 + 1000 = -8999
                // Win probability = 1 / (1 + exp(-0.0003 * -8999)) ≈ 0.0001 (very close to 0%)
                // Reward ≈ 0.0001 * 20000 - 10000 ≈ -9998
                expect(nextNode.playerReward!.value).toBeLessThan(-9990);
                expect(nextNode.opponentReward!.value).toBeGreaterThan(9990);
            });

            it('should use default behavior when reward computation method is not specified', () => {
                const gameDefinition: GameDefinition = {
                    gameId: 'default-reward-game',
                    name: 'Default Reward Game',
                    description: 'A game with default reward computation',
                    rootSituationId: 'situation1',
                    situations: [
                        {
                            situationId: 'situation1',
                            description: 'First situation',
                            playerActions: {
                                actions: [
                                    { actionId: 'action1', name: '', description: 'Action 1' },
                                ],
                            },
                            opponentActions: {
                                actions: [
                                    { actionId: 'action2', name: '', description: 'Action 2' },
                                ],
                            },
                            transitions: [
                                {
                                    playerActionId: 'action1',
                                    opponentActionId: 'action2',
                                    nextSituationId: 'neutral',
                                    resourceConsumptions: [],
                                },
                            ],
                        },
                    ],
                    terminalSituations: [
                        {
                            situationId: 'neutral',
                            name: 'Neutral',
                            description: 'Neutral terminal situation',
                            cornerState: CornerState.UNKNOWN,
                        },
                    ],
                    initialDynamicState: {
                        resources: [
                            { resourceType: ResourceType.PLAYER_HEALTH, value: 6000 },
                            { resourceType: ResourceType.OPPONENT_HEALTH, value: 4000 },
                        ],
                    },
                    // rewardComputationMethod is not specified
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

                // Default behavior: win probability without corner penalty
                // Win probability = 6000 / (6000 + 4000) = 0.6
                // Reward = 0.6 * 20000 - 10000 = 2000
                expect(nextNode.playerReward!.value).toBeCloseTo(2000, 1);
                expect(nextNode.opponentReward!.value).toBeCloseTo(-2000, 1);
            });
        });
    });
});
