import { buildGameTree, GameTreeBuildErrorCode } from './game-tree-builder';
import {
    GameDefinition,
    Situation,
    TerminalSituation,
    Transition,
    ResourceType,
    CornerState,
    RewardComputationMethod,
} from '@nomari/ts-proto';

// =============================================================================
// Test Helpers: Build GameDefinition with sensible defaults
// =============================================================================

/**
 * Default health values for testing
 */
const DEFAULT_PLAYER_HP = 5000;
const DEFAULT_OPPONENT_HP = 4000;

/**
 * Create initial dynamic state with given health values
 */
function initialState(playerHp: number = DEFAULT_PLAYER_HP, opponentHp: number = DEFAULT_OPPONENT_HP) {
    return {
        resources: [
            { resourceType: ResourceType.PLAYER_HEALTH, value: playerHp },
            { resourceType: ResourceType.OPPONENT_HEALTH, value: opponentHp },
        ],
    };
}

/**
 * Create a simple action with auto-generated ID
 */
let actionIdCounter = 1000;
function act(name: string, id?: number) {
    return { actionId: id ?? actionIdCounter++, name, description: name };
}

/**
 * Create a transition with optional resource consumption
 */
function trans(
    playerActionId: number,
    opponentActionId: number,
    nextSituationId: number,
    damage?: { player?: number; opponent?: number }
): Transition {
    const consumptions = [];
    if (damage?.player) {
        consumptions.push({ resourceType: ResourceType.PLAYER_HEALTH, value: damage.player });
    }
    if (damage?.opponent) {
        consumptions.push({ resourceType: ResourceType.OPPONENT_HEALTH, value: damage.opponent });
    }
    return {
        playerActionId,
        opponentActionId,
        nextSituationId,
        resourceConsumptions: consumptions,
        resourceRequirements: [],
    };
}

/**
 * Create a situation with one player action and one opponent action
 */
function simpleSituation(
    id: number,
    nextSituationId: number,
    damage?: { player?: number; opponent?: number }
): Situation {
    const pAction = act('Action1', id * 10 + 1);
    const oAction = act('Action2', id * 10 + 2);
    return {
        situationId: id,
        name: `Situation ${id}`,
        playerActions: { actions: [pAction] },
        opponentActions: { actions: [oAction] },
        transitions: [trans(pAction.actionId, oAction.actionId, nextSituationId, damage)],
    };
}

/**
 * Reward computation methods
 */
const WIN_PROBABILITY_METHOD = (cornerBonus: number = 0): RewardComputationMethod => ({
    method: { oneofKind: 'winProbability', winProbability: { cornerBonus, odGaugeBonus: 0, saGaugeBonus: 0 } },
});

const DAMAGE_RACE_METHOD: RewardComputationMethod = {
    method: { oneofKind: 'damageRace', damageRace: {} },
};

/**
 * Base GameDefinition with sensible defaults.
 * Override specific fields as needed for each test.
 */
