import { LPSolver } from './lp';
import { GameTree, Node, PlayerActions, Action, NodeTransition } from '@mari/game-tree/game-tree';

/**
 * Helper function to create a rock-paper-scissors game tree
 */
function createRockPaperScissorsGame(): GameTree {
    const rock: Action = { actionId: 1, name: 'Rock', description: 'Rock' };
    const paper: Action = { actionId: 2, name: 'Paper', description: 'Paper' };
    const scissors: Action = { actionId: 3, name: 'Scissors', description: 'Scissors' };

    const playerActions: PlayerActions = {
        actions: [rock, paper, scissors]
    };

    const opponentActions: PlayerActions = {
        actions: [rock, paper, scissors]
    };

    // Create terminal nodes for each outcome
    const terminalNodes: Map<string, Node> = new Map();
    const createTerminalNode = (id: string, playerReward: number, opponentReward: number): Node => {
        const node: Node = {
            nodeId: id,
            description: `Terminal: ${id}`,
            state: {
                playerHealth: 0,
                opponentHealth: 0,
            },
            transitions: [],
            playerReward: { value: playerReward },
            opponentReward: { value: opponentReward },
        };
        terminalNodes.set(id, node);
        return node;
    };

    // Create all terminal nodes
    createTerminalNode('rock-rock', 0, 0);
    createTerminalNode('rock-paper', -1, 1);
    createTerminalNode('rock-scissors', 1, -1);
    createTerminalNode('paper-rock', 1, -1);
    createTerminalNode('paper-paper', 0, 0);
    createTerminalNode('paper-scissors', -1, 1);
    createTerminalNode('scissors-rock', -1, 1);
    createTerminalNode('scissors-paper', 1, -1);
    createTerminalNode('scissors-scissors', 0, 0);

    // Create transitions
    const transitions: NodeTransition[] = [
        { playerActionId: 1, opponentActionId: 1, nextNodeId: 'rock-rock' },
        { playerActionId: 1, opponentActionId: 2, nextNodeId: 'rock-paper' },
        { playerActionId: 1, opponentActionId: 3, nextNodeId: 'rock-scissors' },
        { playerActionId: 2, opponentActionId: 1, nextNodeId: 'paper-rock' },
        { playerActionId: 2, opponentActionId: 2, nextNodeId: 'paper-paper' },
        { playerActionId: 2, opponentActionId: 3, nextNodeId: 'paper-scissors' },
        { playerActionId: 3, opponentActionId: 1, nextNodeId: 'scissors-rock' },
        { playerActionId: 3, opponentActionId: 2, nextNodeId: 'scissors-paper' },
        { playerActionId: 3, opponentActionId: 3, nextNodeId: 'scissors-scissors' },
    ];

    const root: Node = {
        nodeId: 'root',
        description: 'Rock Paper Scissors',
        state: {
            playerHealth: 0,
            opponentHealth: 0,
        },
        playerActions,
        opponentActions,
        transitions
    };

    // Build nodes map
    const nodes: Record<string, Node> = {
        'root': root,
    };
    // Add all terminal nodes
    for (const [id, node] of terminalNodes.entries()) {
        nodes[id] = node;
    }

    return {
        id: 1,
        root: 'root',
        nodes
    };
}

/**
 * Helper function to create a game with biased rewards
 */
