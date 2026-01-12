import { CFRSolver } from './cfr';
import { GameTree, Node, PlayerActions, Action, Transition } from './types';

/**
 * Helper function to create a rock-paper-scissors game tree
 */
function createRockPaperScissorsGame(): GameTree {
    const rock: Action = { id: 'rock', description: 'Rock' };
    const paper: Action = { id: 'paper', description: 'Paper' };
    const scissors: Action = { id: 'scissors', description: 'Scissors' };

    const playerActions: PlayerActions = {
        id: 'player',
        actions: [rock, paper, scissors]
    };

    const opponentActions: PlayerActions = {
        id: 'opponent',
        actions: [rock, paper, scissors]
    };

    // Create transitions for all combinations
    const transitions: Transition[] = [
        // Rock vs Rock
        {
            playerActionId: 'rock',
            opponentActionId: 'rock',
            nextNodeId: '',
            isTerminal: true,
            playerReward: { value: 0 },
            opponentReward: { value: 0 }
        },
        // Rock vs Paper
        {
            playerActionId: 'rock',
            opponentActionId: 'paper',
            nextNodeId: '',
            isTerminal: true,
            playerReward: { value: -1 },
            opponentReward: { value: 1 }
        },
        // Rock vs Scissors
        {
            playerActionId: 'rock',
            opponentActionId: 'scissors',
            nextNodeId: '',
            isTerminal: true,
            playerReward: { value: 1 },
            opponentReward: { value: -1 }
        },
        // Paper vs Rock
        {
            playerActionId: 'paper',
            opponentActionId: 'rock',
            nextNodeId: '',
            isTerminal: true,
            playerReward: { value: 1 },
            opponentReward: { value: -1 }
        },
        // Paper vs Paper
        {
            playerActionId: 'paper',
            opponentActionId: 'paper',
            nextNodeId: '',
            isTerminal: true,
            playerReward: { value: 0 },
            opponentReward: { value: 0 }
        },
        // Paper vs Scissors
        {
            playerActionId: 'paper',
            opponentActionId: 'scissors',
            nextNodeId: '',
            isTerminal: true,
            playerReward: { value: -1 },
            opponentReward: { value: 1 }
        },
        // Scissors vs Rock
        {
            playerActionId: 'scissors',
            opponentActionId: 'rock',
            nextNodeId: '',
            isTerminal: true,
            playerReward: { value: -1 },
            opponentReward: { value: 1 }
        },
        // Scissors vs Paper
        {
            playerActionId: 'scissors',
            opponentActionId: 'paper',
            nextNodeId: '',
            isTerminal: true,
            playerReward: { value: 1 },
            opponentReward: { value: -1 }
        },
        // Scissors vs Scissors
        {
            playerActionId: 'scissors',
            opponentActionId: 'scissors',
            nextNodeId: '',
            isTerminal: true,
            playerReward: { value: 0 },
            opponentReward: { value: 0 }
        }
    ];

    const root: Node = {
        id: 'root',
        description: 'Rock Paper Scissors',
        playerActions,
        opponentActions,
        transitions
    };

    return {
        id: 'rps',
        root
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
    const strike: Action = { id: 'strike', description: 'Strike (攻撃)' };
    const throwAction: Action = { id: 'throw', description: 'Throw (投げ)' };

    const guard: Action = { id: 'guard', description: 'Guard (ガード)' };
    const throwEscape: Action = { id: 'throw_escape', description: 'Throw Escape (投げ抜け)' };
    const verticalJump: Action = { id: 'vertical_jump', description: 'Vertical Jump (垂直ジャンプ)' };

    const playerActions: PlayerActions = {
        id: 'attacker',
        actions: [strike, throwAction]
    };

    const opponentActions: PlayerActions = {
        id: 'defender',
        actions: [guard, throwEscape, verticalJump]
    };

    const transitions: Transition[] = [
        // Strike vs Guard: Guard blocks strike, no counter (draw)
        {
            playerActionId: 'strike',
            opponentActionId: 'guard',
            nextNodeId: '',
            isTerminal: true,
            playerReward: { value: 0 },
            opponentReward: { value: 0 }
        },
        // Strike vs Throw Escape: Throw escape only works against throw, so strike wins
        {
            playerActionId: 'strike',
            opponentActionId: 'throw_escape',
            nextNodeId: '',
            isTerminal: true,
            playerReward: { value: 3000 },
            opponentReward: { value: -3000 }
        },
        // Strike vs Vertical Jump: Vertical jump only works against throw, so strike wins
        {
            playerActionId: 'strike',
            opponentActionId: 'vertical_jump',
            nextNodeId: '',
            isTerminal: true,
            playerReward: { value: 3000 },
            opponentReward: { value: -3000 }
        },
        // Throw vs Guard: Guard only blocks strike, so throw wins
        {
            playerActionId: 'throw',
            opponentActionId: 'guard',
            nextNodeId: '',
            isTerminal: true,
            playerReward: { value: 1000 },
            opponentReward: { value: -1000 }
        },
        // Throw vs Throw Escape: Throw escape works, so draw
        {
            playerActionId: 'throw',
            opponentActionId: 'throw_escape',
            nextNodeId: '',
            isTerminal: true,
            playerReward: { value: 0 },
            opponentReward: { value: 0 }
        },
        // Throw vs Vertical Jump: Vertical jump beats throw hard (defender wins big)
        {
            playerActionId: 'throw',
            opponentActionId: 'vertical_jump',
            nextNodeId: '',
            isTerminal: true,
            playerReward: { value: -3000 },
            opponentReward: { value: 3000 }
        }
    ];

    const root: Node = {
        id: 'root',
        description: 'Biased Reward Game (攻撃側 vs 防御側)',
        playerActions,
        opponentActions,
        transitions
    };

    return {
        id: 'biased',
        root
    };
}

/**
 * Helper function to create Guriko Janken:
 * Rock win: 3 pts, Scissors win: 5 pts, Paper win: 6 pts
 * Loser gets negative of that value.
 */
function createGurikoJanken(): GameTree {
    const rock: Action = { id: 'rock', description: 'Rock' };
    const paper: Action = { id: 'paper', description: 'Paper' };
    const scissors: Action = { id: 'scissors', description: 'Scissors' };

    const playerActions: PlayerActions = {
        id: 'player',
        actions: [rock, paper, scissors],
    };

    const opponentActions: PlayerActions = {
        id: 'opponent',
        actions: [rock, paper, scissors],
    };

    const transitions: Transition[] = [
        // Rock vs Rock
        { playerActionId: 'rock', opponentActionId: 'rock', nextNodeId: '', isTerminal: true, playerReward: { value: 0 }, opponentReward: { value: 0 } },
        // Rock vs Paper (rock loses)
        { playerActionId: 'rock', opponentActionId: 'paper', nextNodeId: '', isTerminal: true, playerReward: { value: -6 }, opponentReward: { value: 6 } },
        // Rock vs Scissors (rock wins: 3)
        { playerActionId: 'rock', opponentActionId: 'scissors', nextNodeId: '', isTerminal: true, playerReward: { value: 3 }, opponentReward: { value: -3 } },
        // Paper vs Rock (paper wins: 6)
        { playerActionId: 'paper', opponentActionId: 'rock', nextNodeId: '', isTerminal: true, playerReward: { value: 6 }, opponentReward: { value: -6 } },
        // Paper vs Paper
        { playerActionId: 'paper', opponentActionId: 'paper', nextNodeId: '', isTerminal: true, playerReward: { value: 0 }, opponentReward: { value: 0 } },
        // Paper vs Scissors (paper loses)
        { playerActionId: 'paper', opponentActionId: 'scissors', nextNodeId: '', isTerminal: true, playerReward: { value: -5 }, opponentReward: { value: 5 } },
        // Scissors vs Rock (scissors loses)
        { playerActionId: 'scissors', opponentActionId: 'rock', nextNodeId: '', isTerminal: true, playerReward: { value: -3 }, opponentReward: { value: 3 } },
        // Scissors vs Paper (scissors wins: 5)
        { playerActionId: 'scissors', opponentActionId: 'paper', nextNodeId: '', isTerminal: true, playerReward: { value: 5 }, opponentReward: { value: -5 } },
        // Scissors vs Scissors
        { playerActionId: 'scissors', opponentActionId: 'scissors', nextNodeId: '', isTerminal: true, playerReward: { value: 0 }, opponentReward: { value: 0 } },
    ];

    const root: Node = {
        id: 'root',
        description: 'Guriko Janken',
        playerActions,
        opponentActions,
        transitions,
    };

    return { id: 'guriko', root };
}

describe('CFRSolver', () => {
    describe('Rock Paper Scissors', () => {
        it('should converge to uniform strategy for RPS', () => {
            const gameTree = createRockPaperScissorsGame();
            const solver = new CFRSolver(gameTree);

            solver.solve(10000);

            const strategy = solver.getRootStrategy();
            expect(strategy).not.toBeNull();

            const rockProb = strategy!.get('rock') ?? 0;
            const paperProb = strategy!.get('paper') ?? 0;
            const scissorsProb = strategy!.get('scissors') ?? 0;

            // In RPS, optimal strategy is uniform (1/3 each)
            // Allow some tolerance for convergence
            expect(rockProb).toBeCloseTo(1 / 3, 1);
            expect(paperProb).toBeCloseTo(1 / 3, 1);
            expect(scissorsProb).toBeCloseTo(1 / 3, 1);

            // Probabilities should sum to 1
            expect(rockProb + paperProb + scissorsProb).toBeCloseTo(1.0, 5);
        });

        it('should have all probabilities between 0 and 1', () => {
            const gameTree = createRockPaperScissorsGame();
            const solver = new CFRSolver(gameTree);

            solver.solve(1000);

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
            const solver = new CFRSolver(gameTree);

            solver.solve(20000);

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

            console.log('Biased game strategy:', {
                strike: strikeProb,
                throw: throwProb
            });
        });

        it('should converge to a mixed strategy', () => {
            const gameTree = createBiasedRewardGame();
            const solver = new CFRSolver(gameTree);

            solver.solve(20000);

            const strategy = solver.getRootStrategy();
            expect(strategy).not.toBeNull();

            // Strategy should not be pure (all probability on one action)
            // in a balanced game
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
            const solver = new CFRSolver(gameTree);

            solver.solve(20000);

            const strategy = solver.getRootStrategy();
            expect(strategy).not.toBeNull();

            const strikeProb = strategy!.get('strike') ?? 0;
            const throwProb = strategy!.get('throw') ?? 0;

            // Even though strike has higher reward, throw should still have
            // some probability because:
            // - Strike can be blocked by guard (0 points)
            // - Throw can beat guard (1000 points)
            // - But throw loses to vertical_jump (-1000 points)

            // Both actions should have significant probability
            expect(strikeProb).toBeGreaterThan(0.1);
            expect(throwProb).toBeGreaterThan(0.1);

            console.log('Strategy considering defender counters:', {
                strike: strikeProb,
                throw: throwProb
            });
        });
    });

    describe('Guriko Janken (weighted RPS)', () => {
        it('should converge to expected mixed strategy 5/14, 6/14, 3/14', () => {
            const gameTree = createGurikoJanken();
            const solver = new CFRSolver(gameTree);

            solver.solve(20000);

            const strategy = solver.getRootStrategy();
            expect(strategy).not.toBeNull();

            const rockProb = strategy!.get('rock') ?? 0;
            const paperProb = strategy!.get('paper') ?? 0;
            const scissorsProb = strategy!.get('scissors') ?? 0;

            // Expected optimal mix (Rock, Scissors, Paper): 5/14, 6/14, 3/14
            expect(rockProb).toBeCloseTo(5 / 14, 1);
            expect(scissorsProb).toBeCloseTo(6 / 14, 1);
            expect(paperProb).toBeCloseTo(3 / 14, 1);

            expect(rockProb + paperProb + scissorsProb).toBeCloseTo(1.0, 4);

            // Expected value near 0 for zero-sum equilibrium
            const expectedValue =
                rockProb * (3 * scissorsProb - 6 * paperProb) +
                paperProb * (6 * rockProb - 5 * scissorsProb) +
                scissorsProb * (5 * paperProb - 3 * rockProb);
            expect(Math.abs(expectedValue)).toBeLessThan(0.0001);
        });
    });
});
