import {CornerState,} from '@nomari/ts-proto';
import log from 'loglevel';

// Configure log level based on environment
if (process.env.NODE_ENV === 'development') {
    log.setLevel('debug');
} else {
    log.setLevel('warn');
}

// Default base combo damage (used when not specified)
const DEFAULT_BASE_COMBO_DAMAGE = 2000;

/**
 * Calculates rewards for the player based on win probability.
 * Rewards are scaled so that winProbability=1 yields +10000,
 * winProbability=0 yields -10000, and 0.5 yields 0 for the player.
 * Opponent reward is the negative of the player reward.
 */
export function calculateRewardForWinProbability(winProbability: number): number {
    // Scale reward: -10000 to +10000 based on win probability
    // winProbability = 0 -> -10000, winProbability = 1 -> +10000
    return winProbability * 20000 - 10000;
}

/**
 * Calculate the number of turns (successful reads) needed to defeat the opponent.
 *
 * @param targetHealth - The opponent's remaining health
 * @param baseComboDamage - Base combo damage per turn
 * @param lethalDamage - Lethal combo damage (used only on the first turn)
 * @returns Number of turns needed to reduce targetHealth to 0 or below
 */
function calculateTurnsToKill(
    targetHealth: number,
    baseComboDamage: number,
    lethalDamage: number
): number {
    if (targetHealth <= 0) {
        return 0;
    }
    if (lethalDamage >= targetHealth) {
        return 1;
    }

    const remainingAfterLethal = targetHealth - lethalDamage;
    const additionalTurns = Math.ceil(remainingAfterLethal / baseComboDamage);
    return 1 + additionalTurns;
}

/**
 * Calculate reward based on "turns to kill" win probability.
 * Win probability is calculated by comparing how many successful reads each player
 * needs to defeat their opponent.
 *
 * @param playerHealth - Player's current health
 * @param opponentHealth - Opponent's current health
 * @param cornerState - Current corner state (who is in corner)
 * @param cornerBonus - Bonus damage when opponent is in corner
 * @param playerOd - Player's OD gauge value
 * @param opponentOd - Opponent's OD gauge value
 * @param playerSa - Player's SA gauge value
 * @param opponentSa - Opponent's SA gauge value
 * @param odBonus - Lethal damage bonus per OD gauge point
 * @param saBonus - Lethal damage bonus per SA gauge point
 * @param baseComboDamage - Base combo damage (defaults to DEFAULT_BASE_COMBO_DAMAGE)
 * @returns Reward value for the player
 */
export function calculateRewardForWinProbabilityWithCorner(
    playerHealth: number,
    opponentHealth: number,
    cornerState: CornerState | undefined,
    cornerBonus: number,
    playerOd: number = 0,
    opponentOd: number = 0,
    playerSa: number = 0,
    opponentSa: number = 0,
    odBonus: number = 0,
    saBonus: number = 0,
    baseComboDamage: number = DEFAULT_BASE_COMBO_DAMAGE
): number {
    // Calculate base combo damage with corner bonus for each player
    const playerBaseComboDamage = calculatePlayerBaseComboDamage(
        baseComboDamage,
        cornerState,
        cornerBonus,
        true
    );
    const opponentBaseComboDamage = calculatePlayerBaseComboDamage(
        baseComboDamage,
        cornerState,
        cornerBonus,
        false
    );

    // Calculate lethal combo damage (base + OD/SA bonus, corner bonus applies)
    const playerLethalDamage = playerBaseComboDamage + playerOd * odBonus + playerSa * saBonus;
    const opponentLethalDamage = opponentBaseComboDamage + opponentOd * odBonus + opponentSa * saBonus;

    // Calculate turns to kill for each player
    const playerTurnsToKill = calculateTurnsToKill(
        opponentHealth,
        playerBaseComboDamage,
        playerLethalDamage
    );
    const opponentTurnsToKill = calculateTurnsToKill(
        playerHealth,
        opponentBaseComboDamage,
        opponentLethalDamage
    );

    // Calculate win probability from turns ratio
    const winProbability = calculateWinProbabilityFromTurns(
        playerTurnsToKill,
        opponentTurnsToKill
    );

    const reward = calculateRewardForWinProbability(winProbability);
    log.debug('Win probability reward:', {
        playerHealth,
        opponentHealth,
        playerTurns: playerTurnsToKill,
        opponentTurns: opponentTurnsToKill,
        winProbability,
        reward,
    });

    return reward;
}

/**
 * Calculate base combo damage for a player considering corner state.
 */
function calculatePlayerBaseComboDamage(
    baseComboDamage: number,
    cornerState: CornerState | undefined,
    cornerBonus: number,
    isPlayer: boolean
): number {
    // Player gets corner bonus when opponent is in corner
    // Opponent gets corner bonus when player is in corner
    if (isPlayer && cornerState === CornerState.OPPONENT_IN_CORNER) {
        return baseComboDamage + cornerBonus;
    }
    if (!isPlayer && cornerState === CornerState.PLAYER_IN_CORNER) {
        return baseComboDamage + cornerBonus;
    }
    return baseComboDamage;
}

/**
 * Calculate win probability from turns to kill.
 * The player with fewer turns to kill has higher win probability.
 *
 * Note: Both players should have HP > 0 when this function is called.
 * HP <= 0 cases are handled by isTerminalState before reaching here.
 */
function calculateWinProbabilityFromTurns(
    playerTurns: number,
    opponentTurns: number
): number {
    if (playerTurns <= 0) {
        log.warn('calculateWinProbabilityFromTurns: playerTurns should be > 0, got:', playerTurns);
    }
    if (opponentTurns <= 0) {
        log.warn('calculateWinProbabilityFromTurns: opponentTurns should be > 0, got:', opponentTurns);
    }

    // Win probability based on inverse of turns ratio
    // Fewer turns = higher probability
    return opponentTurns / (playerTurns + opponentTurns);
}

/**
 * Calculate reward based on damage race (damage dealt - damage received).
 * No scaling is applied - the damage race value is used directly as reward.
 */
export function calculateRewardForDamageRace(
    playerHealth: number,
    opponentHealth: number,
    initialPlayerHealth: number,
    initialOpponentHealth: number
): number {
    const damageDealt = initialOpponentHealth - opponentHealth;
    const damageReceived = initialPlayerHealth - playerHealth;
    const damageRace = damageDealt - damageReceived;

    log.debug('Damage race reward:', {
        playerHealth,
        opponentHealth,
        damageDealt,
        damageReceived,
        reward: damageRace,
    });

    return damageRace;
}
