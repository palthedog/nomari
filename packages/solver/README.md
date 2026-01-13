# Solver

CFR (Counterfactual Regret Minimization) Solver implementation for solving imperfect information games.

## Overview

This solver implements the CFR algorithm to find Nash equilibrium strategies for two-player zero-sum games defined using the game tree structure from `proto/game.proto`.

## Files

- `types.ts`: TypeScript type definitions for game proto messages
- `cfr.ts`: CFR solver implementation
- `cfr.test.ts`: Unit tests including:
  - Rock Paper Scissors game test
  - Biased reward game test (attacker vs defender)

## Usage

```typescript
import { CFRSolver } from './cfr';
import { GameTree } from './types';

const gameTree: GameTree = { /* ... */ };
const solver = new CFRSolver(gameTree);

// Run CFR iterations
solver.solve(10000);

// Get the optimal strategy
const strategy = solver.getRootStrategy();
```

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
