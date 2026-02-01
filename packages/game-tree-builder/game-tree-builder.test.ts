import { buildGameTree, GameTreeBuildErrorCode } from './game-tree-builder';
import {
    Scenario,
    Situation,
    Transition,
    Action,
    ComboStarter,
    ResourceType,
    ActionType,
    CornerState,
    RewardComputationMethod,
} from '@nomari/ts-proto';

// =============================================================================
// Test Helpers: Build Scenario with sensible defaults
// =============================================================================

/**
 * Default health values for testing
 */
const DEFAULT_PLAYER_HP = 5000;
const DEFAULT_OPPONENT_HP = 4000;

/**
 * Create initial dynamic state with given health values
 */
function initialState(
    playerHp: number = DEFAULT_PLAYER_HP,
    opponentHp: number = DEFAULT_OPPONENT_HP,
    options?: { playerOd?: number;
        opponentOd?: number;
        playerSa?: number;
        opponentSa?: number }
) {
    const resources = [
        {
            resourceType: ResourceType.PLAYER_HEALTH,
            value: playerHp 
        },
        {
            resourceType: ResourceType.OPPONENT_HEALTH,
            value: opponentHp 
        },
    ];
    if (options?.playerOd !== undefined) {
        resources.push({
            resourceType: ResourceType.PLAYER_OD_GAUGE,
            value: options.playerOd 
        });
    }
    if (options?.opponentOd !== undefined) {
        resources.push({
            resourceType: ResourceType.OPPONENT_OD_GAUGE,
            value: options.opponentOd 
        });
    }
    if (options?.playerSa !== undefined) {
        resources.push({
            resourceType: ResourceType.PLAYER_SA_GAUGE,
            value: options.playerSa 
        });
    }
    if (options?.opponentSa !== undefined) {
        resources.push({
            resourceType: ResourceType.OPPONENT_SA_GAUGE,
            value: options.opponentSa 
        });
    }
    return {
        resources 
    };
}

/**
 * Create a simple action with auto-generated ID
 */
let actionIdCounter = 1000;
function act(
    name: string,
    id?: number,
    actionType: ActionType = ActionType.NORMAL
): Action {
    return {
        actionId: id ?? actionIdCounter++,
        name,
        description: name,
        actionType,
    };
}

/**
 * Create a transition
 */
function trans(
    playerActionId: number,
    opponentActionId: number,
    nextSituationId: number
): Transition {
    return {
        playerActionId,
        opponentActionId,
        nextSituationId,
    };
}

/**
 * Create a situation with one player action and one opponent action
 * Returns both the situation and the actions used (for adding to scenario)
 */
function simpleSituation(
    id: number,
    nextSituationId: number
): { situation: Situation;
    playerAction: Action;
    opponentAction: Action } {
    const playerAction = act('Action1', id * 10 + 1);
    const opponentAction = act('Action2', id * 10 + 2);
    return {
        situation: {
            situationId: id,
            name: `Situation ${id}`,
            playerActionIds: [playerAction.actionId],
            opponentActionIds: [opponentAction.actionId],
            transitions: [trans(playerAction.actionId, opponentAction.actionId, nextSituationId)],
        },
        playerAction,
        opponentAction,
    };
}

/**
 * Reward computation methods
 */
const WIN_PROBABILITY_METHOD = (cornerBonus: number = 0): RewardComputationMethod => ({
    method: {
        oneofKind: 'winProbability',
        winProbability: {
            cornerBonus,
            odGaugeBonus: 0,
            saGaugeBonus: 0,
        },
    },
});

const DAMAGE_RACE_METHOD: RewardComputationMethod = {
    method: {
        oneofKind: 'damageRace',
        damageRace: {},
    },
};

/**
 * Base Scenario with sensible defaults.
 * Override specific fields as needed for each test.
 */
interface ScenarioOverrides extends Partial<Omit<Scenario, 'player' | 'opponent'>> {
    playerActions?: Action[];
    opponentActions?: Action[];
    playerComboStarters?: ComboStarter[];
    opponentComboStarters?: ComboStarter[];
}

