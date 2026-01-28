import { GameTree, Node } from '@nomari/game-tree/game-tree';

import log from 'loglevel';

if (process.env.NODE_ENV === 'development') {
    log.setLevel('debug');
} else {
    log.setLevel('warn');
}

// Import javascript-lp-solver (CommonJS module, but bundlers handle this)
import solver from 'javascript-lp-solver';

/**
 * Constant for shifting payoffs to ensure they're positive for LP solver
 */
const PAYOFF_SHIFT_OFFSET = 1;

/**
 * Prefix for player action variables in LP model to avoid collision with reserved names
 */
const PLAYER_ACTION_PREFIX = 'p_';

/**
 * Prefix for opponent action variables in LP model to avoid collision with reserved names
 */
const OPPONENT_ACTION_PREFIX = 'o_';

/**
 * LP model structure for javascript-lp-solver
 */
interface LPConstraint {
    min?: number;
    max?: number;
    equal?: number;
}

interface LPModel {
    optimize: string;
    opType: 'max' | 'min';
    constraints: Record<string, LPConstraint>;
    variables: Record<string, Record<string, number>>;
}

/**
 * LP solver result
 */
interface LPResult {
    feasible: boolean;
    result?: number;
    v?: number;
    [key: string]: boolean | number | undefined;
}

/**
 * Build payoff matrix for LP solver
 */
function buildPayoffMatrix(
    node: LPNode,
    forPlayer: boolean
): number[][] {
    const payoffMatrix: number[][] = [];
    for (const playerAction of node.playerActions) {
        const row: number[] = [];
        for (const oppAction of node.opponentActions) {
            const key = `${playerAction}-${oppAction}`;
            const reward = node.rewards.get(key);
            const child = node.children.get(key);

            let payoff = 0;
            if (reward) {
                payoff = forPlayer ? reward[0] : reward[1];
            } else if (child) {
                payoff = forPlayer ? child.playerValue : child.opponentValue;
            }
            row.push(payoff);
        }
        payoffMatrix.push(row);
    }
    return payoffMatrix;
}

/**
 * Calculate the shift needed to make all payoffs positive
 */
function calculatePayoffShift(payoffMatrix: number[][]): number {
    let minPayoff = Infinity;
    for (const row of payoffMatrix) {
        for (const val of row) {
            minPayoff = Math.min(minPayoff, val);
        }
    }
    return minPayoff < 0 ? -minPayoff + PAYOFF_SHIFT_OFFSET : 0;
}

/**
 * Extract strategy from LP result
 */
function extractStrategy(
    result: LPResult,
    actions: number[],
    prefix: string
): Map<number, number> {
    const strategy = new Map<number, number>();
    for (const action of actions) {
        const varName = `${prefix}${action}`;
        const prob = (result[varName] as number) ?? 0;
        strategy.set(action, prob);
    }
    return strategy;
}

/**
 * Create uniform strategy for given actions
 */
function createUniformStrategy(actions: number[]): Map<number, number> {
    const strategy = new Map<number, number>();
    const uniformProb = 1.0 / actions.length;
    for (const action of actions) {
        strategy.set(action, uniformProb);
    }
    return strategy;
}

/**
 * Internal node representation for LP solver computation
 */
class LPNode {
    nodeId: string;
    isTerminal: boolean;
    playerActions: number[];
    opponentActions: number[];
    children: Map<string, LPNode>; // key: `${playerActionId}-${opponentActionId}`
    rewards: Map<string, [number, number]>; // [playerReward, opponentReward]

    // LP solution results
    playerStrategy: Map<number, number>; // action -> probability
    opponentStrategy: Map<number, number>; // action -> probability
    playerValue: number; // expected payoff for player
    opponentValue: number; // expected payoff for opponent

    constructor(nodeId: string, isTerminal: boolean = false) {
        this.nodeId = nodeId;
        this.isTerminal = isTerminal;
        this.playerActions = [];
        this.opponentActions = [];
        this.children = new Map();
        this.rewards = new Map();
        this.playerStrategy = new Map();
        this.opponentStrategy = new Map();
        this.playerValue = 0;
        this.opponentValue = 0;
    }
}

/**
 * Linear Programming Solver for two-player zero-sum games
 * 
 * Solves the game using linear programming by:
 * 1. Sorting the game tree in topological order
 * 2. Solving from terminal nodes backwards using LP
 * 3. Computing optimal strategies for each node
 */
export class LPSolver {
    private gameTree: GameTree;
    private nodes: Map<string, LPNode>;
    private nodeMap: Map<string, Node>; // proto node lookup
    private topologicalOrder: string[]; // nodes in topological order
    private initialized: boolean = false;

