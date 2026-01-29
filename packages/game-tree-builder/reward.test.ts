import { CornerState } from '@nomari/ts-proto';
import {
    calculateRewardForWinProbability,
    calculateRewardForWinProbabilityWithCorner,
    calculateRewardForDamageRace,
} from './reward';

// =============================================================================
// calculateRewardForWinProbability
// =============================================================================
// Maps win probability [0, 1] to reward [-10000, +10000]
// - winProbability=1.0  -> +10000 (certain win)
// - winProbability=0.5  ->      0 (even match)
// - winProbability=0.0  -> -10000 (certain loss)

describe('calculateRewardForWinProbability', () => {
    it.each([
        {
            winProbability: 1.0,
            expected: 10000,
            label: 'certain win' 
        },
        {
            winProbability: 0.5,
            expected: 0,
            label: 'even match' 
        },
        {
            winProbability: 0.0,
            expected: -10000,
            label: 'certain loss' 
        },
        {
            winProbability: 0.75,
            expected: 5000,
            label: 'favorable (75%)' 
        },
        {
            winProbability: 0.25,
            expected: -5000,
            label: 'unfavorable (25%)' 
        },
    ])('$label -> $expected', ({ winProbability, expected }) => {
        expect(calculateRewardForWinProbability(winProbability)).toBe(expected);
    });
});

// =============================================================================
// calculateRewardForDamageRace
// =============================================================================
// reward = (damage dealt to opponent) - (damage received from opponent)

describe('calculateRewardForDamageRace', () => {
    // Helper: makes the test cases more readable
    const damageRace = (params: {
        playerHp: number;
        opponentHp: number;
        initialPlayerHp: number;
        initialOpponentHp: number;
    }) => {
        return calculateRewardForDamageRace(
            params.playerHp,
            params.opponentHp,
            params.initialPlayerHp,
            params.initialOpponentHp
        );
    };

    it.each([
        {
            label: 'even trade (both dealt 2000)',
            playerHp: 8000,
            opponentHp: 8000,
            initialPlayerHp: 10000,
            initialOpponentHp: 10000,
            expected: 0,
        },
        {
            label: 'player dealt 3000, received 0',
            playerHp: 10000,
            opponentHp: 7000,
            initialPlayerHp: 10000,
            initialOpponentHp: 10000,
            expected: 3000,
        },
        {
            label: 'player dealt 0, received 3000',
            playerHp: 7000,
            opponentHp: 10000,
            initialPlayerHp: 10000,
            initialOpponentHp: 10000,
            expected: -3000,
        },
        {
            label: 'asymmetric: dealt 5000, received 4000',
            playerHp: 6000,
            opponentHp: 5000,
            initialPlayerHp: 10000,
            initialOpponentHp: 10000,
            expected: 1000,
        },
    ])('$label -> $expected', ({ playerHp, opponentHp, initialPlayerHp, initialOpponentHp, expected }) => {
        expect(damageRace({
            playerHp,
            opponentHp,
            initialPlayerHp,
            initialOpponentHp 
        })).toBe(expected);
    });
});

// =============================================================================
// calculateRewardForWinProbabilityWithCorner
// =============================================================================
// Computes reward based on "turns to kill" ratio.
// - Each player's combo damage: baseComboDamage + cornerBonus (if attacking cornered opponent)
// - Lethal damage (first hit): baseComboDamage + OD*odBonus + SA*saBonus + cornerBonus
// - Win probability = opponentTurns / (playerTurns + opponentTurns)

