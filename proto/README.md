# Protocol Buffers Schema for Game Tree Structure

This directory contains Protocol Buffers schema definitions for modeling game trees and decision trees in the Mari project.

## Overview

The `game_tree.proto` file defines a comprehensive schema for representing game trees used in strategy solving and decision modeling. The schema supports:

- **Game tree structure**: Hierarchical representation of game states and decisions
- **Player states**: Flexible state representation with type-safe values
- **Actions**: Differentiated between player and opponent actions
- **Transitions**: State transitions with probabilities and rewards
- **Terminal states**: End game states with outcomes and rewards
- **Strategies**: Strategy representation for solution concepts
- **Solutions**: Support for various solution concepts (Nash equilibrium, minimax, etc.)

## Key Components

### GameTree
The root message containing the entire game tree structure and metadata.

### Node
Represents a node in the game tree, which can be either:
- **IntermediateNode**: A decision point where actions are available
- **TerminalNode**: An end state with final rewards and outcomes

### PlayerState
Represents the game state at a particular node with:
- General state variables (key-value map)
- Player-specific states
- Optional serialized state representation

### Action
Represents an action that can be taken, differentiated by:
- **PlayerAction**: Actions taken by the primary player
- **OpponentAction**: Actions taken by the opponent, with modeling information

### Transition
Represents a state transition triggered by an action, including:
- Target node
- Transition probability (for stochastic games)
- Immediate rewards

### Reward
Represents rewards at terminal nodes with:
- Player-specific rewards
- Reward types (win, loss, draw, etc.)
- Reward values

### Strategy and Solution
Support for representing:
- Pure and mixed strategies
- Various solution concepts (Nash equilibrium, minimax, etc.)
- Solution quality metrics and computation metadata

## Usage

### Compiling the Schema

To generate code from the protocol buffers schema:

```bash
# For C++
protoc --cpp_out=. proto/game_tree.proto

# For Python
protoc --python_out=. proto/game_tree.proto

# For Java
protoc --java_out=. proto/game_tree.proto

# For Go
protoc --go_out=. proto/game_tree.proto
```

### Example Structure

A simple game tree might look like:

```
GameTree
  └─ Root Node (Intermediate)
      ├─ Action 1 → Transition → Node A (Terminal)
      │                           └─ Rewards: Player1=1.0, Player2=0.0
      └─ Action 2 → Transition → Node B (Terminal)
                                  └─ Rewards: Player1=0.0, Player2=1.0
```

## Design Principles

1. **Extensibility**: The schema uses flexible key-value maps for state variables and metadata to support various game types without schema changes.

2. **Type Safety**: Strong typing for critical fields like players, actions, and outcomes.

3. **Player Differentiation**: Clear distinction between player and opponent actions for asymmetric games.

4. **Probabilistic Support**: Built-in support for stochastic games with transition probabilities.

5. **Strategy Modeling**: Support for representing various strategy types and solution concepts.

6. **Opponent Modeling**: Explicit support for modeling opponent behavior with confidence metrics.

## Schema Version

Current version: 1.0.0

## Integration Points

This schema is designed to integrate with:
- Strategy solvers (Nash equilibrium, minimax, etc.)
- Game simulators
- Decision tree visualization tools
- Machine learning training pipelines
- Opponent modeling systems

## Future Extensions

Potential future additions:
- Imperfect information representation (information sets)
- Partial observability support
- Multi-agent coordination
- Temporal game extensions
- Bayesian game support