    constructor(gameTree: GameTree) {
        this.gameTree = gameTree;
        this.nodes = new Map();
        this.nodeMap = new Map();
        this.topologicalOrder = [];
    }

    /**
     * Build internal LP node structure from proto GameTree.
     * Returns true on success, false on error.
     */
    private buildInternalTree(): boolean {
        const rootNode = this.gameTree.nodes[this.gameTree.root];
        if (!rootNode) {
            log.error(`Root node ${this.gameTree.root} not found in nodes map`);
            return false;
        }

        this.collectAllNodes(rootNode);

        if (!this.buildLPNode(rootNode)) {
            return false;
        }

        this.computeTopologicalOrder();
        this.initialized = true;
        return true;
    }

    /**
     * Recursively collect all nodes from the game tree
     */
    private collectAllNodes(node: Node): void {
        this.nodeMap.set(node.nodeId, node);

        for (const transition of node.transitions) {
            if (!transition.nextNodeId) {
                continue;
            }
            const nextNode = this.findNodeById(transition.nextNodeId);
            if (!nextNode || this.nodeMap.has(nextNode.nodeId)) {
                continue;
            }
            this.collectAllNodes(nextNode);
        }
    }

    /**
     * Find a node by ID (helper for building tree)
     */
    private findNodeById(nodeId: string): Node | undefined {
        // Try to find in already collected nodes
        if (this.nodeMap.has(nodeId)) {
            return this.nodeMap.get(nodeId);
        }

        // Try to find in GameTree's nodes map
        const node = this.gameTree.nodes[nodeId];
        if (node) {
            return node;
        }

        return undefined;
    }

    /**
     * Check if a node is terminal (has rewards)
     */
    private isTerminalNode(node: Node): boolean {
        return node.playerReward !== undefined || node.opponentReward !== undefined;
    }

    /**
     * Build LP node from proto node.
     * Returns null on error.
     */
    private buildLPNode(protoNode: Node): LPNode | null {
        if (this.nodes.has(protoNode.nodeId)) {
            return this.nodes.get(protoNode.nodeId)!;
        }

        const isTerminal = this.isTerminalNode(protoNode);
        const lpNode = new LPNode(protoNode.nodeId, isTerminal);

        if (protoNode.playerActions) {
            lpNode.playerActions = protoNode.playerActions.actions.map(a => a.actionId);
        }
        if (protoNode.opponentActions) {
            lpNode.opponentActions = protoNode.opponentActions.actions.map(a => a.actionId);
        }

        for (const transition of protoNode.transitions) {
            const key = `${transition.playerActionId}-${transition.opponentActionId}`;

            if (!transition.nextNodeId) {
                log.error(
                    `Transition in node "${protoNode.nodeId}" (player action: ${transition.playerActionId}, opponent action: ${transition.opponentActionId}) has no nextNodeId`
                );
                return null;
            }

            const nextProtoNode = this.nodeMap.get(transition.nextNodeId);
            if (!nextProtoNode) {
                log.error(
                    `Transition in node "${protoNode.nodeId}" references non-existent node "${transition.nextNodeId}"`
                );
                return null;
            }

            if (this.isTerminalNode(nextProtoNode)) {
                const playerReward = nextProtoNode.playerReward?.value ?? 0;
                const opponentReward = nextProtoNode.opponentReward?.value ?? 0;
                lpNode.rewards.set(key, [playerReward, opponentReward]);
                continue;
            }

            const childNode = this.buildLPNode(nextProtoNode);
            if (!childNode) {
                return null;
            }
            lpNode.children.set(key, childNode);
        }

        this.nodes.set(protoNode.nodeId, lpNode);
        return lpNode;
    }

    /**
     * Compute topological order using DFS
     */
    private computeTopologicalOrder(): void {
        const visited = new Set<string>();
        const tempMark = new Set<string>();
        const order: string[] = [];

        const visit = (nodeId: string) => {
            if (tempMark.has(nodeId)) {
                // Cycle detected - for game trees this shouldn't happen
                return;
            }
            if (visited.has(nodeId)) {
                return;
            }

            tempMark.add(nodeId);
            const node = this.nodes.get(nodeId);
            if (node) {
                // Visit children first
                const children = Array.from(node.children.values());
                for (const child of children) {
                    visit(child.nodeId);
                }
            }
            tempMark.delete(nodeId);
            visited.add(nodeId);
            order.push(nodeId);
        };

        // Start from root
        visit(this.gameTree.root);

        this.topologicalOrder = order;
    }

