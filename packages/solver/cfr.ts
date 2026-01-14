import { GameTree, Node, NodeTransition, Reward } from '@mari/game-tree/game-tree';

/**
 * Internal node representation for CFR computation
 */
class CFRNode {
    nodeId: string;
    isTerminal: boolean;
    playerActions: string[];
    opponentActions: string[];
    children: Map<string, CFRNode>; // key: `${playerActionId}-${opponentActionId}`
    rewards: Map<string, [number, number]>; // [playerReward, opponentReward]

    // CFR data structures
    regretSum: Map<string, number>; // action -> cumulative regret
    strategySum: Map<string, number>; // action -> cumulative strategy
    reachProb: number;

    constructor(nodeId: string, isTerminal: boolean = false) {
        this.nodeId = nodeId;
        this.isTerminal = isTerminal;
        this.playerActions = [];
        this.opponentActions = [];
        this.children = new Map();
        this.rewards = new Map();
        this.regretSum = new Map();
        this.strategySum = new Map();
        this.reachProb = 0.0;
    }
}

/**
 * Counterfactual Regret Minimization (CFR) Solver
 * 
 * Solves imperfect information games using the CFR algorithm
 * to find Nash equilibrium strategies.
 */
export class CFRSolver {
    private gameTree: GameTree;
    private nodes: Map<string, CFRNode>;
    private nodeMap: Map<string, Node>; // proto node lookup

    constructor(gameTree: GameTree) {
        this.gameTree = gameTree;
        this.nodes = new Map();
        this.nodeMap = new Map();
        this.buildInternalTree();
    }

    /**
     * Build internal CFR node structure from proto GameTree
     */
    private buildInternalTree(): void {
        // Get root node from nodes map
        const rootNode = this.gameTree.nodes[this.gameTree.root];
        if (!rootNode) {
            throw new Error(`Root node ${this.gameTree.root} not found in nodes map`);
        }

        // First, collect all nodes from the tree
        this.collectAllNodes(rootNode);

        // Then build CFR nodes
        this.buildCFRNode(rootNode);
    }

