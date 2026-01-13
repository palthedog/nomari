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
export interface NodeTransition {
    playerActionId: string;
    opponentActionId: string;
    nextNodeId: string;
}
export interface Node {
    id: string;
    situation?: Situation;
    description: string;
    playerActions?: PlayerActions;
    opponentActions?: PlayerActions;
    transitions: NodeTransition[];
    playerReward?: Reward;
    opponentReward?: Reward;
}
export interface GameTree {
    id: string;
    root: string;
    nodes: Record<string, Node>;
}
//# sourceMappingURL=game-tree.d.ts.map