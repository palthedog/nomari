import { LPSolver } from './lp';
import { GameTree, Node, PlayerActions, Action, NodeTransition } from '@mari/game-tree/game-tree';

/**
 * Helper function to create a rock-paper-scissors game tree
 */
function createRockPaperScissorsGame(): GameTree {
    const rock: Action = { actionId: 'rock', name: 'Rock', description: 'Rock' };
    const paper: Action = { actionId: 'paper', name: 'Paper', description: 'Paper' };
    const scissors: Action = { actionId: 'scissors', name: 'Scissors', description: 'Scissors' };

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
        { playerActionId: 'rock', opponentActionId: 'rock', nextNodeId: 'rock-rock' },
        { playerActionId: 'rock', opponentActionId: 'paper', nextNodeId: 'rock-paper' },
        { playerActionId: 'rock', opponentActionId: 'scissors', nextNodeId: 'rock-scissors' },
        { playerActionId: 'paper', opponentActionId: 'rock', nextNodeId: 'paper-rock' },
        { playerActionId: 'paper', opponentActionId: 'paper', nextNodeId: 'paper-paper' },
        { playerActionId: 'paper', opponentActionId: 'scissors', nextNodeId: 'paper-scissors' },
        { playerActionId: 'scissors', opponentActionId: 'rock', nextNodeId: 'scissors-rock' },
        { playerActionId: 'scissors', opponentActionId: 'paper', nextNodeId: 'scissors-paper' },
        { playerActionId: 'scissors', opponentActionId: 'scissors', nextNodeId: 'scissors-scissors' },
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
        id: 'rps',
        root: 'root',
        nodes
    };
}

/**
 * Helper function to create a game with biased rewards
 * 
 * Attacker actions: strike (攻撃), throw (投げ)
 * Defender actions: guard (ガード), throw_escape (投げ抜け), vertical_jump (垂直ジャンプ)
 * 
 * Rules:
 * - Guard blocks strike but no counter (draw: 0 points)
 * - Throw escape only works against throw (draw: 0 points)
 * - Vertical jump only beats throw (defender wins: -1000 for attacker)
 * 
 * Rewards:
 * - Strike wins: 3000 points
 * - Throw wins: 1000 points
 */
function createBiasedRewardGame(): GameTree {
    const strike: Action = { actionId: 'strike', name: 'Strike', description: 'Strike (攻撃)' };
    const throwAction: Action = { actionId: 'throw', name: 'Throw', description: 'Throw (投げ)' };

    const guard: Action = { actionId: 'guard', name: 'Guard', description: 'Guard (ガード)' };
    const throwEscape: Action = { actionId: 'throw_escape', name: 'Throw Escape', description: 'Throw Escape (投げ抜け)' };
    const verticalJump: Action = { actionId: 'vertical_jump', name: 'Vertical Jump', description: 'Vertical Jump (垂直ジャンプ)' };

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
        { playerActionId: 'strike', opponentActionId: 'guard', nextNodeId: 'strike-guard' },
        { playerActionId: 'strike', opponentActionId: 'throw_escape', nextNodeId: 'strike-throw_escape' },
        { playerActionId: 'strike', opponentActionId: 'vertical_jump', nextNodeId: 'strike-vertical_jump' },
        { playerActionId: 'throw', opponentActionId: 'guard', nextNodeId: 'throw-guard' },
        { playerActionId: 'throw', opponentActionId: 'throw_escape', nextNodeId: 'throw-throw_escape' },
        { playerActionId: 'throw', opponentActionId: 'vertical_jump', nextNodeId: 'throw-vertical_jump' },
    ];

    const root: Node = {
        nodeId: 'root',
        description: 'Biased Reward Game (攻撃側 vs 防御側)',
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
        id: 'biased',
        root: 'root',
        nodes
    };
}

/**
 * Helper function to create Guriko Janken:
 * Rock win: 3 pts, Scissors win: 5 pts, Paper win: 6 pts
 * Loser gets negative of that value.
 */
