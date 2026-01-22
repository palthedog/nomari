import { GameTree, Node } from '@nomari/game-tree/game-tree';

/**
 * Collect all nodes from a game tree
 */
export function collectAllNodes(tree: GameTree): Map<string, Node> {
    const nodeMap = new Map<string, Node>();
    for (const [id, node] of Object.entries(tree.nodes)) {
        nodeMap.set(id, node);
    }
    return nodeMap;
}

/**
 * Generate a unique node ID
 */
export function generateNodeId(prefix: string = 'node'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Find a node by ID in the tree
 */
export function findNodeById(tree: GameTree, nodeId: string): Node | null {
    return tree.nodes[nodeId] || null;
}
