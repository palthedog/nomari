import { LPSolver } from './lp';
import { GameTree, Node, Action, NodeTransition, State } from '@nomari/game-tree/game-tree';

// =============================================================================
// Test Helpers: Build game trees from payoff matrices
// =============================================================================

/**
 * Creates a minimal State for testing (health values not used by LP solver)
 */
function emptyState(): State {
    return {
        playerHealth: 0,
        opponentHealth: 0,
        playerOd: 0,
        opponentOd: 0,
        playerSa: 0,
        opponentSa: 0 
    };
}

/**
 * Create an Action with the given ID and name
 */
function action(id: number, name: string): Action {
    return {
        actionId: id,
        name,
        description: name 
    };
}

/**
 * Creates a single-node matrix game from a payoff matrix.
 *
 * Payoff matrix format: rows = player actions, cols = opponent actions
 * Each cell is [playerReward, opponentReward] (zero-sum: typically [x, -x])
 *
 * Example - Rock Paper Scissors:
 *   createMatrixGame({
 *       actions: ['Rock', 'Paper', 'Scissors'],
 *       payoffs: [
 *           [0, -1,  1],  // Rock vs Rock/Paper/Scissors
 *           [1,  0, -1],  // Paper vs ...
 *           [-1, 1,  0],  // Scissors vs ...
 *       ],
 *   })
 */
function createMatrixGame(params: {
    actions: string[]; // Same actions for both players
    payoffs: number[][]; // payoffs[playerAction][opponentAction] = player reward
}): GameTree {
    const { actions: actionNames, payoffs } = params;

    const playerActions = actionNames.map((name, i) => action(i + 1, name));
    const oppActions = actionNames.map((name, i) => action(100 + i + 1, name));

    const nodes: Record<string, Node> = {};
    const transitions: NodeTransition[] = [];

    // Create terminal nodes and transitions
    for (let pIdx = 0; pIdx < playerActions.length; pIdx++) {
        for (let oIdx = 0; oIdx < oppActions.length; oIdx++) {
            const terminalId = `t_${pIdx}_${oIdx}`;
            const reward = payoffs[pIdx][oIdx];

            nodes[terminalId] = {
                nodeId: terminalId,
                description: `${actionNames[pIdx]} vs ${actionNames[oIdx]}`,
                state: emptyState(),
                transitions: [],
                playerReward: {
                    value: reward 
                },
                opponentReward: {
                    value: -reward 
                },
            };

            transitions.push({
                playerActionId: playerActions[pIdx].actionId,
                opponentActionId: oppActions[oIdx].actionId,
                nextNodeId: terminalId,
            });
        }
    }

    // Create root node
    nodes['root'] = {
        nodeId: 'root',
        description: 'Game Root',
        state: emptyState(),
        playerActions: {
            actions: playerActions 
        },
        opponentActions: {
            actions: oppActions 
        },
        transitions,
    };

    return {
        id: 1,
        root: 'root',
        nodes 
    };
}

/**
 * Creates an asymmetric matrix game where player and opponent have different actions.
 */
function createAsymmetricMatrixGame(params: {
    playerActions: string[];
    opponentActions: string[];
    payoffs: number[][]; // payoffs[playerIdx][opponentIdx] = player reward
}): GameTree {
    const { playerActions: pNames, opponentActions: oNames, payoffs } = params;

    const playerActions = pNames.map((name, i) => action(i + 1, name));
    const oppActions = oNames.map((name, i) => action(100 + i + 1, name));

    const nodes: Record<string, Node> = {};
    const transitions: NodeTransition[] = [];

    for (let pIdx = 0; pIdx < playerActions.length; pIdx++) {
        for (let oIdx = 0; oIdx < oppActions.length; oIdx++) {
            const terminalId = `t_${pIdx}_${oIdx}`;
            const reward = payoffs[pIdx][oIdx];

            nodes[terminalId] = {
                nodeId: terminalId,
                description: `${pNames[pIdx]} vs ${oNames[oIdx]}`,
                state: emptyState(),
                transitions: [],
                playerReward: {
                    value: reward 
                },
                opponentReward: {
                    value: -reward 
                },
            };

            transitions.push({
                playerActionId: playerActions[pIdx].actionId,
                opponentActionId: oppActions[oIdx].actionId,
                nextNodeId: terminalId,
            });
        }
    }

    nodes['root'] = {
        nodeId: 'root',
        description: 'Game Root',
        state: emptyState(),
        playerActions: {
            actions: playerActions 
        },
        opponentActions: {
            actions: oppActions 
        },
        transitions,
    };

    return {
        id: 1,
        root: 'root',
        nodes 
    };
}

