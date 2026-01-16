# Solver

Game solver implementations for solving imperfect information games.

## Overview

This package contains implementations of algorithms for finding Nash equilibrium strategies for two-player zero-sum games defined using the game tree structure from `@mari/game-tree`.

## Solvers

### CFR Solver

CFR (Counterfactual Regret Minimization) solver is an iterative algorithm that converges to a Nash equilibrium through repeated self-play.

### LP Solver

LP (Linear Programming) solver computes the exact Nash equilibrium for simultaneous games using linear programming. It:
1. Sorts the game tree in topological order
2. Solves from terminal nodes backwards using LP
3. Computes optimal mixed strategies efficiently

The LP solver typically finds the exact solution faster than CFR for small to medium-sized games.

## Files

- `cfr.ts`: CFR solver implementation
- `cfr.test.ts`: Unit tests for CFR solver
- `lp.ts`: LP solver implementation  
- `lp.test.ts`: Unit tests for LP solver

## Usage

### CFR Solver

```typescript
import { CFRSolver } from '@mari/solver/cfr';
import { GameTree } from '@mari/game-tree/game-tree';

const gameTree: GameTree = { /* ... */ };
const solver = new CFRSolver(gameTree);

// Run CFR iterations
solver.solve(10000);

// Get the optimal strategy
const strategy = solver.getRootStrategy();
```

### LP Solver

```typescript
import { LPSolver } from '@mari/solver/lp';
import { GameTree } from '@mari/game-tree/game-tree';

const gameTree: GameTree = { /* ... */ };
const solver = new LPSolver(gameTree);

// Solve using LP (no iterations needed)
solver.solve();

// Get the optimal strategy
const strategy = solver.getRootStrategy();
```

Both solvers have the same interface:
- `solve(iterations?)`: Solve the game
- `getRootStrategy()`: Get strategy at root node
- `getAverageStrategy(nodeId)`: Get strategy at specific node
- `getAverageOpponentStrategy(nodeId)`: Get opponent strategy at specific node

## Testing

```bash
npm install
npm test
```

## Biased Reward Game

The biased reward game tests the solvers with asymmetric rewards:

- **Attacker actions**: Strike (攻撃), Throw (投げ)
- **Defender actions**: Guard (ガード), Throw Escape (投げ抜け), Vertical Jump (垂直ジャンプ)

Rules:
- Guard blocks strike but no counter (draw: 0 points)
- Throw escape only works against throw (draw: 0 points)
- Vertical jump only beats throw (defender wins: -1000 for attacker)

Rewards:
- Strike wins: 3000 points
- Throw wins: 1000 points

The solvers should learn that strike is preferred over throw due to higher reward, while accounting for defender counter-strategies.