function baseScenario(overrides: ScenarioOverrides = {}): Scenario {
    const {
        playerActions = [],
        opponentActions = [],
        playerComboStarters = [],
        opponentComboStarters = [],
        ...rest
    } = overrides;

    return {
        gameId: 1,
        name: 'Test Game',
        description: 'Test',
        rootSituationId: 101,
        situations: [],
        terminalSituations: [],
        initialDynamicState: initialState(),
        player: {
            name: 'Player',
            actions: playerActions,
            comboStarters: playerComboStarters,
        },
        opponent: {
            name: 'Opponent',
            actions: opponentActions,
            comboStarters: opponentComboStarters,
        },
        ...rest,
    };
}

// =============================================================================
// Tests
// =============================================================================

describe('gameTreeBuilder', () => {
    // =========================================================================
    // Basic tree generation
    // =========================================================================

    describe('basic game tree generation', () => {
        it('creates simple tree: situation -> terminal', () => {
            const { situation, playerAction, opponentAction } = simpleSituation(101, 200);
            const game = baseScenario({
                situations: [situation],
                terminalSituations: [{
                    situationId: 200,
                    name: 'End',
                    description: 'End',
                }],
                playerActions: [playerAction],
                opponentActions: [opponentAction],
            });

            const result = buildGameTree(game);

            expect(result.success).toBe(true);
            if (!result.success) {
                throw new Error(result.error.message);
            }

            const { gameTree } = result;
            expect(gameTree.id).toBe(1);
            expect(gameTree.nodes[gameTree.root]).toBeDefined();

            // Root has transition to terminal
            const rootNode = gameTree.nodes[gameTree.root];
            expect(rootNode.transitions.length).toBe(1);
            const terminalNode = gameTree.nodes[rootNode.transitions[0].nextNodeId!];
            expect(terminalNode.playerReward).toBeDefined();
        });
    });

    // =========================================================================
    // Cycle detection
    // =========================================================================

    describe('cycle detection', () => {
        it('fails when cycle has no state change', () => {
            // 101 -> 102 -> 101 (no state change = infinite loop)
            const s1 = simpleSituation(101, 102);
            const s2 = simpleSituation(102, 101);
            const game = baseScenario({
                situations: [s1.situation, s2.situation],
                playerActions: [s1.playerAction, s2.playerAction],
                opponentActions: [s1.opponentAction, s2.opponentAction],
            });

            const result = buildGameTree(game);

            expect(result.success).toBe(false);
            if (result.success) {
                throw new Error('Expected failure');
            }
            expect(result.error.code).toBe(GameTreeBuildErrorCode.CYCLE_DETECTED);
        });

        it('allows cycle when state changes via OD action', () => {
            // 101 -> 102 -> 101 with OD usage each step (state changes due to gauge consumption)
            const pAction1 = act('OD Attack', 1011, ActionType.OD);
            const oAction1 = act('Guard', 1012);
            const pAction2 = act('Normal', 1021);
            const oAction2 = act('OD Counter', 1022, ActionType.OD);

            const game = baseScenario({
                initialDynamicState: initialState(5000, 4000, {
                    playerOd: 6,
                    opponentOd: 6 
                }),
                situations: [
                    {
                        situationId: 101,
                        name: 'Situation 101',
                        playerActionIds: [pAction1.actionId],
                        opponentActionIds: [oAction1.actionId],
                        transitions: [trans(pAction1.actionId, oAction1.actionId, 102)],
                    },
                    {
                        situationId: 102,
                        name: 'Situation 102',
                        playerActionIds: [pAction2.actionId],
                        opponentActionIds: [oAction2.actionId],
                        transitions: [trans(pAction2.actionId, oAction2.actionId, 101)],
                    },
                ],
                playerActions: [pAction1, pAction2],
                opponentActions: [oAction1, oAction2],
            });

            const result = buildGameTree(game);

            expect(result.success).toBe(true);
            if (!result.success) {
                throw new Error(result.error.message);
            }
            expect(result.gameTree.root).toBeDefined();
        });
    });

    // =========================================================================
    // Automatic terminal creation via ComboStarter (win/lose/draw)
    // =========================================================================

    describe('auto-terminal creation via ComboStarter', () => {
        it('creates WIN terminal when opponent HP reaches 0 via combo', () => {
            // Situation -> ComboStarter that deals 5000 damage to 4000 HP opponent -> kills
            const s = simpleSituation(101, 1001);
            const game = baseScenario({
                situations: [s.situation],
                playerActions: [s.playerAction],
                opponentActions: [s.opponentAction],
                playerComboStarters: [{
                    situationId: 1001,
                    name: 'Kill Combo',
                    description: '',
                    routes: [{
                        name: 'Full damage',
                        requirements: [],
                        consumptions: [{
                            resourceType: ResourceType.OPPONENT_HEALTH,
                            value: 5000 
                        }],
                        nextSituationId: 200,
                    }],
                }],
                terminalSituations: [{
                    situationId: 200,
                    name: 'End',
                    description: '' 
                }],
                rewardComputationMethod: WIN_PROBABILITY_METHOD(),
            });

            const result = buildGameTree(game);

            expect(result.success).toBe(true);
            if (!result.success) {
                throw new Error(result.error.message);
            }

            // Root -> ComboStarter -> Terminal (win)
            const rootNode = result.gameTree.nodes[result.gameTree.root];
            const comboNode = result.gameTree.nodes[rootNode.transitions[0].nextNodeId!];
            const terminalNode = result.gameTree.nodes[comboNode.transitions[0].nextNodeId!];
            expect(terminalNode.playerReward!.value).toBe(10000); // Win
            expect(terminalNode.opponentReward!.value).toBe(-10000);
        });

        it('creates LOSE terminal when player HP reaches 0 via opponent combo', () => {
            // Situation -> OpponentComboStarter that deals 6000 damage to 5000 HP player -> dies
            const s = simpleSituation(101, 2001);
            const game = baseScenario({
                situations: [s.situation],
                playerActions: [s.playerAction],
                opponentActions: [s.opponentAction],
                opponentComboStarters: [{
                    situationId: 2001,
                    name: 'Kill Combo',
                    description: '',
                    routes: [{
                        name: 'Full damage',
                        requirements: [],
                        consumptions: [{
                            resourceType: ResourceType.PLAYER_HEALTH,
                            value: 6000 
                        }],
                        nextSituationId: 200,
                    }],
                }],
                terminalSituations: [{
                    situationId: 200,
                    name: 'End',
                    description: '' 
                }],
                rewardComputationMethod: WIN_PROBABILITY_METHOD(),
            });

            const result = buildGameTree(game);

            expect(result.success).toBe(true);
            if (!result.success) {
                throw new Error(result.error.message);
            }

            const rootNode = result.gameTree.nodes[result.gameTree.root];
            const comboNode = result.gameTree.nodes[rootNode.transitions[0].nextNodeId!];
            const terminalNode = result.gameTree.nodes[comboNode.transitions[0].nextNodeId!];
            expect(terminalNode.playerReward!.value).toBe(-10000); // Lose
            expect(terminalNode.opponentReward!.value).toBe(10000);
        });
    });

    // =========================================================================
    // Neutral terminal situations
    // =========================================================================

    describe('neutral terminal situations', () => {
        it('calculates reward based on remaining HP', () => {
            // Equal HP -> 50% win prob -> reward = 0
            const s = simpleSituation(101, 200);
            const game = baseScenario({
                initialDynamicState: initialState(4000, 4000),
                situations: [s.situation],
                playerActions: [s.playerAction],
                opponentActions: [s.opponentAction],
                terminalSituations: [{
                    situationId: 200,
                    name: 'Neutral',
                    description: 'Neutral',
                    cornerState: CornerState.NONE,
                }],
                rewardComputationMethod: WIN_PROBABILITY_METHOD(),
            });

            const result = buildGameTree(game);

            expect(result.success).toBe(true);
            if (!result.success) {
                throw new Error(result.error.message);
            }

            const rootNode = result.gameTree.nodes[result.gameTree.root];
            const terminalNode = result.gameTree.nodes[rootNode.transitions[0].nextNodeId!];
            expect(terminalNode.playerReward!.value).toBeCloseTo(0, 1);
        });
    });

    // =========================================================================
    // Damage race reward computation (via ComboStarter)
    // =========================================================================

    describe('damage race rewards', () => {
        it('calculates based on damage dealt - damage received via combos', () => {
            // Deal 1000 to opponent via combo -> net +1000
            const s = simpleSituation(101, 1001);
            const game = baseScenario({
                situations: [s.situation],
                playerActions: [s.playerAction],
                opponentActions: [s.opponentAction],
                playerComboStarters: [{
                    situationId: 1001,
                    name: 'Combo',
                    description: '',
                    routes: [{
                        name: 'Damage',
                        requirements: [],
                        consumptions: [{
                            resourceType: ResourceType.OPPONENT_HEALTH,
                            value: 1000 
                        }],
                        nextSituationId: 200,
                    }],
                }],
                terminalSituations: [{
                    situationId: 200,
                    name: 'End',
                    description: 'End',
                    cornerState: CornerState.UNKNOWN,
                }],
                rewardComputationMethod: DAMAGE_RACE_METHOD,
            });

            const result = buildGameTree(game);

            expect(result.success).toBe(true);
            if (!result.success) {
                throw new Error(result.error.message);
            }

            const rootNode = result.gameTree.nodes[result.gameTree.root];
            const comboNode = result.gameTree.nodes[rootNode.transitions[0].nextNodeId!];
            const terminalNode = result.gameTree.nodes[comboNode.transitions[0].nextNodeId!];
            expect(terminalNode.playerReward!.value).toBe(1000);
            expect(terminalNode.opponentReward!.value).toBe(-1000);
        });

        it('win: player kills opponent via combo', () => {
            const s = simpleSituation(101, 1001);
            const game = baseScenario({
                initialDynamicState: initialState(2000, 2000),
                situations: [s.situation],
                playerActions: [s.playerAction],
                opponentActions: [s.opponentAction],
                playerComboStarters: [{
                    situationId: 1001,
                    name: 'Kill Combo',
                    description: '',
                    routes: [{
                        name: 'Fatal',
                        requirements: [],
                        consumptions: [{
                            resourceType: ResourceType.OPPONENT_HEALTH,
                            value: 2000 
                        }],
                        nextSituationId: 200,
                    }],
                }],
                terminalSituations: [{
                    situationId: 200,
                    name: 'End',
                    description: '' 
                }],
                rewardComputationMethod: DAMAGE_RACE_METHOD,
            });

            const result = buildGameTree(game);

            expect(result.success).toBe(true);
            if (!result.success) {
                throw new Error(result.error.message);
            }

            const rootNode = result.gameTree.nodes[result.gameTree.root];
            const comboNode = result.gameTree.nodes[rootNode.transitions[0].nextNodeId!];
            const terminalNode = result.gameTree.nodes[comboNode.transitions[0].nextNodeId!];
            expect(terminalNode.playerReward!.value).toBe(2000);
        });

        it('lose: opponent kills player via combo', () => {
            const s = simpleSituation(101, 2001);
            const game = baseScenario({
                initialDynamicState: initialState(2000, 2000),
                situations: [s.situation],
                playerActions: [s.playerAction],
                opponentActions: [s.opponentAction],
                opponentComboStarters: [{
                    situationId: 2001,
                    name: 'Kill Combo',
                    description: '',
                    routes: [{
                        name: 'Fatal',
                        requirements: [],
                        consumptions: [{
                            resourceType: ResourceType.PLAYER_HEALTH,
                            value: 2000 
                        }],
                        nextSituationId: 200,
                    }],
                }],
                terminalSituations: [{
                    situationId: 200,
                    name: 'End',
                    description: '' 
                }],
                rewardComputationMethod: DAMAGE_RACE_METHOD,
            });

            const result = buildGameTree(game);

            expect(result.success).toBe(true);
            if (!result.success) {
                throw new Error(result.error.message);
            }

            const rootNode = result.gameTree.nodes[result.gameTree.root];
            const comboNode = result.gameTree.nodes[rootNode.transitions[0].nextNodeId!];
            const terminalNode = result.gameTree.nodes[comboNode.transitions[0].nextNodeId!];
            expect(terminalNode.playerReward!.value).toBe(-2000);
        });
    });

    // =========================================================================
    // Win probability with corner bonus
    // =========================================================================

    describe('win probability with corner', () => {
        const testWithCorner = (
            cornerState: CornerState,
            playerHp: number,
            opponentHp: number,
            cornerBonus: number
        ) => {
            const s = simpleSituation(101, 200);
            const game = baseScenario({
                initialDynamicState: initialState(playerHp, opponentHp),
                situations: [s.situation],
                playerActions: [s.playerAction],
                opponentActions: [s.opponentAction],
                terminalSituations: [{
                    situationId: 200,
                    name: 'End',
                    description: 'End',
                    cornerState,
                }],
                rewardComputationMethod: WIN_PROBABILITY_METHOD(cornerBonus),
            });
            const result = buildGameTree(game);
            if (!result.success) {
                throw new Error(result.error.message);
            }
            const rootNode = result.gameTree.nodes[result.gameTree.root];
            return result.gameTree.nodes[rootNode.transitions[0].nextNodeId!];
        };

        it('player in corner: opponent gets advantage', () => {
            // Player 6000 HP, opponent 4000 HP, corner bonus 1000
            // Without corner: player would have advantage
            // With player in corner: opponent gets +1000 damage -> evens out
            const terminal = testWithCorner(CornerState.PLAYER_IN_CORNER, 6000, 4000, 1000);
            expect(terminal.playerReward!.value).toBeCloseTo(0, 5);
        });

        it('opponent in corner: player gets advantage', () => {
            // Player 4000 HP, opponent 6000 HP, corner bonus 1000
            // Without corner: opponent would have advantage
            // With opponent in corner: player gets +1000 damage -> evens out
            const terminal = testWithCorner(CornerState.OPPONENT_IN_CORNER, 4000, 6000, 1000);
            expect(terminal.playerReward!.value).toBeCloseTo(0, 5);
        });

        it('NONE corner state: no bonus applied', () => {
            // Player 6000 HP, opponent 4000 HP -> player advantage
            const terminal = testWithCorner(CornerState.NONE, 6000, 4000, 1000);
            expect(terminal.playerReward!.value).toBe(2000); // Player wins more often
        });

        it('symmetric corner effects cancel out', () => {
            // 5000 vs 5000 HP with 3000 corner bonus
            // Player in corner -> negative reward
            const terminalPlayerCorner = testWithCorner(CornerState.PLAYER_IN_CORNER, 5000, 5000, 3000);
            // Opponent in corner -> positive reward
            const terminalOppCorner = testWithCorner(CornerState.OPPONENT_IN_CORNER, 5000, 5000, 3000);

            expect(terminalPlayerCorner.playerReward!.value).toBeLessThan(0);
            expect(terminalOppCorner.playerReward!.value).toBeGreaterThan(0);
            // Symmetric: |reward| should be equal
            expect(Math.abs(terminalPlayerCorner.playerReward!.value))
                .toBeCloseTo(Math.abs(terminalOppCorner.playerReward!.value), 0);
        });

        it('HP advantage overcomes corner disadvantage', () => {
            // Player 10000 HP vs opponent 1 HP, player in corner
            // Even with corner penalty, player should win easily
            const terminal = testWithCorner(CornerState.PLAYER_IN_CORNER, 10000, 1, 1000);
            expect(terminal.playerReward!.value).toBe(6000);
        });

        it('HP disadvantage overcomes corner advantage', () => {
            // Player 1 HP vs opponent 10000 HP, opponent in corner
            // Even with corner bonus, player should lose
            const terminal = testWithCorner(CornerState.OPPONENT_IN_CORNER, 1, 10000, 1000);
            expect(terminal.playerReward!.value).toBe(-6000);
        });
    });

    // =========================================================================
    // Action resource consumption (OD/SA gauge)
    // =========================================================================

    describe('action resource consumption', () => {
        it('creates different nodes for different gauge states', () => {
            // OD action consumes gauge, creating different state
            const pAction = act('OD Attack', 2001, ActionType.OD);
            const oAction = act('Guard', 2002);
            const pAction2 = act('Normal', 1001);
            const oAction2 = act('Block', 1002);

            const game = baseScenario({
                initialDynamicState: initialState(5000, 4000, {
                    playerOd: 6 
                }),
                situations: [
                    {
                        situationId: 101,
                        name: 'Attack',
                        playerActionIds: [pAction.actionId],
                        opponentActionIds: [oAction.actionId],
                        transitions: [trans(pAction.actionId, oAction.actionId, 102)],
                    },
                    {
                        situationId: 102,
                        name: 'Next',
                        playerActionIds: [pAction2.actionId],
                        opponentActionIds: [oAction2.actionId],
                        transitions: [trans(pAction2.actionId, oAction2.actionId, 200)],
                    },
                ],
                playerActions: [pAction, pAction2],
                opponentActions: [oAction, oAction2],
                terminalSituations: [{
                    situationId: 200,
                    name: 'End',
                    description: '' 
                }],
            });

            const result = buildGameTree(game);

            expect(result.success).toBe(true);
            if (!result.success) {
                throw new Error(result.error.message);
            }

            // Transition exists
            const rootNode = result.gameTree.nodes[result.gameTree.root];
            expect(rootNode.state.playerOd).toBe(6); // Initial OD
            const transition = rootNode.transitions[0];
            expect(transition.nextNodeId).toBeDefined();

            // Next node has reduced OD gauge
            const nextNode = result.gameTree.nodes[transition.nextNodeId!];
            expect(nextNode.state.playerOd).toBe(4); // 6 - 2 = 4
        });

        it('filters unavailable actions based on gauge requirements', () => {
            // SA3 action requires SA >= 3, but we only have 2
            const pAction = act('SA3 Super', 2001, ActionType.SA3);
            const pAction2 = act('Normal', 2003);
            const oAction = act('Guard', 2002);

            const game = baseScenario({
                initialDynamicState: initialState(5000, 4000, {
                    playerSa: 2 
                }),
                situations: [
                    {
                        situationId: 101,
                        name: 'Choice',
                        playerActionIds: [pAction.actionId, pAction2.actionId],
                        opponentActionIds: [oAction.actionId],
                        transitions: [
                            trans(pAction.actionId, oAction.actionId, 200), // SA3 - filtered out
                            trans(pAction2.actionId, oAction.actionId, 200), // Normal - available
                        ],
                    },
                ],
                playerActions: [pAction, pAction2],
                opponentActions: [oAction],
                terminalSituations: [{
                    situationId: 200,
                    name: 'End',
                    description: '' 
                }],
            });

            const result = buildGameTree(game);

            expect(result.success).toBe(true);
            if (!result.success) {
                throw new Error(result.error.message);
            }

            // Only one transition should be available (SA3 is filtered out)
            const rootNode = result.gameTree.nodes[result.gameTree.root];
            expect(rootNode.transitions.length).toBe(1);
            expect(rootNode.transitions[0].playerActionId).toBe(pAction2.actionId);
        });
    });
});
