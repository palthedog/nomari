import { GameTree, Node } from '../game-tree';

/**
 * Collect all nodes from a game tree
 */
export function collectAllNodes(node: Node, nodeMap: Map<string, Node> = new Map()): Map<string, Node> {
    nodeMap.set(node.id, node);
    for (const transition of node.transitions) {
        if (transition.nextNodeId && !transition.isTerminal) {
            // Note: This requires access to the full tree structure
            // In practice, we'll need to search the tree to find the node
        }
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
    function searchNode(node: Node): Node | null {
        if (node.id === nodeId) {
            return node;
        }
        return null;
    }

    function searchRecursive(node: Node, visited: Set<string>): Node | null {
        if (visited.has(node.id)) {
            return null;
        }
        visited.add(node.id);

        const found = searchNode(node);
        if (found) {
            return found;
        }

        for (const transition of node.transitions) {
            if (transition.nextNodeId && !transition.isTerminal) {
                // We need to search the tree structure
                // For now, we'll return null and handle this in the component
            }
        }

        return null;
    }

    return searchRecursive(tree.root, new Set());
}