function createBiasedRewardGame(): GameTree {
    const strike: Action = { actionId: 1, name: 'Strike', description: 'Strike' };
    const throwAction: Action = { actionId: 2, name: 'Throw', description: 'Throw' };

    const guard: Action = { actionId: 101, name: 'Guard', description: 'Guard' };
    const throwEscape: Action = { actionId: 102, name: 'Throw Escape', description: 'Throw Escape' };
    const verticalJump: Action = { actionId: 103, name: 'Vertical Jump', description: 'Vertical Jump' };

    const playerActions: PlayerActions = {
        actions: [strike, throwAction]
    };

    const opponentActions: PlayerActions = {
        actions: [guard, throwEscape, verticalJump]
    };

    // Create terminal nodes
    const terminalNodes: Map<string, Node> = new Map();
    const createTerminalNode = (id: string, playerReward: number, opponentReward: number): Node => {
        const node: Node = {
            nodeId: id,
            description: `Terminal: ${id}`,
            state: {
                playerHealth: 0,
                opponentHealth: 0,
            },
            transitions: [],
            playerReward: { value: playerReward },
            opponentReward: { value: opponentReward },
        };
        terminalNodes.set(id, node);
        return node;
    };

    createTerminalNode('strike-guard', 0, 0);
    createTerminalNode('strike-throw_escape', 3000, -3000);
    createTerminalNode('strike-vertical_jump', 3000, -3000);
    createTerminalNode('throw-guard', 1000, -1000);
    createTerminalNode('throw-throw_escape', 0, 0);
    createTerminalNode('throw-vertical_jump', -3000, 3000);

    const transitions: NodeTransition[] = [
        { playerActionId: 1, opponentActionId: 101, nextNodeId: 'strike-guard' },
        { playerActionId: 1, opponentActionId: 102, nextNodeId: 'strike-throw_escape' },
        { playerActionId: 1, opponentActionId: 103, nextNodeId: 'strike-vertical_jump' },
        { playerActionId: 2, opponentActionId: 101, nextNodeId: 'throw-guard' },
        { playerActionId: 2, opponentActionId: 102, nextNodeId: 'throw-throw_escape' },
        { playerActionId: 2, opponentActionId: 103, nextNodeId: 'throw-vertical_jump' },
    ];

    const root: Node = {
        nodeId: 'root',
        description: 'Biased Reward Game',
        state: {
            playerHealth: 0,
            opponentHealth: 0,
        },
        playerActions,
        opponentActions,
        transitions
    };

    // Build nodes map
    const nodes: Record<string, Node> = {
        'root': root,
    };
    // Add all terminal nodes
    for (const [id, node] of terminalNodes.entries()) {
        nodes[id] = node;
    }

    return {
        id: 2,
        root: 'root',
        nodes
    };
}

/**
 * Helper function to create Guriko Janken
 */
function createGurikoJanken(): GameTree {
    const rock: Action = { actionId: 1, name: 'Rock', description: 'Rock' };
    const paper: Action = { actionId: 2, name: 'Paper', description: 'Paper' };
    const scissors: Action = { actionId: 3, name: 'Scissors', description: 'Scissors' };

    const playerActions: PlayerActions = {
        actions: [rock, paper, scissors],
    };

    const opponentActions: PlayerActions = {
        actions: [rock, paper, scissors],
    };

    // Create terminal nodes
    const createTerminalNode = (id: string, playerReward: number, opponentReward: number): Node => ({
        nodeId: id,
        description: `Terminal: ${id}`,
        state: {
            playerHealth: 0,
            opponentHealth: 0,
        },
        transitions: [],
        playerReward: { value: playerReward },
        opponentReward: { value: opponentReward },
    });

    const transitions: NodeTransition[] = [
        { playerActionId: 1, opponentActionId: 1, nextNodeId: 'rock-rock' },
        { playerActionId: 1, opponentActionId: 2, nextNodeId: 'rock-paper' },
        { playerActionId: 1, opponentActionId: 3, nextNodeId: 'rock-scissors' },
        { playerActionId: 2, opponentActionId: 1, nextNodeId: 'paper-rock' },
        { playerActionId: 2, opponentActionId: 2, nextNodeId: 'paper-paper' },
        { playerActionId: 2, opponentActionId: 3, nextNodeId: 'paper-scissors' },
        { playerActionId: 3, opponentActionId: 1, nextNodeId: 'scissors-rock' },
        { playerActionId: 3, opponentActionId: 2, nextNodeId: 'scissors-paper' },
        { playerActionId: 3, opponentActionId: 3, nextNodeId: 'scissors-scissors' },
    ];

    const root: Node = {
        nodeId: 'root',
        description: 'Guriko Janken',
        state: {
            playerHealth: 0,
            opponentHealth: 0,
        },
        playerActions,
        opponentActions,
        transitions,
    };

    // Create terminal nodes map
    const terminalNodes: Record<string, Node> = {
        'rock-rock': createTerminalNode('rock-rock', 0, 0),
        'rock-paper': createTerminalNode('rock-paper', -6, 6),
        'rock-scissors': createTerminalNode('rock-scissors', 3, -3),
        'paper-rock': createTerminalNode('paper-rock', 6, -6),
        'paper-paper': createTerminalNode('paper-paper', 0, 0),
        'paper-scissors': createTerminalNode('paper-scissors', -5, 5),
        'scissors-rock': createTerminalNode('scissors-rock', -3, 3),
        'scissors-paper': createTerminalNode('scissors-paper', 5, -5),
        'scissors-scissors': createTerminalNode('scissors-scissors', 0, 0),
    };

    const nodes: Record<string, Node> = {
        'root': root,
        ...terminalNodes,
    };

    return { id: 3, root: 'root', nodes };
}

