import { buildGameTree, GameTreeBuildErrorCode } from './game-tree-builder';
import {
    GameDefinition,
    ResourceType,
    TerminalSituationType,
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
                                { actionId: 'action1', name: '', description: 'Action 1', resourceConsumptions: [] },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                { actionId: 'action2', name: '', description: 'Action 2', resourceConsumptions: [] },
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
                                { actionId: 'action3', name: '', description: 'Action 3', resourceConsumptions: [] },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                { actionId: 'action4', name: '', description: 'Action 4', resourceConsumptions: [] },
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
                                { actionId: 'action1', name: '', description: 'Action 1', resourceConsumptions: [] },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                { actionId: 'action2', name: '', description: 'Action 2', resourceConsumptions: [] },
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
                        type: TerminalSituationType.NEUTRAL,
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
            if (firstTransition.nextNodeId) {
                const nextNode = gameTree.nodes[firstTransition.nextNodeId];
                expect(nextNode).toBeDefined();
                expect(nextNode.playerReward).toBeDefined();
                expect(nextNode.opponentReward).toBeDefined();
            }
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
                                { actionId: 'attack', name: '', description: 'Attack', resourceConsumptions: [] },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                { actionId: 'guard', name: '', description: 'Guard', resourceConsumptions: [] },
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
                                { actionId: 'action1', name: '', description: 'Action 1', resourceConsumptions: [] },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                { actionId: 'action2', name: '', description: 'Action 2', resourceConsumptions: [] },
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
            if (transition!.nextNodeId) {
                const nextNode = gameTree.nodes[transition!.nextNodeId];
                expect(nextNode).toBeDefined();
                expect(nextNode.playerReward).toBeUndefined();
                expect(nextNode.opponentReward).toBeUndefined();
            }

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
                                { actionId: 'attack', name: '', description: 'Attack', resourceConsumptions: [] },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                { actionId: 'guard', name: '', description: 'Guard', resourceConsumptions: [] },
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
            if (transition.nextNodeId) {
                const nextNode = gameTree.nodes[transition.nextNodeId];
                expect(nextNode).toBeDefined();
                expect(nextNode.playerReward).toBeDefined();
                expect(nextNode.playerReward!.value).toBe(10000);
                expect(nextNode.opponentReward).toBeDefined();
                expect(nextNode.opponentReward!.value).toBe(-10000);
            }
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
                                { actionId: 'guard', name: '', description: 'Guard', resourceConsumptions: [] },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                { actionId: 'attack', name: '', description: 'Attack', resourceConsumptions: [] },
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
            if (transition.nextNodeId) {
                const nextNode = gameTree.nodes[transition.nextNodeId];
                expect(nextNode).toBeDefined();
                expect(nextNode.playerReward).toBeDefined();
                expect(nextNode.playerReward!.value).toBe(-10000);
                expect(nextNode.opponentReward).toBeDefined();
                expect(nextNode.opponentReward!.value).toBe(10000);
            }
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
                                { actionId: 'attack', name: '', description: 'Attack', resourceConsumptions: [] },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                { actionId: 'attack', name: '', description: 'Attack', resourceConsumptions: [] },
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
            if (transition.nextNodeId) {
                const nextNode = gameTree.nodes[transition.nextNodeId];
                expect(nextNode).toBeDefined();
                expect(nextNode.playerReward).toBeDefined();
                expect(nextNode.opponentReward).toBeDefined();
                // Draw rewards should be calculated based on neutral calculation
                // Since both are 0, winProbability = 0.5, so reward = 0.5 * 20000 - 10000 = 0
                expect(nextNode.playerReward!.value).toBeCloseTo(0, 5);
                expect(nextNode.opponentReward!.value).toBeCloseTo(0, 5);
            }
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
                                { actionId: 'action1', name: '', description: 'Action 1', resourceConsumptions: [] },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                { actionId: 'action2', name: '', description: 'Action 2', resourceConsumptions: [] },
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
                        type: TerminalSituationType.NEUTRAL,
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
            if (transition.nextNodeId) {
                const nextNode = gameTree.nodes[transition.nextNodeId];
                expect(nextNode).toBeDefined();
                expect(nextNode.playerReward).toBeDefined();
                expect(nextNode.opponentReward).toBeDefined();

                // Win probability = 6000 / (6000 + 4000) = 0.6
                // Reward = 0.6 * 20000 - 10000 = 2000
                expect(nextNode.playerReward!.value).toBeCloseTo(2000, 1);
                expect(nextNode.opponentReward!.value).toBeCloseTo(-2000, 1);
            }
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
                                { actionId: 'action1', name: '', description: 'Action 1', resourceConsumptions: [] },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                { actionId: 'action2', name: '', description: 'Action 2', resourceConsumptions: [] },
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
                                { actionId: 'action3', name: '', description: 'Action 3', resourceConsumptions: [] },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                { actionId: 'action4', name: '', description: 'Action 4', resourceConsumptions: [] },
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

            // DynamicStateに変化がない循環参照はエラーになるべき
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
                                { actionId: 'action1', name: '', description: 'Action 1', resourceConsumptions: [] },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                { actionId: 'action2', name: '', description: 'Action 2', resourceConsumptions: [] },
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
                                { actionId: 'action3', name: '', description: 'Action 3', resourceConsumptions: [] },
                            ],
                        },
                        opponentActions: {
                            actions: [
                                { actionId: 'action4', name: '', description: 'Action 4', resourceConsumptions: [] },
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

            // DynamicStateが変化する循環参照は許可される（体力が減り続けるので、いずれ終端ノードに到達する）
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
});
