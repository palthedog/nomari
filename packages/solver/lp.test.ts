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

    describe('Interface compatibility with CFR', () => {
        it('should have same interface as CFRSolver', () => {
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