function createGurikoJanken(): GameTree {
    const rock: Action = { actionId: 'rock', name: 'Rock', description: 'Rock' };
    const paper: Action = { actionId: 'paper', name: 'Paper', description: 'Paper' };
    const scissors: Action = { actionId: 'scissors', name: 'Scissors', description: 'Scissors' };

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
        { playerActionId: 'rock', opponentActionId: 'rock', nextNodeId: 'rock-rock' },
        { playerActionId: 'rock', opponentActionId: 'paper', nextNodeId: 'rock-paper' },
        { playerActionId: 'rock', opponentActionId: 'scissors', nextNodeId: 'rock-scissors' },
        { playerActionId: 'paper', opponentActionId: 'rock', nextNodeId: 'paper-rock' },
        { playerActionId: 'paper', opponentActionId: 'paper', nextNodeId: 'paper-paper' },
        { playerActionId: 'paper', opponentActionId: 'scissors', nextNodeId: 'paper-scissors' },
        { playerActionId: 'scissors', opponentActionId: 'rock', nextNodeId: 'scissors-rock' },
        { playerActionId: 'scissors', opponentActionId: 'paper', nextNodeId: 'scissors-paper' },
        { playerActionId: 'scissors', opponentActionId: 'scissors', nextNodeId: 'scissors-scissors' },
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

    return { id: 'guriko', root: 'root', nodes };
}

