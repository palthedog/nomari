# Solver

Game solver implementations for solving imperfect information games.

## Overview

This package contains implementations of algorithms for finding Nash equilibrium strategies for two-player zero-sum games defined using the game tree structure from `@nomari/game-tree`.

## Solvers

### LP Solver

LP (Linear Programming) solver computes the exact Nash equilibrium for simultaneous games using linear programming. It:
1. Sorts the game tree in topological order
2. Solves from terminal nodes backwards using LP
3. Computes optimal mixed strategies efficiently

## Files

- `lp.ts`: LP solver implementation  
- `lp.test.ts`: Unit tests for LP solver

## Usage

### LP Solver

```typescript
import { LPSolver } from '@nomari/solver/lp';
import { GameTree } from '@nomari/game-tree/game-tree';

const gameTree: GameTree = { /* ... */ };
const solver = new LPSolver(gameTree);

// Solve using LP (no iterations needed)
solver.solve();

// Get the optimal strategy
const strategy = solver.getRootStrategy();
```

The LP solver provides the following interface:
- `solve()`: Solve the game
- `getRootStrategy()`: Get strategy at root node
- `getAverageStrategy(nodeId)`: Get strategy at specific node
- `getAverageOpponentStrategy(nodeId)`: Get opponent strategy at specific node

## Testing

```bash
npm install
npm test
```

## Biased Reward Game

The biased reward game tests the solver with asymmetric rewards:

- **Attacker actions**: Strike (攻撃), Throw (投げ)
- **Defender actions**: Guard (ガード), Throw Escape (投げ抜け), Vertical Jump (垂直ジャンプ)

Rules:
- Guard blocks strike but no counter (draw: 0 points)
- Throw escape only works against throw (draw: 0 points)
- Vertical jump only beats throw (defender wins: -1000 for attacker)

Rewards:
- Strike wins: 3000 points
- Throw wins: 1000 points

The solver should learn that strike is preferred over throw due to higher reward, while accounting for defender counter-strategies.
