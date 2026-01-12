# Mari - Oki Strategy Solver 🎮

A web application for fighting game players to find game theory optimal strategies for oki situations using Counterfactual Regret Minimization (CFR).

## Features

- **State Management**: Define game situations (knockdown, neutral, corner pressure, etc.)
- **Move Editor**: Create moves for both players with outcomes
- **Outcome Configuration**: Set rewards (damage) and state transitions for each move combination
- **CFR Solver**: Compute Nash equilibrium strategies running entirely in your browser
- **Strategy Visualization**: View optimal mixed strategies as probability distributions

## Quick Start

1. Open `index.html` in a modern web browser
2. Define states (e.g., "Knockdown", "Neutral")
3. Add moves for Player 1 and Player 2
4. Select move pairs and configure outcomes (reward + next state)
5. Click "Run CFR Solver" to compute optimal strategies

## Example: Knockdown Oki

The application includes a pre-loaded example:

**State**: Knockdown
- **Player 1 Moves**: Meaty Attack, Throw, Block
- **Player 2 Moves**: Wakeup DP, Block, Throw Tech

Run the solver to find the optimal strategy for both players!

## How It Works

Mari uses **Counterfactual Regret Minimization (CFR)**, an iterative algorithm that:
1. Simulates many playouts of the game
2. Tracks "regret" for not choosing each action
3. Adjusts strategies to minimize regret
4. Converges to a Nash equilibrium

The entire computation runs client-side - no server required!

## Technology

- Pure HTML5, CSS3, and vanilla JavaScript
- No external dependencies
- Works offline
- Mobile-friendly responsive design

## Use Cases

- Analyze wakeup pressure scenarios
- Study strike/throw mixups
- Find optimal defense patterns
- Compare risk/reward of different options
- Learn game theory concepts

## Documentation

See [DESIGN.md](DESIGN.md) for detailed architecture and implementation details.

## License

MIT License - feel free to use and modify for your fighting game analysis!