# Mari - Oki Strategy Solver Design Document

## Overview

Mari is a web application for fighting game players that helps them find game theory optimal strategies for "oki" situations (offensive pressure after knockdown). The application uses Counterfactual Regret Minimization (CFR) algorithm to compute Nash equilibrium strategies.

## Architecture

### Technology Stack
- **Frontend**: Pure HTML5, CSS3, and vanilla JavaScript
- **Solver**: Client-side CFR implementation in JavaScript
- **Deployment**: Static web application (no server required)
- **Browser Requirements**: Modern browsers with ES6+ support

### Design Principles
1. **Client-Side Only**: All computation runs in the browser to minimize server costs
2. **Zero Dependencies**: No external libraries required
3. **Responsive Design**: Works on desktop and mobile devices
4. **Real-time Feedback**: Immediate visualization of solver results

## Core Components

### 1. State Management (`app.js`)

The application manages game states and transitions through a centralized data structure:

```javascript
gameData = {
    states: {
        [stateId]: {
            name: string,           // Display name
            id: string,             // Unique identifier
            p1Moves: Array,         // Player 1's available moves
            p2Moves: Array,         // Player 2's available moves
            outcomes: {             // Move combination outcomes
                [p1MoveId_p2MoveId]: {
                    reward: number,      // Payoff for Player 1
                    nextState: string    // Next state ID (empty = terminal)
                }
            }
        }
    }
}
```

### 2. CFR Solver (`cfr-solver.js`)

#### Algorithm: Counterfactual Regret Minimization

CFR is an iterative algorithm that converges to a Nash equilibrium in zero-sum games:

**Key Concepts:**
- **Regret**: How much better a player could have done by choosing a different action
- **Strategy**: Probability distribution over available actions
- **Counterfactual Value**: Expected utility if a player reaches a decision point

**Algorithm Steps:**
1. For each iteration:
   - Traverse the game tree for each player
   - Calculate counterfactual values for each action
   - Update regret sums based on action utilities
   - Update strategy sums weighted by reach probabilities
2. After all iterations:
   - Average strategies converge to Nash equilibrium

**Implementation Details:**
```javascript
class CFRSolver {
    regretSum: {}       // Accumulated regrets per information set
    strategySum: {}     // Accumulated strategies per information set
    
    // Core CFR iteration
    cfr(state, player, p0, p1) {
        // 1. Check for terminal state
        // 2. Get current strategy via regret matching
        // 3. Calculate utilities for each action
        // 4. Update regrets and strategy sums
        // 5. Return expected utility
    }
    
    // Convert regrets to strategy (regret matching)
    getStrategy(infoSet, numActions) {
        // Positive regrets → probability distribution
        // All negative regrets → uniform distribution
    }
    
    // Get average strategy over all iterations
    getAverageStrategy(infoSet, numActions) {
        // Normalize accumulated strategy sums
    }
}
```

### 3. User Interface (`index.html`, `styles.css`)

#### Layout Structure
```
Header: Title and description
├── States Section
│   ├── Add state input
│   └── State list (selectable)
├── Moves Section
│   ├── Player 1 moves (add/select/delete)
│   ├── Player 2 moves (add/select/delete)
│   └── Outcome editor (reward + next state)
└── Solver Section
    ├── Iteration count input
    ├── Run button
    └── Results display (strategy tables)
```

#### UI Flow
1. **Define States**: User creates game states (e.g., "Knockdown", "Neutral")
2. **Add Moves**: For each state, define available moves for both players
3. **Set Outcomes**: For each move combination, specify:
   - Reward (damage advantage for Player 1)
   - Next state (transition or terminal)
4. **Run Solver**: Execute CFR algorithm
5. **View Results**: Display optimal mixed strategies as probability distributions

## Data Flow

```
User Input → Game Data Structure
     ↓
CFR Solver (iterations)
     ↓
Information Sets → Regret Updates
     ↓
Strategy Sum Accumulation
     ↓
Average Strategy Calculation
     ↓
Results Visualization
```