describe('calculateRewardForWinProbabilityWithCorner', () => {
    // Default values for optional parameters
    const defaults = {
        cornerState: undefined as CornerState | undefined,
        cornerBonus: 0,
        playerOd: 0,
        opponentOd: 0,
        playerSa: 0,
        opponentSa: 0,
        odBonus: 0,
        saBonus: 0,
        baseComboDamage: 2000, // game default
    };

    // Helper: call with named parameters, using defaults for unspecified ones
    const winProbReward = (params: {
        playerHp: number;
        opponentHp: number;
        cornerState?: CornerState;
        cornerBonus?: number;
        playerOd?: number;
        opponentOd?: number;
        playerSa?: number;
        opponentSa?: number;
        odBonus?: number;
        saBonus?: number;
        baseComboDamage?: number;
    }) => {
        const p = {
            ...defaults,
            ...params 
        };
        return calculateRewardForWinProbabilityWithCorner(
            params.playerHp,
            params.opponentHp,
            p.cornerState,
            p.cornerBonus,
            p.playerOd,
            p.opponentOd,
            p.playerSa,
            p.opponentSa,
            p.odBonus,
            p.saBonus,
            p.baseComboDamage
        );
    };

    describe('equal HP (symmetric scenarios)', () => {
        it('both 10000 HP, no bonuses -> reward = 0', () => {
            expect(winProbReward({
                playerHp: 10000,
                opponentHp: 10000 
            })).toBe(0);
        });

        it('both 8000 HP with equal gauges -> reward = 0', () => {
            expect(
                winProbReward({
                    playerHp: 8000,
                    opponentHp: 8000,
                    playerOd: 100,
                    opponentOd: 100,
                    playerSa: 50,
                    opponentSa: 50,
                })
            ).toBe(0);
        });
    });

    describe('HP advantage', () => {
        it('player 10000 vs opponent 4000 -> positive reward', () => {
            // Player: 2 turns to kill (4000 / 2000)
            // Opponent: 5 turns to kill (10000 / 2000)
            // Win prob = 5/7 ≈ 0.714 -> reward > 0
            const reward = winProbReward({
                playerHp: 10000,
                opponentHp: 4000 
            });
            expect(reward).toBeGreaterThan(0);
        });

        it('player 4000 vs opponent 10000 -> negative reward', () => {
            const reward = winProbReward({
                playerHp: 4000,
                opponentHp: 10000 
            });
            expect(reward).toBeLessThan(0);
        });
    });

    describe('corner state effects', () => {
        // cornerBonus = 500 adds to base damage when attacking cornered opponent

        it('opponent in corner -> player advantage', () => {
            const noCorner = winProbReward({
                playerHp: 5000,
                opponentHp: 5000,
                cornerBonus: 500 
            });
            const withCorner = winProbReward({
                playerHp: 5000,
                opponentHp: 5000,
                cornerState: CornerState.OPPONENT_IN_CORNER,
                cornerBonus: 500,
            });
            expect(withCorner).toBeGreaterThan(noCorner);
        });

        it('player in corner -> opponent advantage', () => {
            const noCorner = winProbReward({
                playerHp: 5000,
                opponentHp: 5000,
                cornerBonus: 500 
            });
            const withCorner = winProbReward({
                playerHp: 5000,
                opponentHp: 5000,
                cornerState: CornerState.PLAYER_IN_CORNER,
                cornerBonus: 500,
            });
            expect(withCorner).toBeLessThan(noCorner);
        });
    });

    describe('gauge bonuses (OD/SA)', () => {
        // odBonus/saBonus add to lethal damage (first hit only)

        it('player OD advantage -> higher reward', () => {
            const baseline = winProbReward({
                playerHp: 5000,
                opponentHp: 5000,
                odBonus: 10,
            });
            const withOd = winProbReward({
                playerHp: 5000,
                opponentHp: 5000,
                playerOd: 100, // +1000 to lethal damage
                odBonus: 10,
            });
            expect(withOd).toBeGreaterThan(baseline);
        });

        it('player SA advantage -> higher reward', () => {
            const baseline = winProbReward({
                playerHp: 5000,
                opponentHp: 5000,
                saBonus: 20,
            });
            const withSa = winProbReward({
                playerHp: 5000,
                opponentHp: 5000,
                playerSa: 100, // +2000 to lethal damage
                saBonus: 20,
            });
            expect(withSa).toBeGreaterThan(baseline);
        });
    });

    describe('turns to kill calculation', () => {
        it('one-shot lethal (SA 100 + saBonus 20 = 4000 lethal vs 3000 HP)', () => {
            // Player lethal = 2000 + 100*20 = 4000, kills 3000 HP in 1 turn
            // Opponent needs 5 turns (10000 / 2000)
            // Win prob = 5/6 ≈ 0.833 -> reward > 5000
            const reward = winProbReward({
                playerHp: 10000,
                opponentHp: 3000,
                playerSa: 100,
                saBonus: 20,
            });
            expect(reward).toBeGreaterThan(5000);
        });

        it('higher base combo damage -> different turn counts', () => {
            // With base 5000: both need 2 turns -> 50% win prob -> reward = 0
            const reward = winProbReward({
                playerHp: 10000,
                opponentHp: 10000,
                baseComboDamage: 5000,
            });
            expect(reward).toBe(0);
        });
    });
});
