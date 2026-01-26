import { CornerState } from '@nomari/ts-proto';
import {
    calculateRewardForWinProbability,
    calculateRewardForWinProbabilityWithCorner,
    calculateRewardForDamageRace,
} from './reward';

describe('reward', () => {
    describe('calculateRewardForWinProbability', () => {
        it('should return +10000 for win probability 1 (certain win)', () => {
            expect(calculateRewardForWinProbability(1)).toBe(10000);
        });

        it('should return -10000 for win probability 0 (certain loss)', () => {
            expect(calculateRewardForWinProbability(0)).toBe(-10000);
        });

        it('should return 0 for win probability 0.5 (even match)', () => {
            expect(calculateRewardForWinProbability(0.5)).toBe(0);
        });

        it('should return positive reward for win probability > 0.5', () => {
            expect(calculateRewardForWinProbability(0.75)).toBe(5000);
        });

        it('should return negative reward for win probability < 0.5', () => {
            expect(calculateRewardForWinProbability(0.25)).toBe(-5000);
        });
    });

    describe('calculateRewardForDamageRace', () => {
        it('should return 0 when damage dealt equals damage received', () => {
            // Initial: player 10000, opponent 10000
            // Current: player 8000 (received 2000), opponent 8000 (dealt 2000)
            expect(calculateRewardForDamageRace(8000, 8000, 10000, 10000)).toBe(0);
        });

        it('should return positive when player dealt more damage', () => {
            // Initial: player 10000, opponent 10000
            // Current: player 10000 (received 0), opponent 7000 (dealt 3000)
            expect(calculateRewardForDamageRace(10000, 7000, 10000, 10000)).toBe(3000);
        });

        it('should return negative when player received more damage', () => {
            // Initial: player 10000, opponent 10000
            // Current: player 7000 (received 3000), opponent 10000 (dealt 0)
            expect(calculateRewardForDamageRace(7000, 10000, 10000, 10000)).toBe(-3000);
        });

        it('should calculate damage race correctly with asymmetric damage', () => {
            // Initial: player 10000, opponent 10000
            // Current: player 6000 (received 4000), opponent 5000 (dealt 5000)
            // Damage race = 5000 - 4000 = 1000
            expect(calculateRewardForDamageRace(6000, 5000, 10000, 10000)).toBe(1000);
        });
    });

    describe('calculateRewardForWinProbabilityWithCorner', () => {
        // Base combo damage = 2000 (default)

        describe('equal HP scenarios', () => {
            it('should return 0 when both players have equal HP and no gauge', () => {
                const reward = calculateRewardForWinProbabilityWithCorner(
                    10000, // playerHealth
                    10000, // opponentHealth
                    undefined, // cornerState
                    0 // cornerBonus
                );
                // Equal HP means equal turns to kill -> 50% win probability -> 0 reward
                expect(reward).toBe(0);
            });

            it('should return 0 when both have equal HP with equal gauges', () => {
                const reward = calculateRewardForWinProbabilityWithCorner(
                    8000, // playerHealth
                    8000, // opponentHealth
                    undefined, // cornerState
                    0, // cornerBonus
                    100, // playerOd
                    100, // opponentOd
                    50, // playerSa
                    50 // opponentSa
                );
                expect(reward).toBe(0);
            });
        });

        describe('HP advantage scenarios', () => {
            it('should return positive reward when player has HP advantage', () => {
                const reward = calculateRewardForWinProbabilityWithCorner(
                    10000, // playerHealth
                    4000, // opponentHealth
                    undefined, // cornerState
                    0 // cornerBonus
                );
                // Player needs 2 turns (4000 / 2000 = 2)
                // Opponent needs 5 turns (10000 / 2000 = 5)
                // Win probability = 5 / (2 + 5) = 5/7 ≈ 0.714
                expect(reward).toBeGreaterThan(0);
            });

            it('should return negative reward when opponent has HP advantage', () => {
                const reward = calculateRewardForWinProbabilityWithCorner(
                    4000, // playerHealth
                    10000, // opponentHealth
                    undefined, // cornerState
                    0 // cornerBonus
                );
                expect(reward).toBeLessThan(0);
            });
        });

        describe('corner state scenarios', () => {
            it('should give player advantage when opponent is in corner', () => {
                // Use HP=5000 to ensure corner bonus affects turn count
                // Without corner: lethal=2000, remaining=3000, ceil(3000/2000)=2, total=3
                // With corner: lethal=2500, remaining=2500, ceil(2500/2500)=1, total=2
                const rewardNoCorner = calculateRewardForWinProbabilityWithCorner(
                    5000, 5000, undefined, 500
                );
                const rewardWithCorner = calculateRewardForWinProbabilityWithCorner(
                    5000, 5000, CornerState.OPPONENT_IN_CORNER, 500
                );
                // Player gets corner bonus -> fewer turns to kill -> higher reward
                expect(rewardWithCorner).toBeGreaterThan(rewardNoCorner);
            });

            it('should give opponent advantage when player is in corner', () => {
                // Use HP=5000 to ensure corner bonus affects turn count
                const rewardNoCorner = calculateRewardForWinProbabilityWithCorner(
                    5000, 5000, undefined, 500
                );
                const rewardWithCorner = calculateRewardForWinProbabilityWithCorner(
                    5000, 5000, CornerState.PLAYER_IN_CORNER, 500
                );
                // Opponent gets corner bonus -> fewer turns to kill -> lower reward
                expect(rewardWithCorner).toBeLessThan(rewardNoCorner);
            });
        });

        describe('OD/SA gauge scenarios', () => {
            it('should give advantage to player with more OD gauge', () => {
                // Use HP=5000 to ensure OD bonus affects turn count
                // Without OD: lethal=2000, remaining=3000, ceil(3000/2000)=2, total=3
                // With OD: lethal=2000+100*10=3000, remaining=2000, ceil(2000/2000)=1, total=2
                const rewardEqual = calculateRewardForWinProbabilityWithCorner(
                    5000, 5000, undefined, 0,
                    0, 0, 0, 0, // OD and SA
                    10, 0 // odBonus, saBonus
                );
                const rewardPlayerOd = calculateRewardForWinProbabilityWithCorner(
                    5000, 5000, undefined, 0,
                    100, 0, 0, 0, // Player has 100 OD
                    10, 0 // odBonus = 10 per OD point
                );
                // Player's lethal damage = 2000 + 100*10 = 3000
                expect(rewardPlayerOd).toBeGreaterThan(rewardEqual);
            });

            it('should give advantage to player with more SA gauge', () => {
                // Use HP=5000 to ensure SA bonus affects turn count
                const rewardEqual = calculateRewardForWinProbabilityWithCorner(
                    5000, 5000, undefined, 0,
                    0, 0, 0, 0,
                    0, 20 // saBonus
                );
                const rewardPlayerSa = calculateRewardForWinProbabilityWithCorner(
                    5000, 5000, undefined, 0,
                    0, 0, 100, 0, // Player has 100 SA
                    0, 20 // saBonus = 20 per SA point
                );
                // Player's lethal damage = 2000 + 100*20 = 4000
                expect(rewardPlayerSa).toBeGreaterThan(rewardEqual);
            });
        });

        describe('turns to kill calculation', () => {
            it('should calculate 1 turn when lethal can kill in one hit', () => {
                // Player has high SA, can kill in 1 turn
                const reward = calculateRewardForWinProbabilityWithCorner(
                    10000, // playerHealth
                    3000, // opponentHealth - less than base damage + SA bonus
                    undefined, 0,
                    0, 0, 100, 0, // Player has 100 SA
                    0, 20 // saBonus = 20 per SA point -> lethal = 2000 + 2000 = 4000
                );
                // Player kills in 1 turn (4000 >= 3000)
                // Opponent needs 5 turns (10000 / 2000 = 5)
                // Win probability = 5 / (1 + 5) = 5/6 ≈ 0.833
                expect(reward).toBeGreaterThan(5000); // > 0.75 win probability
            });

            it('should handle custom base combo damage', () => {
                // With base damage 5000, player kills in 2 turns
                const rewardHighBase = calculateRewardForWinProbabilityWithCorner(
                    10000, 10000, undefined, 0,
                    0, 0, 0, 0,
                    0, 0, // no gauge bonuses
                    5000 // higher base combo damage
                );
                // Both need 2 turns -> 50% win probability
                expect(rewardHighBase).toBe(0);
            });
        });
    });
});