describe('LPSolver', () => {
    describe('Rock Paper Scissors', () => {
        it('should converge to uniform strategy for RPS', () => {
            const gameTree = createRockPaperScissorsGame();
            const solver = new LPSolver(gameTree);

            solver.solve();

            const strategy = solver.getRootStrategy();
            expect(strategy).not.toBeNull();

            const rockProb = strategy!.get('rock') ?? 0;
            const paperProb = strategy!.get('paper') ?? 0;
            const scissorsProb = strategy!.get('scissors') ?? 0;

            // In RPS, optimal strategy is uniform (1/3 each)
            // LP should find exact solution
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

            for (const [action, prob] of strategy!.entries()) {
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

            const strikeProb = strategy!.get('strike') ?? 0;
            const throwProb = strategy!.get('throw') ?? 0;

            // Strike should have higher probability than throw
            // because it gives 3x the reward (3000 vs 1000) when it wins
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
                expect(prob).toBeGreaterThan(0.01); // At least 1% probability
            }
        });

        it('should account for defender counter-strategies', () => {
            const gameTree = createBiasedRewardGame();
            const solver = new LPSolver(gameTree);

            solver.solve();

            const strategy = solver.getRootStrategy();
            expect(strategy).not.toBeNull();

            const strikeProb = strategy!.get('strike') ?? 0;
            const throwProb = strategy!.get('throw') ?? 0;

            // Both actions should have significant probability
            expect(strikeProb).toBeGreaterThan(0.1);
            expect(throwProb).toBeGreaterThan(0.1);
        });
    });

    describe('Guriko Janken (weighted RPS)', () => {
        it('should converge to expected mixed strategy 5/14, 6/14, 3/14', () => {
            const gameTree = createGurikoJanken();
            const solver = new LPSolver(gameTree);

            solver.solve();

            const strategy = solver.getRootStrategy();
            expect(strategy).not.toBeNull();

            const rockProb = strategy!.get('rock') ?? 0;
            const paperProb = strategy!.get('paper') ?? 0;
            const scissorsProb = strategy!.get('scissors') ?? 0;

            // Expected optimal mix (Rock, Scissors, Paper): 5/14, 6/14, 3/14
            // LP should find exact solution
            expect(rockProb).toBeCloseTo(5 / 14, 2);
            expect(scissorsProb).toBeCloseTo(6 / 14, 2);
            expect(paperProb).toBeCloseTo(3 / 14, 2);

            expect(rockProb + paperProb + scissorsProb).toBeCloseTo(1.0, 4);
        });
    });

    describe('Single action node', () => {
        /**
         * Create a game where player has only one action.
         * Player: only "attack" action
         * Opponent: "block" (player gets -100) or "dodge" (player gets 100)
         * 
         * The minimax value for player should be -100 (opponent chooses block)
         * NOT the average (0) which would be calculated with uniform opponent strategy.
         */
        function createSinglePlayerActionGame(): GameTree {
            const attack: Action = { actionId: 'attack', name: 'Attack', description: 'Attack' };

            const block: Action = { actionId: 'block', name: 'Block', description: 'Block' };
            const dodge: Action = { actionId: 'dodge', name: 'Dodge', description: 'Dodge' };

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
                { playerActionId: 'attack', opponentActionId: 'block', nextNodeId: 'attack-block' },
                { playerActionId: 'attack', opponentActionId: 'dodge', nextNodeId: 'attack-dodge' },
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

            return { id: 'single-action', root: 'root', nodes };
        }

        /**
         * Create a game where opponent has only one action.
         * Player: "strike" (opponent gets -100) or "defend" (opponent gets 100)
         * Opponent: only "wait" action
         * 
         * The minimax value for opponent should be -100 (player chooses strike)
         * NOT the average (0) which would be calculated with uniform player strategy.
         */
        function createSingleOpponentActionGame(): GameTree {
            const strike: Action = { actionId: 'strike', name: 'Strike', description: 'Strike' };
            const defend: Action = { actionId: 'defend', name: 'Defend', description: 'Defend' };

            const wait: Action = { actionId: 'wait', name: 'Wait', description: 'Wait' };

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
                { playerActionId: 'strike', opponentActionId: 'wait', nextNodeId: 'strike-wait' },
                { playerActionId: 'defend', opponentActionId: 'wait', nextNodeId: 'defend-wait' },
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

            return { id: 'single-opp-action', root: 'root', nodes };
        }

        it('should compute correct minimax value when player has one action', () => {
            const gameTree = createSinglePlayerActionGame();
            const solver = new LPSolver(gameTree);

            solver.solve();

            const strategy = solver.getRootStrategy();
            expect(strategy).not.toBeNull();

            // Player's only action should have probability 1
            const attackProb = strategy!.get('attack') ?? 0;
            expect(attackProb).toBeCloseTo(1.0, 5);

            // Opponent should choose block (which minimizes player's payoff)
            const oppStrategy = solver.getAverageOpponentStrategy('root');
            expect(oppStrategy).not.toBeNull();
            const blockProb = oppStrategy!.get('block') ?? 0;
            expect(blockProb).toBeCloseTo(1.0, 5);
        });

        /**
         * Create a game with a parent node that has a single-action child node.
         * This tests that the child's playerValue is correctly computed and propagated.
         * 
         * Root node: player chooses "path_a" or "path_b"
         * - path_a leads to a single-action node (player has only "attack")
         *   - opponent: "block" (-100) or "dodge" (100)
         *   - Minimax value should be -100
         * - path_b leads to a terminal node with reward 0
         * 
         * If player value for path_a is correctly computed as -100,
         * player should choose path_b (with value 0).
         * If incorrectly computed as 0 (average), player would be indifferent.
         */
        function createGameWithSingleActionChild(): GameTree {
            const pathA: Action = { actionId: 'path_a', name: 'Path A', description: 'Path A' };
            const pathB: Action = { actionId: 'path_b', name: 'Path B', description: 'Path B' };
            const attack: Action = { actionId: 'attack', name: 'Attack', description: 'Attack' };
            const block: Action = { actionId: 'block', name: 'Block', description: 'Block' };
            const dodge: Action = { actionId: 'dodge', name: 'Dodge', description: 'Dodge' };
            const pass: Action = { actionId: 'pass', name: 'Pass', description: 'Pass' };

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
                    { playerActionId: 'attack', opponentActionId: 'block', nextNodeId: 'attack-block' },
                    { playerActionId: 'attack', opponentActionId: 'dodge', nextNodeId: 'attack-dodge' },
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
                    { playerActionId: 'path_a', opponentActionId: 'pass', nextNodeId: 'child_a' },
                    { playerActionId: 'path_b', opponentActionId: 'pass', nextNodeId: 'terminal_b' },
                ],
            };

            const nodes: Record<string, Node> = {
                'root': root,
                'child_a': childNode,
                'attack-block': createTerminalNode('attack-block', -100, 100),
                'attack-dodge': createTerminalNode('attack-dodge', 100, -100),
                'terminal_b': createTerminalNode('terminal_b', 0, 0),
            };

            return { id: 'single-action-child', root: 'root', nodes };
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
            const pathAProb = strategy!.get('path_a') ?? 0;
            const pathBProb = strategy!.get('path_b') ?? 0;

            // If bug exists: player value for child_a is 0 (average), so player is indifferent
            // If fixed: player value for child_a is -100 (minimax), so player chooses path_b
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
            const waitProb = oppStrategy!.get('wait') ?? 0;
            expect(waitProb).toBeCloseTo(1.0, 5);

            // Player should choose strike (which maximizes player's payoff)
            const strategy = solver.getRootStrategy();
            expect(strategy).not.toBeNull();
            const strikeProb = strategy!.get('strike') ?? 0;
            expect(strikeProb).toBeCloseTo(1.0, 5);
        });
    });

    describe('Action ID collision with reserved variable names', () => {
        /**
         * Create a game where action IDs collide with reserved LP variable names.
         * This tests that action IDs are properly namespaced.
         * 
         * Using 'v' as action ID which collides with the game value variable.
         */
        function createGameWithReservedActionId(): GameTree {
            // Player has action 'v' which collides with LP value variable
            const v: Action = { actionId: 'v', name: 'V', description: 'Action V' };
            const w: Action = { actionId: 'w', name: 'W', description: 'Action W' };

            const x: Action = { actionId: 'x', name: 'X', description: 'Action X' };
            const y: Action = { actionId: 'y', name: 'Y', description: 'Action Y' };

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

            // Payoff matrix:
            //        x    y
            //   v    3   -1
            //   w   -1    2
            // This should have a mixed equilibrium
            const transitions: NodeTransition[] = [
                { playerActionId: 'v', opponentActionId: 'x', nextNodeId: 'v-x' },
                { playerActionId: 'v', opponentActionId: 'y', nextNodeId: 'v-y' },
                { playerActionId: 'w', opponentActionId: 'x', nextNodeId: 'w-x' },
                { playerActionId: 'w', opponentActionId: 'y', nextNodeId: 'w-y' },
            ];

            const root: Node = {
                nodeId: 'root',
                description: 'Reserved Action ID Game',
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

            return { id: 'reserved-action-id', root: 'root', nodes };
        }

        it('should handle action ID "v" without collision with LP value variable', () => {
            const gameTree = createGameWithReservedActionId();
            const solver = new LPSolver(gameTree);

            solver.solve();

            const strategy = solver.getRootStrategy();
            expect(strategy).not.toBeNull();

            // Both actions should have valid probabilities
            const vProb = strategy!.get('v') ?? 0;
            const wProb = strategy!.get('w') ?? 0;

            // Probabilities should be valid (between 0 and 1)
            expect(vProb).toBeGreaterThanOrEqual(0);
            expect(vProb).toBeLessThanOrEqual(1);
            expect(wProb).toBeGreaterThanOrEqual(0);
            expect(wProb).toBeLessThanOrEqual(1);

            // Probabilities should sum to 1
            expect(vProb + wProb).toBeCloseTo(1.0, 5);

            // This should be a mixed strategy (not pure)
            // For this payoff matrix, both actions should have positive probability
            expect(vProb).toBeGreaterThan(0.1);
            expect(wProb).toBeGreaterThan(0.1);
        });

        it('should compute correct equilibrium when action ID is "v"', () => {
            const gameTree = createGameWithReservedActionId();
            const solver = new LPSolver(gameTree);

            solver.solve();

            const strategy = solver.getRootStrategy();
            expect(strategy).not.toBeNull();

            // For the payoff matrix:
            //        x    y
            //   v    3   -1
            //   w   -1    2
            // 
            // Nash equilibrium can be calculated analytically:
            // Let p = P(v), then expected payoff for opponent choosing x vs y should be equal
            // For player: p*3 + (1-p)*(-1) = p*(-1) + (1-p)*2
            //            3p - 1 + p = -p + 2 - 2p
            //            4p - 1 = 2 - 3p
            //            7p = 3
            //            p = 3/7
            const vProb = strategy!.get('v') ?? 0;
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
