/**
 * Counterfactual Regret Minimization (CFR) Solver
 * Implements the CFR algorithm to find Nash equilibrium strategies
 * for sequential game situations.
 */

class CFRSolver {
    constructor(gameData) {
        this.gameData = gameData;
        this.regretSum = {}; // Accumulated regrets for each information set
        this.strategySum = {}; // Accumulated strategy for each information set
        this.nodeCount = 0;
    }

    /**
     * Get the current strategy for a given information set based on regret matching
     */
    getStrategy(infoSet, numActions) {
        if (!this.regretSum[infoSet]) {
            this.regretSum[infoSet] = new Array(numActions).fill(0);
        }
        if (!this.strategySum[infoSet]) {
            this.strategySum[infoSet] = new Array(numActions).fill(0);
        }

        const regrets = this.regretSum[infoSet];
        const strategy = new Array(numActions).fill(0);
        
        // Calculate positive regret sum
        let normalizingSum = 0;
        for (let i = 0; i < numActions; i++) {
            strategy[i] = regrets[i] > 0 ? regrets[i] : 0;
            normalizingSum += strategy[i];
        }

        // Normalize to create probability distribution
        if (normalizingSum > 0) {
            for (let i = 0; i < numActions; i++) {
                strategy[i] /= normalizingSum;
            }
        } else {
            // Uniform distribution if no positive regrets
            for (let i = 0; i < numActions; i++) {
                strategy[i] = 1.0 / numActions;
            }
        }

        return strategy;
    }

    /**
     * Get the average strategy over all iterations
     */
    getAverageStrategy(infoSet, numActions) {
        if (!this.strategySum[infoSet]) {
            return new Array(numActions).fill(1.0 / numActions);
        }

        const avgStrategy = new Array(numActions).fill(0);
        const strategySum = this.strategySum[infoSet];
        
        let normalizingSum = 0;
        for (let i = 0; i < numActions; i++) {
            normalizingSum += strategySum[i];
        }

        if (normalizingSum > 0) {
            for (let i = 0; i < numActions; i++) {
                avgStrategy[i] = strategySum[i] / normalizingSum;
            }
        } else {
            for (let i = 0; i < numActions; i++) {
                avgStrategy[i] = 1.0 / numActions;
            }
        }

        return avgStrategy;
    }

    /**
     * Recursive CFR algorithm
     * @param {string} state - Current state ID
     * @param {number} player - Current player (0 or 1)
     * @param {number} p0 - Reach probability for player 0
     * @param {number} p1 - Reach probability for player 1
     */
    cfr(state, player, p0, p1) {
        this.nodeCount++;

        // Check if this is a terminal state
        if (!this.gameData.states[state]) {
            return 0; // Terminal state with no additional reward
        }

        const stateData = this.gameData.states[state];
        const p1Moves = stateData.p1Moves || [];
        const p2Moves = stateData.p2Moves || [];

        if (p1Moves.length === 0 || p2Moves.length === 0) {
            return 0; // Cannot play from this state
        }

        // Information set for the current player
        const infoSet = `${state}_p${player + 1}`;
        const numActions = player === 0 ? p1Moves.length : p2Moves.length;
        const actions = player === 0 ? p1Moves : p2Moves;

        // Get current strategy
        const strategy = this.getStrategy(infoSet, numActions);

        // Track utility for each action
        const util = new Array(numActions).fill(0);
        let nodeUtil = 0;

        // For each action of the current player
        for (let i = 0; i < numActions; i++) {
            const myMove = actions[i];
            
            // Calculate expected utility against opponent's strategy
            let actionUtil = 0;
            const oppActions = player === 0 ? p2Moves : p1Moves;
            const oppInfoSet = `${state}_p${player === 0 ? 2 : 1}`;
            const oppStrategy = this.getStrategy(oppInfoSet, oppActions.length);

            for (let j = 0; j < oppActions.length; j++) {
                const oppMove = oppActions[j];
                
                // Get outcome for this move combination
                const outcomeKey = player === 0 
                    ? `${myMove.id}_${oppMove.id}`
                    : `${oppMove.id}_${myMove.id}`;
                
                const outcome = stateData.outcomes[outcomeKey];
                
                if (!outcome) {
                    continue; // No outcome defined for this combination
                }

                // Immediate reward (from player 0's perspective)
                let immediateReward = outcome.reward || 0;
                
                // Recursively calculate future value
                let futureValue = 0;
                if (outcome.nextState && outcome.nextState !== '') {
                    if (player === 0) {
                        futureValue = this.cfr(outcome.nextState, player, p0 * strategy[i], p1 * oppStrategy[j]);
                    } else {
                        futureValue = this.cfr(outcome.nextState, player, p0 * oppStrategy[j], p1 * strategy[i]);
                    }
                }

                const totalValue = immediateReward + futureValue;
                actionUtil += oppStrategy[j] * totalValue;
            }

            util[i] = actionUtil;
            nodeUtil += strategy[i] * util[i];
        }

        // Update regrets and strategy sum
        for (let i = 0; i < numActions; i++) {
            const regret = util[i] - nodeUtil;
            const oppReachProb = player === 0 ? p1 : p0;
            this.regretSum[infoSet][i] += oppReachProb * regret;
            
            const myReachProb = player === 0 ? p0 : p1;
            this.strategySum[infoSet][i] += myReachProb * strategy[i];
        }

        // Return utility from player 0's perspective
        return player === 0 ? nodeUtil : -nodeUtil;
    }

    /**
     * Train the CFR solver for a given number of iterations
     */
    train(iterations, startState = null) {
        // Reset node count for this training session
        this.nodeCount = 0;
        
        // Find starting state if not provided
        if (!startState) {
            const stateIds = Object.keys(this.gameData.states);
            if (stateIds.length === 0) {
                throw new Error('No states defined in the game');
            }
            startState = stateIds[0];
        }

        // Run CFR iterations, alternating starting player to reduce bias
        for (let i = 0; i < iterations; i++) {
            const startingPlayer = i % 2; // Alternate between Player 0 and Player 1
            this.cfr(startState, startingPlayer, 1, 1);
        }

        return this.getResults();
    }

    /**
     * Get the final results with average strategies
     */
    getResults() {
        const results = {};

        for (const infoSet in this.strategySum) {
            // Parse info set: "stateId_p1" or "stateId_p2"
            const parts = infoSet.split('_p');
            const stateId = parts[0];
            const player = parts[1];

            if (!results[stateId]) {
                results[stateId] = { p1: null, p2: null };
            }

            const stateData = this.gameData.states[stateId];
            const moves = player === '1' ? stateData.p1Moves : stateData.p2Moves;
            const strategy = this.getAverageStrategy(infoSet, moves.length);

            const moveStrategies = moves.map((move, idx) => ({
                moveName: move.name,
                probability: strategy[idx]
            }));

            results[stateId][`p${player}`] = moveStrategies;
        }

        return results;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CFRSolver;
}