    /**
     * Solve LP for player's optimal strategy at a node
     * Using maximin formulation for zero-sum games
     */
    private solvePlayerLP(node: LPNode): void {
        if (node.playerActions.length === 0) {
            return;
        }

        log.debug('Solving player LP for node:', node.nodeId);

        // Special case: only one action
        if (node.playerActions.length === 1) {
            node.playerStrategy.set(node.playerActions[0], 1.0);
            node.playerValue = this.calculateMinimaxValueForSinglePlayerAction(node);
            log.debug('Single player action, value:', node.playerValue);
            return;
        }

        const payoffMatrix = buildPayoffMatrix(node, true);
        const shift = calculatePayoffShift(payoffMatrix);

        const model = this.buildPlayerLPModel(node, payoffMatrix, shift);
        const result = solver.Solve(model) as LPResult;

        if (result.feasible) {
            node.playerStrategy = extractStrategy(result, node.playerActions, PLAYER_ACTION_PREFIX);
            node.playerValue = (result.v ?? 0) - shift;
            log.debug('Player LP solved, value:', node.playerValue);
        } else {
            log.warn(`LP solver infeasible for player at node "${node.nodeId}", using uniform strategy`);
            node.playerStrategy = createUniformStrategy(node.playerActions);
            node.playerValue = this.calculateExpectedValue(node, true);
        }
    }

    /**
     * Build LP model for player's strategy optimization
     */
    private buildPlayerLPModel(node: LPNode, payoffMatrix: number[][], shift: number): LPModel {
        const model: LPModel = {
            optimize: 'v',
            opType: 'max',
            constraints: {},
            variables: {},
        };

        // Add constraints
        model.constraints.prob_sum = {
            equal: 1 
        };
        for (let j = 0; j < node.opponentActions.length; j++) {
            model.constraints[`opp_${j}`] = {
                min: 0 
            };
        }

        // Add value variable
        model.variables.v = {
            v: 1 
        };
        for (let j = 0; j < node.opponentActions.length; j++) {
            model.variables.v[`opp_${j}`] = -1;
        }

        // Add strategy variables (prefix action IDs to avoid collision with 'v')
        for (let i = 0; i < node.playerActions.length; i++) {
            const action = node.playerActions[i];
            const varName = `${PLAYER_ACTION_PREFIX}${action}`;
            model.variables[varName] = {
                prob_sum: 1 
            };

            for (let j = 0; j < node.opponentActions.length; j++) {
                const payoff = payoffMatrix[i][j] + shift;
                model.variables[varName][`opp_${j}`] = payoff;
            }
        }

        return model;
    }

    /**
     * Solve LP for opponent's optimal strategy at a node
     * Using minimax formulation for zero-sum games
     */
    private solveOpponentLP(node: LPNode): void {
        if (node.opponentActions.length === 0) {
            return;
        }

        log.debug('Solving opponent LP for node:', node.nodeId);

        // Special case: only one action
        if (node.opponentActions.length === 1) {
            node.opponentStrategy.set(node.opponentActions[0], 1.0);
            node.opponentValue = this.calculateMinimaxValueForSingleOpponentAction(node);
            log.debug('Single opponent action, value:', node.opponentValue);
            return;
        }

        const payoffMatrix = buildPayoffMatrix(node, false);
        const shift = calculatePayoffShift(payoffMatrix);

        const model = this.buildOpponentLPModel(node, payoffMatrix, shift);
        const result = solver.Solve(model) as LPResult;

        if (result.feasible) {
            node.opponentStrategy = extractStrategy(result, node.opponentActions, OPPONENT_ACTION_PREFIX);
            node.opponentValue = (result.v ?? 0) - shift;
            log.debug('Opponent LP solved, value:', node.opponentValue);
        } else {
            log.warn(`LP solver infeasible for opponent at node "${node.nodeId}", using uniform strategy`);
            node.opponentStrategy = createUniformStrategy(node.opponentActions);
            node.opponentValue = this.calculateExpectedValue(node, false);
        }
    }

    /**
     * Build LP model for opponent's strategy optimization
     */
    private buildOpponentLPModel(node: LPNode, payoffMatrix: number[][], shift: number): LPModel {
        const model: LPModel = {
            optimize: 'v',
            opType: 'max',
            constraints: {},
            variables: {},
        };

        // Add constraints
        model.constraints.prob_sum = {
            equal: 1 
        };
        for (let i = 0; i < node.playerActions.length; i++) {
            model.constraints[`player_${i}`] = {
                min: 0 
            };
        }

        // Add value variable
        model.variables.v = {
            v: 1 
        };
        for (let i = 0; i < node.playerActions.length; i++) {
            model.variables.v[`player_${i}`] = -1;
        }

        // Add strategy variables (prefix action IDs to avoid collision with 'v')
        for (let j = 0; j < node.opponentActions.length; j++) {
            const action = node.opponentActions[j];
            const varName = `${OPPONENT_ACTION_PREFIX}${action}`;
            model.variables[varName] = {
                prob_sum: 1 
            };

            for (let i = 0; i < node.playerActions.length; i++) {
                const payoff = payoffMatrix[i][j] + shift;
                model.variables[varName][`player_${i}`] = payoff;
            }
        }

        return model;
    }

