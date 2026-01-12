// Type definitions for game proto messages
// TODO: Generate types from proto file

export interface Reward {
    value: number;
}

export interface Action {
    id: string;
    description: string;
}

export interface PlayerActions {
    id: string;
    actions: Action[];
}

export interface SituationCell {
    id: string;
    value: string;
}

export interface Situation {
    cells: SituationCell[];
}

export interface Transition {
    playerActionId: string;
    opponentActionId: string;
    nextNodeId: string;
    isTerminal: boolean;
    playerReward?: Reward;
    opponentReward?: Reward;
}

export interface Node {
    id: string;
    situation?: Situation;
    description: string;
    playerActions?: PlayerActions;
    opponentActions?: PlayerActions;
    transitions: Transition[];
}

export interface GameTree {
    id: string;
    root: Node;
}