    /**
     * Recursively collect all nodes from the game tree
     */
    private collectAllNodes(node: Node): void {
        this.nodeMap.set(node.nodeId, node);

        for (const transition of node.transitions) {
            if (transition.nextNodeId) {
                const nextNode = this.findNodeById(transition.nextNodeId);
                if (nextNode && !this.nodeMap.has(nextNode.nodeId)) {
                    this.collectAllNodes(nextNode);
                }
            }
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

        // If not found, search recursively (for cases where tree is not fully connected)
        const rootNode = this.gameTree.nodes[this.gameTree.root];
        if (rootNode) {
            return this.searchNode(rootNode, nodeId);
        }

        return undefined;
    }

    /**
     * Recursively search for a node
     */
    private searchNode(node: Node, targetId: string): Node | undefined {
        if (node.nodeId === targetId) {
            return node;
        }

        for (const transition of node.transitions) {
            if (transition.nextNodeId) {
                const nextNode = this.nodeMap.get(transition.nextNodeId);
                if (nextNode) {
                    const found = this.searchNode(nextNode, targetId);
                    if (found) return found;
                }
            }
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
     * Build CFR node from proto node
     */
    private buildCFRNode(protoNode: Node): CFRNode {
        if (this.nodes.has(protoNode.nodeId)) {
            return this.nodes.get(protoNode.nodeId)!;
        }

        const isTerminal = this.isTerminalNode(protoNode);
        const cfrNode = new CFRNode(protoNode.nodeId, isTerminal);

        // Extract actions
        if (protoNode.playerActions) {
            cfrNode.playerActions = protoNode.playerActions.actions.map(a => a.actionId);
        }
        if (protoNode.opponentActions) {
            cfrNode.opponentActions = protoNode.opponentActions.actions.map(a => a.actionId);
        }

        // Process transitions
        for (const transition of protoNode.transitions) {
            const key = `${transition.playerActionId}-${transition.opponentActionId}`;

            if (transition.nextNodeId) {
                const nextProtoNode = this.nodeMap.get(transition.nextNodeId);
                if (nextProtoNode) {
                    if (this.isTerminalNode(nextProtoNode)) {
                        // Terminal node - use its rewards
                        const playerReward = nextProtoNode.playerReward?.value ?? 0;
                        const opponentReward = nextProtoNode.opponentReward?.value ?? 0;
                        cfrNode.rewards.set(key, [playerReward, opponentReward]);
                    } else {
                        // Non-terminal node - build child
                        const childNode = this.buildCFRNode(nextProtoNode);
                        cfrNode.children.set(key, childNode);
                    }
                }
            }
        }

        this.nodes.set(protoNode.nodeId, cfrNode);
        return cfrNode;
    }

    /**
     * Get strategy based on current regret values
     */
    private getStrategy(node: CFRNode, player: 0 | 1, reachProb: number): Map<string, number> {
        const actions = player === 0 ? node.playerActions : node.opponentActions;
        const numActions = actions.length;

        if (numActions === 0) {
            return new Map();
        }

        const strategy = new Map<string, number>();
        let normalizingSum = 0;

        // Calculate positive regrets
        for (const action of actions) {
            const regret = Math.max(0, node.regretSum.get(action) ?? 0);
            strategy.set(action, regret);
            normalizingSum += regret;
        }

        // Normalize to probabilities
        if (normalizingSum > 0) {
            for (const action of actions) {
                const current = strategy.get(action) ?? 0;
                strategy.set(action, current / normalizingSum);
            }
        } else {
            // Uniform strategy if no positive regrets
            const uniformProb = 1.0 / numActions;
            for (const action of actions) {
                strategy.set(action, uniformProb);
            }
        }

        // Update strategy sum
        for (const action of actions) {
            const current = node.strategySum.get(action) ?? 0;
            node.strategySum.set(action, current + (strategy.get(action) ?? 0) * reachProb);
        }

        return strategy;
    }

    /**
     * CFR algorithm: traverse the game tree and update regrets
     */
    private cfr(node: CFRNode, player: 0 | 1, reachProb0: number, reachProb1: number): number {
        // Current player and opponent
        const opponent: 0 | 1 = player === 0 ? 1 : 0;

        // Get current strategies for both players
        const reachProb = player === 0 ? reachProb0 : reachProb1;
        const oppReachProb = opponent === 0 ? reachProb0 : reachProb1;
        const strategy = this.getStrategy(node, player, reachProb);
        const opponentStrategy = this.getStrategy(node, opponent, oppReachProb);

        // Calculate node utility
        const nodeUtil = new Map<string, number>();
        let nodeValue = 0;

        const actions = player === 0 ? node.playerActions : node.opponentActions;
        const otherActions = player === 0 ? node.opponentActions : node.playerActions;

        for (const action of actions) {
            const actionProb = strategy.get(action) ?? 0;
            let actionValue = 0;

            for (const otherAction of otherActions) {
                const otherProb = opponentStrategy.get(otherAction) ?? 0;
                const key = player === 0
                    ? `${action}-${otherAction}`
                    : `${otherAction}-${action}`;

                const child = node.children.get(key);
                const reward = node.rewards.get(key);

                if (child) {
                    // Recursive call with updated reach probabilities for both players
                    const newReachProb0 = reachProb0 * (player === 0 ? actionProb : otherProb);
                    const newReachProb1 = reachProb1 * (player === 1 ? actionProb : otherProb);
                    actionValue += otherProb * this.cfr(child, player, newReachProb0, newReachProb1);
                } else if (reward) {
                    // Terminal state - expected reward weighted by opponent probability
                    const rewardValue = player === 0 ? reward[0] : reward[1];
                    actionValue += otherProb * rewardValue;
                }
            }

            nodeUtil.set(action, actionValue);
            nodeValue += actionProb * actionValue;
        }

        // Update regrets
        for (const action of actions) {
            const actionUtil = nodeUtil.get(action) ?? 0;
            const regret = actionUtil - nodeValue;
            const currentRegret = node.regretSum.get(action) ?? 0;
            const otherReachProb = player === 0 ? reachProb1 : reachProb0;
            node.regretSum.set(action, currentRegret + otherReachProb * regret);
        }

        return nodeValue;
    }

    /**
     * Run CFR iterations to solve the game
     */
    public solve(iterations: number = 1000): void {
        const root = this.nodes.get(this.gameTree.root);
        if (!root) {
            throw new Error(`Root node ${this.gameTree.root} not found`);
        }

        for (let i = 0; i < iterations; i++) {
            // Alternate between players
            this.cfr(root, 0, 1.0, 1.0);
            this.cfr(root, 1, 1.0, 1.0);
        }
    }

    /**
     * Get average strategy for a node
     */
    public getAverageStrategy(nodeId: string): Map<string, number> | null {
        const node = this.nodes.get(nodeId);
        if (!node) {
            return null;
        }

        const strategy = new Map<string, number>();
        let normalizingSum = 0;

        for (const action of node.playerActions) {
            const sum = node.strategySum.get(action) ?? 0;
            strategy.set(action, sum);
            normalizingSum += sum;
        }

        if (normalizingSum > 0) {
            for (const action of node.playerActions) {
                const current = strategy.get(action) ?? 0;
                strategy.set(action, current / normalizingSum);
            }
        } else {
            // Uniform if no strategy sum
            const uniformProb = 1.0 / node.playerActions.length;
            for (const action of node.playerActions) {
                strategy.set(action, uniformProb);
            }
        }

        return strategy;
    }

    /**
     * Get average strategy for the root node
     */
    public getRootStrategy(): Map<string, number> | null {
        return this.getAverageStrategy(this.gameTree.root);
    }
}