describe('LPSolver', () => {
    describe('Rock Paper Scissors', () => {
        it('should converge to uniform strategy for RPS', () => {
            const gameTree = createRockPaperScissorsGame();
            const solver = new LPSolver(gameTree);

            solver.solve();

            const strategy = solver.getRootStrategy();
            expect(strategy).not.toBeNull();

            const rockProb = strategy!.get(1) ?? 0;
            const paperProb = strategy!.get(2) ?? 0;
            const scissorsProb = strategy!.get(3) ?? 0;

            // In RPS, optimal strategy is uniform (1/3 each)
            expect(rockProb).toBeCloseTo(1 / 3, 2);
            expect(paperProb).toBeCloseTo(1 / 3, 2);
            expect(scissorsProb).toBeCloseTo(1 / 3, 2);

            // Probabilities should sum to 1
            expect(rockProb + paperProb + scissorsProb).toBeCloseTo(1.0, 5);
        });

        it('should have all probabilities between 0 and 1', () => {
            const gameTree = createRockPaperScissorsGame();
            const solver = new LPSolver(gameTree);

            solver.solve();

            const strategy = solver.getRootStrategy();
            expect(strategy).not.toBeNull();

            for (const [, prob] of strategy!.entries()) {
                expect(prob).toBeGreaterThanOrEqual(0);
                expect(prob).toBeLessThanOrEqual(1);
            }
        });
    });

    describe('Biased Reward Game', () => {
        it('should prefer strike over throw due to higher reward', () => {
            const gameTree = createBiasedRewardGame();
            const solver = new LPSolver(gameTree);

            solver.solve();

            const strategy = solver.getRootStrategy();
            expect(strategy).not.toBeNull();

            const strikeProb = strategy!.get(1) ?? 0;
            const throwProb = strategy!.get(2) ?? 0;

            // Strike should have higher probability than throw
            expect(strikeProb).toBeGreaterThan(throwProb);

            // All probabilities should be positive
            expect(strikeProb).toBeGreaterThan(0);
            expect(throwProb).toBeGreaterThan(0);

            // Probabilities should sum to 1
            expect(strikeProb + throwProb).toBeCloseTo(1.0, 5);
        });

        it('should converge to a mixed strategy', () => {
            const gameTree = createBiasedRewardGame();
            const solver = new LPSolver(gameTree);

            solver.solve();

            const strategy = solver.getRootStrategy();
            expect(strategy).not.toBeNull();

            // Strategy should not be pure (all probability on one action)
            const probs = Array.from(strategy!.values());
            const maxProb = Math.max(...probs);

            // Maximum probability should be less than 1 (mixed strategy)
            expect(maxProb).toBeLessThan(1.0);

            // All actions should have some probability
            for (const prob of probs) {
                expect(prob).toBeGreaterThan(0.01);
            }
        });
    });

    describe('Guriko Janken (weighted RPS)', () => {
        it('should converge to expected mixed strategy 5/14, 6/14, 3/14', () => {
            const gameTree = createGurikoJanken();
            const solver = new LPSolver(gameTree);

            solver.solve();

            const strategy = solver.getRootStrategy();
            expect(strategy).not.toBeNull();

            const rockProb = strategy!.get(1) ?? 0;
            const paperProb = strategy!.get(2) ?? 0;
            const scissorsProb = strategy!.get(3) ?? 0;

            // Expected optimal mix (Rock, Scissors, Paper): 5/14, 6/14, 3/14
            expect(rockProb).toBeCloseTo(5 / 14, 2);
            expect(scissorsProb).toBeCloseTo(6 / 14, 2);
            expect(paperProb).toBeCloseTo(3 / 14, 2);

            expect(rockProb + paperProb + scissorsProb).toBeCloseTo(1.0, 4);
        });
    });

    describe('Single action node', () => {
        function createSinglePlayerActionGame(): GameTree {
            const attack: Action = { actionId: 1, name: 'Attack', description: 'Attack' };

            const block: Action = { actionId: 101, name: 'Block', description: 'Block' };
            const dodge: Action = { actionId: 102, name: 'Dodge', description: 'Dodge' };

            const playerActions: PlayerActions = {
                actions: [attack]
            };

            const opponentActions: PlayerActions = {
                actions: [block, dodge]
            };

            const createTerminalNode = (id: string, playerReward: number, opponentReward: number): Node => ({
                nodeId: id,
                description: `Terminal: ${id}`,
                state: { playerHealth: 0, opponentHealth: 0 },
                transitions: [],
                playerReward: { value: playerReward },
                opponentReward: { value: opponentReward },
            });

            const transitions: NodeTransition[] = [
                { playerActionId: 1, opponentActionId: 101, nextNodeId: 'attack-block' },
                { playerActionId: 1, opponentActionId: 102, nextNodeId: 'attack-dodge' },
            ];

            const root: Node = {
                nodeId: 'root',
                description: 'Single Player Action Game',
                state: { playerHealth: 0, opponentHealth: 0 },
                playerActions,
                opponentActions,
                transitions,
            };

            const nodes: Record<string, Node> = {
                'root': root,
                'attack-block': createTerminalNode('attack-block', -100, 100),
                'attack-dodge': createTerminalNode('attack-dodge', 100, -100),
            };

            return { id: 4, root: 'root', nodes };
        }

        function createSingleOpponentActionGame(): GameTree {
            const strike: Action = { actionId: 1, name: 'Strike', description: 'Strike' };
            const defend: Action = { actionId: 2, name: 'Defend', description: 'Defend' };

            const wait: Action = { actionId: 101, name: 'Wait', description: 'Wait' };

            const playerActions: PlayerActions = {
                actions: [strike, defend]
            };

            const opponentActions: PlayerActions = {
                actions: [wait]
            };

            const createTerminalNode = (id: string, playerReward: number, opponentReward: number): Node => ({
                nodeId: id,
                description: `Terminal: ${id}`,
                state: { playerHealth: 0, opponentHealth: 0 },
                transitions: [],
                playerReward: { value: playerReward },
                opponentReward: { value: opponentReward },
            });

            const transitions: NodeTransition[] = [
                { playerActionId: 1, opponentActionId: 101, nextNodeId: 'strike-wait' },
                { playerActionId: 2, opponentActionId: 101, nextNodeId: 'defend-wait' },
            ];

            const root: Node = {
                nodeId: 'root',
                description: 'Single Opponent Action Game',
                state: { playerHealth: 0, opponentHealth: 0 },
                playerActions,
                opponentActions,
                transitions,
            };

            const nodes: Record<string, Node> = {
                'root': root,
                'strike-wait': createTerminalNode('strike-wait', 100, -100),
                'defend-wait': createTerminalNode('defend-wait', -100, 100),
            };

            return { id: 5, root: 'root', nodes };
        }

        it('should compute correct minimax value when player has one action', () => {
            const gameTree = createSinglePlayerActionGame();
            const solver = new LPSolver(gameTree);

            solver.solve();

            const strategy = solver.getRootStrategy();
            expect(strategy).not.toBeNull();

            // Player's only action should have probability 1
            const attackProb = strategy!.get(1) ?? 0;
            expect(attackProb).toBeCloseTo(1.0, 5);

            // Opponent should choose block (which minimizes player's payoff)
            const oppStrategy = solver.getAverageOpponentStrategy('root');
            expect(oppStrategy).not.toBeNull();
            const blockProb = oppStrategy!.get(101) ?? 0;
            expect(blockProb).toBeCloseTo(1.0, 5);
        });

        function createGameWithSingleActionChild(): GameTree {
            const pathA: Action = { actionId: 1, name: 'Path A', description: 'Path A' };
            const pathB: Action = { actionId: 2, name: 'Path B', description: 'Path B' };
            const attack: Action = { actionId: 3, name: 'Attack', description: 'Attack' };
            const block: Action = { actionId: 101, name: 'Block', description: 'Block' };
            const dodge: Action = { actionId: 102, name: 'Dodge', description: 'Dodge' };
            const pass: Action = { actionId: 103, name: 'Pass', description: 'Pass' };

            const createTerminalNode = (id: string, playerReward: number, opponentReward: number): Node => ({
                nodeId: id,
                description: `Terminal: ${id}`,
                state: { playerHealth: 0, opponentHealth: 0 },
                transitions: [],
                playerReward: { value: playerReward },
                opponentReward: { value: opponentReward },
            });

            // Single-action child node
            const childNode: Node = {
                nodeId: 'child_a',
                description: 'Single Action Child',
                state: { playerHealth: 0, opponentHealth: 0 },
                playerActions: { actions: [attack] },
                opponentActions: { actions: [block, dodge] },
                transitions: [
                    { playerActionId: 3, opponentActionId: 101, nextNodeId: 'attack-block' },
                    { playerActionId: 3, opponentActionId: 102, nextNodeId: 'attack-dodge' },
                ],
            };

            // Root node
            const root: Node = {
                nodeId: 'root',
                description: 'Root',
                state: { playerHealth: 0, opponentHealth: 0 },
                playerActions: { actions: [pathA, pathB] },
                opponentActions: { actions: [pass] },
                transitions: [
                    { playerActionId: 1, opponentActionId: 103, nextNodeId: 'child_a' },
                    { playerActionId: 2, opponentActionId: 103, nextNodeId: 'terminal_b' },
                ],
            };

            const nodes: Record<string, Node> = {
                'root': root,
                'child_a': childNode,
                'attack-block': createTerminalNode('attack-block', -100, 100),
                'attack-dodge': createTerminalNode('attack-dodge', 100, -100),
                'terminal_b': createTerminalNode('terminal_b', 0, 0),
            };

            return { id: 6, root: 'root', nodes };
        }

        it('should propagate correct minimax value from single-action child to parent', () => {
            const gameTree = createGameWithSingleActionChild();
            const solver = new LPSolver(gameTree);

            solver.solve();

            const strategy = solver.getRootStrategy();
            expect(strategy).not.toBeNull();

            // Path A leads to a single-action node with minimax value -100
            // Path B leads to terminal with value 0
            // Player should strongly prefer Path B
            const pathAProb = strategy!.get(1) ?? 0;
            const pathBProb = strategy!.get(2) ?? 0;

            expect(pathBProb).toBeCloseTo(1.0, 5);
            expect(pathAProb).toBeCloseTo(0.0, 5);
        });

        it('should compute correct minimax value when opponent has one action', () => {
            const gameTree = createSingleOpponentActionGame();
            const solver = new LPSolver(gameTree);

            solver.solve();

            // Opponent's only action should have probability 1
            const oppStrategy = solver.getAverageOpponentStrategy('root');
            expect(oppStrategy).not.toBeNull();
            const waitProb = oppStrategy!.get(101) ?? 0;
            expect(waitProb).toBeCloseTo(1.0, 5);

            // Player should choose strike (which maximizes player's payoff)
            const strategy = solver.getRootStrategy();
            expect(strategy).not.toBeNull();
            const strikeProb = strategy!.get(1) ?? 0;
            expect(strikeProb).toBeCloseTo(1.0, 5);
        });
    });

    describe('Action ID collision with reserved variable names', () => {
        // Using numeric IDs, so collision test is less relevant but kept for coverage
        function createGameWithSmallActionId(): GameTree {
            const v: Action = { actionId: 1, name: 'V', description: 'Action V' };
            const w: Action = { actionId: 2, name: 'W', description: 'Action W' };

            const x: Action = { actionId: 101, name: 'X', description: 'Action X' };
            const y: Action = { actionId: 102, name: 'Y', description: 'Action Y' };

            const playerActions: PlayerActions = {
                actions: [v, w]
            };

            const opponentActions: PlayerActions = {
                actions: [x, y]
            };

            const createTerminalNode = (id: string, playerReward: number, opponentReward: number): Node => ({
                nodeId: id,
                description: `Terminal: ${id}`,
                state: { playerHealth: 0, opponentHealth: 0 },
                transitions: [],
                playerReward: { value: playerReward },
                opponentReward: { value: opponentReward },
            });

            const transitions: NodeTransition[] = [
                { playerActionId: 1, opponentActionId: 101, nextNodeId: 'v-x' },
                { playerActionId: 1, opponentActionId: 102, nextNodeId: 'v-y' },
                { playerActionId: 2, opponentActionId: 101, nextNodeId: 'w-x' },
                { playerActionId: 2, opponentActionId: 102, nextNodeId: 'w-y' },
            ];

            const root: Node = {
                nodeId: 'root',
                description: 'Small Action ID Game',
                state: { playerHealth: 0, opponentHealth: 0 },
                playerActions,
                opponentActions,
                transitions,
            };

            const nodes: Record<string, Node> = {
                'root': root,
                'v-x': createTerminalNode('v-x', 3, -3),
                'v-y': createTerminalNode('v-y', -1, 1),
                'w-x': createTerminalNode('w-x', -1, 1),
                'w-y': createTerminalNode('w-y', 2, -2),
            };

            return { id: 7, root: 'root', nodes };
        }

        it('should handle small action IDs correctly', () => {
            const gameTree = createGameWithSmallActionId();
            const solver = new LPSolver(gameTree);

            solver.solve();

            const strategy = solver.getRootStrategy();
            expect(strategy).not.toBeNull();

            // Both actions should have valid probabilities
            const vProb = strategy!.get(1) ?? 0;
            const wProb = strategy!.get(2) ?? 0;

            // Probabilities should be valid (between 0 and 1)
            expect(vProb).toBeGreaterThanOrEqual(0);
            expect(vProb).toBeLessThanOrEqual(1);
            expect(wProb).toBeGreaterThanOrEqual(0);
            expect(wProb).toBeLessThanOrEqual(1);

            // Probabilities should sum to 1
            expect(vProb + wProb).toBeCloseTo(1.0, 5);

            // This should be a mixed strategy (not pure)
            expect(vProb).toBeGreaterThan(0.1);
            expect(wProb).toBeGreaterThan(0.1);
        });

        it('should compute correct equilibrium', () => {
            const gameTree = createGameWithSmallActionId();
            const solver = new LPSolver(gameTree);

            solver.solve();

            const strategy = solver.getRootStrategy();
            expect(strategy).not.toBeNull();

            // For the payoff matrix:
            //        x    y
            //   v    3   -1
            //   w   -1    2
            // p = 3/7
            const vProb = strategy!.get(1) ?? 0;
            expect(vProb).toBeCloseTo(3 / 7, 2);
        });
    });

    describe('Solver interface', () => {
        it('should have required solver methods', () => {
            const gameTree = createRockPaperScissorsGame();
            const solver = new LPSolver(gameTree);

            // Should have solve method
            expect(typeof solver.solve).toBe('function');

            // Should have getRootStrategy method
            expect(typeof solver.getRootStrategy).toBe('function');

            // Should have getAverageStrategy method
            expect(typeof solver.getAverageStrategy).toBe('function');

            // Should have getAverageOpponentStrategy method
            expect(typeof solver.getAverageOpponentStrategy).toBe('function');
        });

        it('should work with solve() called without arguments', () => {
            const gameTree = createRockPaperScissorsGame();
            const solver = new LPSolver(gameTree);

            // Should work without iterations parameter
            solver.solve();

            const strategy = solver.getRootStrategy();
            expect(strategy).not.toBeNull();
            expect(strategy!.size).toBeGreaterThan(0);
        });
    });
});
