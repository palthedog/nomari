# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nomari is a Game Theory Optimal (GTO) solver for fighting games (Street Fighter 6). It computes optimal mixed strategies for situations like wake-up (oki) attacks using linear programming.

## Commands

```bash
# Install dependencies
npm install

# Run all tests (run after every code change)
npm run test

# Run tests for a specific package
npm run test --workspace=@nomari/solver
npm run test --workspace=@nomari/game-tree-builder

# Watch mode for tests
npm run test:watch --workspace=@nomari/solver

# Start frontend dev server
npm run dev --workspace=@nomari/frontend

# Build all packages
npm run build

# Build for GitHub Pages
npm run build:pages
```

## Architecture

### Monorepo Structure

- `apps/frontend/` - Vue 3 web application with Vuetify UI
- `packages/solver/` - Linear programming solver using javascript-lp-solver
- `packages/game-tree-builder/` - Builds game trees from protobuf definitions
- `packages/game-tree/` - TypeScript interfaces for game tree data structures
- `packages/ts-proto/` - Generated TypeScript types from protobuf
- `proto/game.proto` - Protocol Buffer schema (source of truth for data model)

### Data Flow

1. User defines game situations in UI (stored as `GameDefinition` protobuf)
2. `game-tree-builder` expands definition into a game tree, handling dynamic state (health, gauges)
3. `solver` runs LP algorithm on tree (in Web Worker) to compute optimal strategies
4. Results displayed in frontend

### Key Concepts

- **Situation**: A game state with player/opponent action choices and transitions
- **TerminalSituation**: End state with rewards
- **ComboStarter**: Branching node with multiple routes based on gauge requirements
- **DynamicState**: Tracks resources (health, OD gauge, SA gauge)
- **RewardComputationMethod**: Either DamageRace or WinProbability calculation

## Code Style

- **Comments**: All source code comments must be in English
- **File naming**: Use kebab-case (e.g., `game-tree-builder.ts`, not `gameTreeBuilder.ts`)
- **Error handling**:
  - Never throw exceptions; return `bool` or `null` to indicate errors
  - Callers must check return values and propagate errors up the call chain
  - Never use global/class-level error flags (e.g., `buildError`) to track state
  - Log errors with `log.error()` or `log.warn()` before returning
  - For user input errors, use notification-store to display messages
- **Block size**: Keep blocks under ~50 lines; extract meaningful functions even if used only once
- **Nesting**: Keep nesting shallow (max 4 levels); use early return pattern
- **Inner functions**: Avoid unless necessary

## Development Guidelines

- Always run `npm run test` after code changes to verify all packages pass
- Solver changes require unit tests
- UI changes require screenshots in PR
- Ask for confirmation before proceeding when user's proposed implementation has issues
- Do not commit without user confirmation, except for trivial changes like adding logs
- Do not include `Co-Authored-By` in commit messages