// =============================================================================
// Test: Rock Paper Scissors
// =============================================================================
// Classic symmetric zero-sum game. Nash equilibrium: uniform 1/3 each.

describe('LPSolver', () => {
    describe('Rock Paper Scissors', () => {
        const rpsGame = createMatrixGame({
            actions: ['Rock', 'Paper', 'Scissors'],
            //              Rock  Paper  Scissors
            payoffs: [
                /* Rock     */ [0, -1, 1],
                /* Paper    */ [1, 0, -1],
                /* Scissors */ [-1, 1, 0],
            ],
        });

        it('converges to uniform 1/3 strategy', () => {
            const solver = new LPSolver(rpsGame);
            solver.solve();

            const strategy = solver.getRootStrategy()!;
            expect(strategy.get(1)).toBeCloseTo(1 / 3, 2); // Rock
            expect(strategy.get(2)).toBeCloseTo(1 / 3, 2); // Paper
            expect(strategy.get(3)).toBeCloseTo(1 / 3, 2); // Scissors
        });

        it('probabilities sum to 1', () => {
            const solver = new LPSolver(rpsGame);
            solver.solve();

            const strategy = solver.getRootStrategy()!;
            const total = Array.from(strategy.values()).reduce((a, b) => a + b, 0);
            expect(total).toBeCloseTo(1.0, 5);
        });

        it('all probabilities in valid range [0, 1]', () => {
            const solver = new LPSolver(rpsGame);
            solver.solve();

            const strategy = solver.getRootStrategy()!;
            for (const prob of strategy.values()) {
                expect(prob).toBeGreaterThanOrEqual(0);
                expect(prob).toBeLessThanOrEqual(1);
            }
        });
    });

    // =========================================================================
    // Test: Guriko Janken (weighted RPS)
    // =========================================================================
    // Japanese children's game where wins advance you by syllables of the hand name.
    // Rock wins -> advance 3 (gu-ri-ko), Paper wins -> advance 6 (pa-i-na-tsu-pu-ru)
    // Scissors wins -> advance 5 (chi-yo-ko-re-i-to)
    // Nash equilibrium: Rock=5/14, Scissors=6/14, Paper=3/14

    describe('Guriko Janken (weighted RPS)', () => {
        const gurikoGame = createMatrixGame({
            actions: ['Rock', 'Paper', 'Scissors'],
            //              Rock   Paper  Scissors
            payoffs: [
                /* Rock     */ [0, -6, 3], // lose to Paper(-6), beat Scissors(+3)
                /* Paper    */ [6, 0, -5], // beat Rock(+6), lose to Scissors(-5)
                /* Scissors */ [-3, 5, 0], // lose to Rock(-3), beat Paper(+5)
            ],
        });

        it('converges to expected equilibrium: Rock=5/14, Paper=3/14, Scissors=6/14', () => {
            const solver = new LPSolver(gurikoGame);
            solver.solve();

            const strategy = solver.getRootStrategy()!;
            expect(strategy.get(1)).toBeCloseTo(5 / 14, 2); // Rock
            expect(strategy.get(2)).toBeCloseTo(3 / 14, 2); // Paper
            expect(strategy.get(3)).toBeCloseTo(6 / 14, 2); // Scissors
        });
    });

    // =========================================================================
    // Test: Biased reward game (asymmetric actions)
    // =========================================================================
    // Player: Strike (high reward if opponent moves), Throw (beats guard)
    // Opponent: Guard (blocks strike), Throw Escape, Vertical Jump

    describe('Biased reward game', () => {
        const biasedGame = createAsymmetricMatrixGame({
            playerActions: ['Strike', 'Throw'],
            opponentActions: ['Guard', 'ThrowEscape', 'VerticalJump'],
            //                      Guard  ThrowEsc  VertJump
            payoffs: [
                /* Strike */ [0, 3000, 3000], // Strike beats escaping opponents
                /* Throw  */ [1000, 0, -3000], // Throw beats guard, loses to jump
            ],
        });

        it('prefers strike over throw due to higher expected value', () => {
            const solver = new LPSolver(biasedGame);
            solver.solve();

            const strategy = solver.getRootStrategy()!;
            const strikeProb = strategy.get(1)!;
            const throwProb = strategy.get(2)!;

            expect(strikeProb).toBeGreaterThan(throwProb);
        });

        it('uses mixed strategy (neither action is pure)', () => {
            const solver = new LPSolver(biasedGame);
            solver.solve();

            const strategy = solver.getRootStrategy()!;
            for (const prob of strategy.values()) {
                expect(prob).toBeGreaterThan(0.01);
                expect(prob).toBeLessThan(1.0);
            }
        });
    });

    // =========================================================================
    // Test: Single action edge cases
    // =========================================================================

    describe('single action nodes', () => {
        it('player with one action: uses 100% that action', () => {
            const game = createAsymmetricMatrixGame({
                playerActions: ['Attack'],
                opponentActions: ['Block', 'Dodge'],
                //                Block  Dodge
                payoffs: [
                    /* Attack */ [-100, 100],
                ],
            });

            const solver = new LPSolver(game);
            solver.solve();

            const strategy = solver.getRootStrategy()!;
            expect(strategy.get(1)).toBeCloseTo(1.0, 5);
        });

        it('opponent with one action: uses 100% that action', () => {
            const game = createAsymmetricMatrixGame({
                playerActions: ['Strike', 'Defend'],
                opponentActions: ['Wait'],
                //                Wait
                payoffs: [
                    /* Strike */ [100],
                    /* Defend */ [-100],
                ],
            });

            const solver = new LPSolver(game);
            solver.solve();

            const strategy = solver.getRootStrategy()!;
            // Player should always Strike (maximizes payoff against Wait)
            expect(strategy.get(1)).toBeCloseTo(1.0, 5);

            const oppStrategy = solver.getAverageOpponentStrategy('root')!;
            expect(oppStrategy.get(101)).toBeCloseTo(1.0, 5);
        });
    });

    // =========================================================================
    // Test: Multi-node game tree
    // =========================================================================

    describe('multi-node game tree', () => {
        it('propagates minimax value from child to parent correctly', () => {
            // Root: PathA -> child node (single action), PathB -> terminal(0)
            // Child: player has one action (Attack) vs opponent Block/Dodge
            // Block = -100, Dodge = +100 -> minimax value = -100
            // Player should prefer PathB (0) over PathA (-100)

            const nodes: Record<string, Node> = {};

            // Terminal nodes for child
            nodes['attack-block'] = {
                nodeId: 'attack-block',
                description: 'Attack vs Block',
                state: emptyState(),
                transitions: [],
                playerReward: {
                    value: -100 
                },
                opponentReward: {
                    value: 100 
                },
            };
            nodes['attack-dodge'] = {
                nodeId: 'attack-dodge',
                description: 'Attack vs Dodge',
                state: emptyState(),
                transitions: [],
                playerReward: {
                    value: 100 
                },
                opponentReward: {
                    value: -100 
                },
            };

            // Child node (single player action)
            nodes['child'] = {
                nodeId: 'child',
                description: 'Child',
                state: emptyState(),
                playerActions: {
                    actions: [action(10, 'Attack')] 
                },
                opponentActions: {
                    actions: [action(110, 'Block'), action(111, 'Dodge')] 
                },
                transitions: [
                    {
                        playerActionId: 10,
                        opponentActionId: 110,
                        nextNodeId: 'attack-block' 
                    },
                    {
                        playerActionId: 10,
                        opponentActionId: 111,
                        nextNodeId: 'attack-dodge' 
                    },
                ],
            };

            // Terminal for PathB
            nodes['terminal-b'] = {
                nodeId: 'terminal-b',
                description: 'PathB terminal',
                state: emptyState(),
                transitions: [],
                playerReward: {
                    value: 0 
                },
                opponentReward: {
                    value: 0 
                },
            };

            // Root node
            nodes['root'] = {
                nodeId: 'root',
                description: 'Root',
                state: emptyState(),
                playerActions: {
                    actions: [action(1, 'PathA'), action(2, 'PathB')] 
                },
                opponentActions: {
                    actions: [action(101, 'Pass')] 
                },
                transitions: [
                    {
                        playerActionId: 1,
                        opponentActionId: 101,
                        nextNodeId: 'child' 
                    },
                    {
                        playerActionId: 2,
                        opponentActionId: 101,
                        nextNodeId: 'terminal-b' 
                    },
                ],
            };

            const game: GameTree = {
                id: 1,
                root: 'root',
                nodes 
            };
            const solver = new LPSolver(game);
            solver.solve();

            const strategy = solver.getRootStrategy()!;
            // PathB (0 reward) is better than PathA (-100 minimax)
            expect(strategy.get(2)).toBeCloseTo(1.0, 5); // PathB
            expect(strategy.get(1)).toBeCloseTo(0.0, 5); // PathA
        });
    });

    // =========================================================================
    // Test: 2x2 mixed strategy game
    // =========================================================================
    // Payoff matrix:
    //        X     Y
    //   V    3    -1
    //   W   -1     2
    // Unique Nash equilibrium: p(V) = 3/7

    describe('2x2 mixed strategy equilibrium', () => {
        const game2x2 = createAsymmetricMatrixGame({
            playerActions: ['V', 'W'],
            opponentActions: ['X', 'Y'],
            //          X   Y
            payoffs: [
                /* V */ [3, -1],
                /* W */ [-1, 2],
            ],
        });

        it('finds correct equilibrium p(V) = 3/7', () => {
            const solver = new LPSolver(game2x2);
            solver.solve();

            const strategy = solver.getRootStrategy()!;
            expect(strategy.get(1)).toBeCloseTo(3 / 7, 2); // V
        });

        it('both actions have non-zero probability', () => {
            const solver = new LPSolver(game2x2);
            solver.solve();

            const strategy = solver.getRootStrategy()!;
            expect(strategy.get(1)).toBeGreaterThan(0.1);
            expect(strategy.get(2)).toBeGreaterThan(0.1);
        });
    });

    // =========================================================================
    // Test: Solver interface
    // =========================================================================

    describe('solver interface', () => {
        const simpleGame = createMatrixGame({
            actions: ['A', 'B'],
            payoffs: [
                [1, -1],
                [-1, 1],
            ],
        });

        it('has required methods', () => {
            const solver = new LPSolver(simpleGame);
            expect(typeof solver.solve).toBe('function');
            expect(typeof solver.getRootStrategy).toBe('function');
            expect(typeof solver.getAverageStrategy).toBe('function');
            expect(typeof solver.getAverageOpponentStrategy).toBe('function');
        });

        it('solve() works without arguments', () => {
            const solver = new LPSolver(simpleGame);
            solver.solve();

            const strategy = solver.getRootStrategy();
            expect(strategy).not.toBeNull();
            expect(strategy!.size).toBeGreaterThan(0);
        });
    });
});
