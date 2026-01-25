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
            it('should calculate rewards based on win probability with corner penalty when player is in corner', () => {
                const gameDefinition: GameDefinition = {
                    gameId: 13,
                    name: 'Corner Penalty Game',
                    description: 'A game with corner penalty',
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
                                // HP1000 worth of penalty
                                cornerPenalty: 1000, 
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

                // Score = 6000 - 4000 - 1000 = 1000 (player in corner, so subtract penalty)
                // Win probability = 1 / (1 + exp(-0.0003 * 1000)) ≈ 0.5744
                // Reward = 0.5744 * 20000 - 10000 ≈ 1488
                expect(nextNode.playerReward!.value).toBeCloseTo(1489, 0);
                expect(nextNode.opponentReward!.value).toBeCloseTo(-1489, 0);
            });

            it('should calculate rewards based on win probability with corner bonus when opponent is in corner', () => {
                const gameDefinition: GameDefinition = {
                    gameId: 14,
                    name: 'Corner Bonus Game',
                    description: 'A game with corner bonus',
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
                                // HP1000 worth of bonus (opponent in corner)
                                cornerPenalty: 1000, 
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

                // Score = 4000 - 6000 + 1000 = -1000 (opponent in corner, so add bonus)
                // Win probability = 1 / (1 + exp(-0.0003 * -1000)) ≈ 0.4256
                // Reward = 0.4256 * 20000 - 10000 ≈ -1488
                expect(nextNode.playerReward!.value).toBeCloseTo(-1489, 0);
                expect(nextNode.opponentReward!.value).toBeCloseTo(1489, 0);
            });

            it('should not apply corner penalty when corner state is NONE', () => {
                const gameDefinition: GameDefinition = {
                    gameId: 15,
                    name: 'No Corner Penalty Game',
                    description: 'A game without corner penalty',
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
                                cornerPenalty: 1000 
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

                // Score = 6000 - 4000 = 2000 (no corner penalty applied)
                // Win probability = 1 / (1 + exp(-0.0003 * 2000)) ≈ 0.6457
                // Reward = 0.6457 * 20000 - 10000 ≈ 2913
                expect(nextNode.playerReward!.value).toBeCloseTo(2913, 0);
                expect(nextNode.opponentReward!.value).toBeCloseTo(-2913, 0);
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
                                cornerPenalty: 3000,
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
                                cornerPenalty: 3000, 
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

            it('should keep probability at 100% even when player is in corner', () => {
                const gameDefinition: GameDefinition = {
                    gameId: 18,
                    name: 'Max Probability Corner Game',
                    description: 'A game with 100% win probability and corner penalty',
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
                                // HP1000 worth of penalty
                                cornerPenalty: 1000, 
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

                // Score = 10000 - 1 - 1000 = 8999
                // Win probability = 1 / (1 + exp(-0.0003 * 8999)) ≈ 0.9999 (very close to 100%)
                // Reward ≈ 0.9999 * 20000 - 10000 ≈ 9998 (sigmoid saturates at high values)
                expect(nextNode.playerReward!.value).toBeGreaterThan(8000);
                expect(nextNode.opponentReward!.value).toBeLessThan(-8000);
            });

            it('should keep probability at 0% even when opponent is in corner', () => {
                const gameDefinition: GameDefinition = {
                    gameId: 19,
                    name: 'Min Probability Corner Game',
                    description: 'A game with 0% win probability and corner bonus',
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
                                // HP1000 worth of bonus (opponent in corner)
                                cornerPenalty: 1000, 
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

                // Score = 1 - 10000 + 1000 = -8999
                // Win probability = 1 / (1 + exp(-0.0003 * -8999)) ≈ 0.0001 (very close to 0%)
                // Reward ≈ 0.0001 * 20000 - 10000 ≈ -9998 (sigmoid saturates at low values)
                expect(nextNode.playerReward!.value).toBeLessThan(-8000);
                expect(nextNode.opponentReward!.value).toBeGreaterThan(8000);
            });

            it('should use default behavior when reward computation method is not specified', () => {
                const gameDefinition: GameDefinition = {
                    gameId: 20,
                    name: 'Default Reward Game',
                    description: 'A game with default reward computation',
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
                            cornerState: CornerState.UNKNOWN,
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
                    // rewardComputationMethod is not specified
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

                // Default behavior: win probability without corner penalty
                // Win probability = 6000 / (6000 + 4000) = 0.6
                // Reward = 0.6 * 20000 - 10000 = 2000
                expect(nextNode.playerReward!.value).toBeCloseTo(2000, 1);
                expect(nextNode.opponentReward!.value).toBeCloseTo(-2000, 1);
            });
        });
    });
});