function baseGameDef(overrides: Partial<GameDefinition> = {}): GameDefinition {
    return {
        gameId: 1,
        name: 'Test Game',
        description: 'Test',
        rootSituationId: 101,
        situations: [],
        terminalSituations: [],
        initialDynamicState: initialState(),
        playerComboStarters: [],
        opponentComboStarters: [],
        ...overrides,
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
            const game = baseGameDef({
                situations: [simpleSituation(101, 200)],
                terminalSituations: [{ situationId: 200, name: 'End', description: 'End' }],
            });

            const result = buildGameTree(game);

            expect(result.success).toBe(true);
            if (!result.success) throw new Error(result.error.message);

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
            // 101 -> 102 -> 101 (no damage = infinite loop)
            const game = baseGameDef({
                situations: [
                    simpleSituation(101, 102),
                    simpleSituation(102, 101),
                ],
            });

            const result = buildGameTree(game);

            expect(result.success).toBe(false);
            if (result.success) throw new Error('Expected failure');
            expect(result.error.code).toBe(GameTreeBuildErrorCode.CYCLE_DETECTED);
        });

        it('allows cycle when state changes each iteration', () => {
            // 101 -> 102 -> 101 with damage each step (eventually someone dies)
            const game = baseGameDef({
                situations: [
                    simpleSituation(101, 102, { opponent: 100 }),
                    simpleSituation(102, 101, { player: 100 }),
                ],
            });

            const result = buildGameTree(game);

            expect(result.success).toBe(true);
            if (!result.success) throw new Error(result.error.message);
            expect(result.gameTree.root).toBeDefined();
        });
    });

    // =========================================================================
    // Automatic terminal creation (win/lose/draw)
    // =========================================================================

    describe('auto-terminal creation', () => {
        it('creates WIN terminal when opponent HP reaches 0', () => {
            // Deal 5000 damage to 4000 HP opponent -> kills
            const game = baseGameDef({
                situations: [simpleSituation(101, 102, { opponent: 5000 })],
                rewardComputationMethod: WIN_PROBABILITY_METHOD(),
            });

            const result = buildGameTree(game);

            expect(result.success).toBe(true);
            if (!result.success) throw new Error(result.error.message);

            const rootNode = result.gameTree.nodes[result.gameTree.root];
            const terminalNode = result.gameTree.nodes[rootNode.transitions[0].nextNodeId!];
            expect(terminalNode.playerReward!.value).toBe(10000); // Win
            expect(terminalNode.opponentReward!.value).toBe(-10000);
        });

        it('creates LOSE terminal when player HP reaches 0', () => {
            // Deal 6000 damage to 5000 HP player -> player dies
            const game = baseGameDef({
                situations: [simpleSituation(101, 102, { player: 6000 })],
                rewardComputationMethod: WIN_PROBABILITY_METHOD(),
            });

            const result = buildGameTree(game);

            expect(result.success).toBe(true);
            if (!result.success) throw new Error(result.error.message);

            const rootNode = result.gameTree.nodes[result.gameTree.root];
            const terminalNode = result.gameTree.nodes[rootNode.transitions[0].nextNodeId!];
            expect(terminalNode.playerReward!.value).toBe(-10000); // Lose
            expect(terminalNode.opponentReward!.value).toBe(10000);
        });

        it('creates DRAW terminal when both HP reach 0', () => {
            const game = baseGameDef({
                situations: [simpleSituation(101, 102, { player: 6000, opponent: 5000 })],
                rewardComputationMethod: WIN_PROBABILITY_METHOD(),
            });

            const result = buildGameTree(game);

            expect(result.success).toBe(true);
            if (!result.success) throw new Error(result.error.message);

            const rootNode = result.gameTree.nodes[result.gameTree.root];
            const terminalNode = result.gameTree.nodes[rootNode.transitions[0].nextNodeId!];
            expect(terminalNode.playerReward!.value).toBeCloseTo(0, 5);
        });
    });

    // =========================================================================
    // Neutral terminal situations
    // =========================================================================

    describe('neutral terminal situations', () => {
        it('calculates reward based on remaining HP', () => {
            // Equal HP -> 50% win prob -> reward = 0
            const game = baseGameDef({
                initialDynamicState: initialState(4000, 4000),
                situations: [simpleSituation(101, 200)],
                terminalSituations: [{ situationId: 200, name: 'Neutral', description: 'Neutral', cornerState: CornerState.NONE }],
                rewardComputationMethod: WIN_PROBABILITY_METHOD(),
            });

            const result = buildGameTree(game);

            expect(result.success).toBe(true);
            if (!result.success) throw new Error(result.error.message);

            const rootNode = result.gameTree.nodes[result.gameTree.root];
            const terminalNode = result.gameTree.nodes[rootNode.transitions[0].nextNodeId!];
            expect(terminalNode.playerReward!.value).toBeCloseTo(0, 1);
        });
    });

    // =========================================================================
    // Damage race reward computation
    // =========================================================================

    describe('damage race rewards', () => {
        it('calculates based on damage dealt - damage received', () => {
            // Deal 1000 to opponent, receive 500 -> net +500
            const game = baseGameDef({
                situations: [simpleSituation(101, 200, { player: 500, opponent: 1000 })],
                terminalSituations: [{ situationId: 200, name: 'End', description: 'End', cornerState: CornerState.UNKNOWN }],
                rewardComputationMethod: DAMAGE_RACE_METHOD,
            });

            const result = buildGameTree(game);

            expect(result.success).toBe(true);
            if (!result.success) throw new Error(result.error.message);

            const rootNode = result.gameTree.nodes[result.gameTree.root];
            const terminalNode = result.gameTree.nodes[rootNode.transitions[0].nextNodeId!];
            expect(terminalNode.playerReward!.value).toBe(500);
            expect(terminalNode.opponentReward!.value).toBe(-500);
        });

        it('returns 0 for draw (equal damage)', () => {
            // Both deal 5000 damage (kills both) -> draw
            const game = baseGameDef({
                initialDynamicState: initialState(5000, 5000),
                situations: [simpleSituation(101, 102, { player: 5000, opponent: 5000 })],
                rewardComputationMethod: DAMAGE_RACE_METHOD,
            });

            const result = buildGameTree(game);

            expect(result.success).toBe(true);
            if (!result.success) throw new Error(result.error.message);

            const rootNode = result.gameTree.nodes[result.gameTree.root];
            const terminalNode = result.gameTree.nodes[rootNode.transitions[0].nextNodeId!];
            expect(terminalNode.playerReward!.value).toBeCloseTo(0, 5);
        });

        it('win: player kills opponent', () => {
            const game = baseGameDef({
                initialDynamicState: initialState(2000, 2000),
                situations: [simpleSituation(101, 102, { opponent: 2000 })],
                rewardComputationMethod: DAMAGE_RACE_METHOD,
            });

            const result = buildGameTree(game);

            expect(result.success).toBe(true);
            if (!result.success) throw new Error(result.error.message);

            const rootNode = result.gameTree.nodes[result.gameTree.root];
            const terminalNode = result.gameTree.nodes[rootNode.transitions[0].nextNodeId!];
            expect(terminalNode.playerReward!.value).toBe(2000);
        });

        it('lose: opponent kills player', () => {
            const game = baseGameDef({
                initialDynamicState: initialState(2000, 2000),
                situations: [simpleSituation(101, 102, { player: 2000 })],
                rewardComputationMethod: DAMAGE_RACE_METHOD,
            });

            const result = buildGameTree(game);

            expect(result.success).toBe(true);
            if (!result.success) throw new Error(result.error.message);

            const rootNode = result.gameTree.nodes[result.gameTree.root];
            const terminalNode = result.gameTree.nodes[rootNode.transitions[0].nextNodeId!];
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
            const game = baseGameDef({
                initialDynamicState: initialState(playerHp, opponentHp),
                situations: [simpleSituation(101, 200)],
                terminalSituations: [{ situationId: 200, name: 'End', description: 'End', cornerState }],
                rewardComputationMethod: WIN_PROBABILITY_METHOD(cornerBonus),
            });
            const result = buildGameTree(game);
            if (!result.success) throw new Error(result.error.message);
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
    // Resource consumption
    // =========================================================================

    describe('resource consumption', () => {
        it('creates different nodes for different states', () => {
            // Situation 101 -> 102 with opponent damage
            const pAction = act('Attack', 2001);
            const oAction = act('Guard', 2002);
            const game = baseGameDef({
                situations: [
                    {
                        situationId: 101,
                        name: 'Attack',
                        playerActions: { actions: [pAction] },
                        opponentActions: { actions: [oAction] },
                        transitions: [trans(pAction.actionId, oAction.actionId, 102, { opponent: 2000 })],
                    },
                    {
                        situationId: 102,
                        name: 'Next',
                        playerActions: { actions: [act('A', 1001)] },
                        opponentActions: { actions: [act('B', 1002)] },
                        transitions: [], // Dead end -> creates terminal
                    },
                ],
            });

            const result = buildGameTree(game);

            expect(result.success).toBe(true);
            if (!result.success) throw new Error(result.error.message);

            // Transition exists
            const rootNode = result.gameTree.nodes[result.gameTree.root];
            const transition = rootNode.transitions[0];
            expect(transition.nextNodeId).toBeDefined();

            // Next node is not terminal (has actions)
            const nextNode = result.gameTree.nodes[transition.nextNodeId!];
            expect(nextNode.playerReward).toBeUndefined();
        });
    });
});
