// Type definitions for GameTree

export interface Reward {
    value: number;
}

export interface Action {
    actionId: string;
    description: string;
}

export interface PlayerActions {
    actions: Action[];
}

export interface SituationCell {
    id: string;
    value: string;
}

export interface State {
    situation_id?: string;

    playerHealth: number;
    opponentHealth: number;
}

export interface NodeTransition {
    playerActionId: string;
    opponentActionId: string;
    nextNodeId: string;
}

export interface Node {
    nodeId: string;

    // Name of the node (used for terminal situations)
    name?: string;

    description: string;

    state: State;

    playerActions?: PlayerActions;
    opponentActions?: PlayerActions;
    transitions: NodeTransition[];

    // Rewards available only on terminal nodes.
    playerReward?: Reward;
    opponentReward?: Reward;
}

export interface GameTree {
    id: string;
    root: string; // root node id
    nodes: Record<string, Node>; // all nodes in the tree, keyed by node id
}