    /**
     * Calculate minimax value for a node where player has exactly one action.
     * Returns the minimum payoff over all opponent actions.
     */
    private calculateMinimaxValueForSinglePlayerAction(node: LPNode): number {
        const playerAction = node.playerActions[0];
        let minPayoff = Infinity;

        for (const oppAction of node.opponentActions) {
            const key = `${playerAction}-${oppAction}`;
            const reward = node.rewards.get(key);
            const child = node.children.get(key);

            let payoff = 0;
            if (reward) {
                payoff = reward[0]; // player reward
            } else if (child) {
                payoff = child.playerValue;
            }

            minPayoff = Math.min(minPayoff, payoff);
        }

        return minPayoff === Infinity ? 0 : minPayoff;
    }

    /**
     * Calculate minimax value for a node where opponent has exactly one action.
     * Returns the minimum payoff over all player actions.
     */
    private calculateMinimaxValueForSingleOpponentAction(node: LPNode): number {
        const oppAction = node.opponentActions[0];
        let minPayoff = Infinity;

        for (const playerAction of node.playerActions) {
            const key = `${playerAction}-${oppAction}`;
            const reward = node.rewards.get(key);
            const child = node.children.get(key);

            let payoff = 0;
            if (reward) {
                payoff = reward[1]; // opponent reward
            } else if (child) {
                payoff = child.opponentValue;
            }

            minPayoff = Math.min(minPayoff, payoff);
        }

        return minPayoff === Infinity ? 0 : minPayoff;
    }

    /**
     * Calculate expected value for a node given current strategies
     */
    private calculateExpectedValue(node: LPNode, forPlayer: boolean): number {
        let expectedValue = 0;

        for (const playerAction of node.playerActions) {
            const playerProb = node.playerStrategy.get(playerAction) ?? (1.0 / node.playerActions.length);

            for (const oppAction of node.opponentActions) {
                const oppProb = node.opponentStrategy.get(oppAction) ?? (1.0 / node.opponentActions.length);
                const key = `${playerAction}-${oppAction}`;

                const reward = node.rewards.get(key);
                const child = node.children.get(key);

                let value = 0;
                if (reward) {
                    value = forPlayer ? reward[0] : reward[1];
                } else if (child) {
                    value = forPlayer ? child.playerValue : child.opponentValue;
                }

                expectedValue += playerProb * oppProb * value;
            }
        }

        return expectedValue;
    }

    /**
     * Run LP solver to solve the game.
     * Returns true on success, false on error.
     */
    public solve(_iterations?: number): boolean {
        log.debug('Starting LP solver');

        if (!this.initialized) {
            log.debug('Building internal tree structure');
            if (!this.buildInternalTree()) {
                log.error('Failed to build internal tree');
                return false;
            }
            log.debug('Topological order computed, nodes:', this.topologicalOrder.length);
        }

        for (const nodeId of this.topologicalOrder) {
            const node = this.nodes.get(nodeId);
            if (!node || node.isTerminal) {
                continue;
            }

            this.solvePlayerLP(node);
            this.solveOpponentLP(node);
        }

        log.debug('LP solver completed successfully');
        return true;
    }

    /**
     * Get average strategy for a node (player)
     */
    public getAverageStrategy(nodeId: string): Map<number, number> | null {
        const node = this.nodes.get(nodeId);
        if (!node) {
            return null;
        }

        // Return computed strategy
        if (node.playerStrategy.size === 0 && node.playerActions.length > 0) {
            // Return uniform if not solved yet
            const strategy = new Map<number, number>();
            const uniformProb = 1.0 / node.playerActions.length;
            for (const action of node.playerActions) {
                strategy.set(action, uniformProb);
            }
            return strategy;
        }

        return new Map(node.playerStrategy);
    }

    /**
     * Get average strategy for opponent at a node
     */
    public getAverageOpponentStrategy(nodeId: string): Map<number, number> | null {
        const node = this.nodes.get(nodeId);
        if (!node) {
            return null;
        }

        // Return computed strategy
        if (node.opponentStrategy.size === 0 && node.opponentActions.length > 0) {
            // Return uniform if not solved yet
            const strategy = new Map<number, number>();
            const uniformProb = 1.0 / node.opponentActions.length;
            for (const action of node.opponentActions) {
                strategy.set(action, uniformProb);
            }
            return strategy;
        }

        return new Map(node.opponentStrategy);
    }

    /**
     * Get average strategy for the root node
     */
    public getRootStrategy(): Map<number, number> | null {
        return this.getAverageStrategy(this.gameTree.root);
    }
}