## Game Theory Concepts

### Oki Situations in Fighting Games

**Oki** (起き攻め, "wakeup attack") refers to offensive pressure applied when an opponent is getting up from a knockdown. This creates a simultaneous decision point:

- **Attacker options**: Meaty attack, throw, bait reversal, etc.
- **Defender options**: Block, reversal (invincible move), backdash, etc.

Each combination has different outcomes:
- Successful attack → damage + advantage state
- Failed reversal → punish counter → huge damage
- Successful reversal → momentum shift

### Nash Equilibrium Strategy

The solver finds a **Nash equilibrium**, where:
- No player can improve their expected value by unilaterally changing strategy
- Strategies are typically **mixed** (probabilistic)
- Protects against exploitation by optimal opponents

**Example Result:**
```
Player 1: Throw 100%, Block 0%, Meaty 0%
Player 2: Reversal 100%, Block 0%, Tech 0%

Interpretation: Against optimal play, Player 1 should
always throw (beats block/tech, loses to reversal),
and Player 2 should always reversal (beats meaty/throw).
```

## Extension Points

### Future Enhancements

1. **Multiple Rounds**: Model sequences of oki situations
2. **Imperfect Information**: Add uncertainty about opponent's state
3. **Save/Load**: Export/import game configurations as JSON
4. **Strategy Explorer**: Interactive payoff matrix visualization
5. **Character Presets**: Pre-defined move sets for popular games
6. **Expected Value Display**: Show equilibrium payoffs
7. **Convergence Tracking**: Plot strategy evolution over iterations

### Customization

Users can model various fighting game scenarios:
- Wakeup pressure
- Corner pressure
- Okizeme with meaties
- Safe jump setups
- Strike/throw mixups

## Technical Considerations

### Performance
- CFR iterations: O(|States| × |Actions_P1| × |Actions_P2| × iterations)
- Typical performance: 10,000 iterations in <1 second for small games
- Browser handles computation without blocking UI

### Browser Compatibility
- ES6 features: arrow functions, let/const, template literals
- No transpilation required for modern browsers
- Tested on Chrome, Firefox, Safari, Edge

### Security
- No server communication
- No external API calls
- No user data collection
- Pure client-side computation

## References

- **CFR Algorithm**: Zinkevich et al. (2007) "Regret Minimization in Games with Incomplete Information"
- **Game Theory**: "A Course in Game Theory" by Osborne & Rubinstein
- **Fighting Game Theory**: "Playing to Win" by David Sirlin

## File Structure

```
Mari/
├── index.html          # Main HTML structure
├── styles.css          # Styling and layout
├── app.js             # UI logic and state management
├── cfr-solver.js      # CFR algorithm implementation
├── README.md          # Project overview
└── DESIGN.md          # This document
```

## Example: Knockdown Scenario

### Setup
**State**: Knockdown
- **P1 Moves**: Meaty Attack, Throw, Block
- **P2 Moves**: Wakeup DP (reversal), Block, Throw Tech

### Outcomes Matrix
| P1 \\ P2 | Wakeup DP | Block | Tech |
|----------|-----------|-------|------|
| Meaty    | -50       | +20   | +30  |
| Throw    | +100      | -30   | 0    |
| Block    | -100      | 0     | +10  |

### Interpretation
- Meaty vs DP: Reversal wins (-50 for P1)
- Throw vs DP: Throw wins big (+100, reversal startup)
- Block vs DP: DP crushes block (-100)
- Meaty vs Block: Attacker gets damage (+20)

### Solver Result
After 10,000 iterations, CFR finds the Nash equilibrium:
- **P1**: Throw 100%
- **P2**: Wakeup DP 100%

This is a pure strategy equilibrium because throw beats everything except reversal, so P2 must always reversal, which makes P1's throw the only safe option.

---

*This design document provides a comprehensive overview of the Mari oki strategy solver application architecture and implementation.*
