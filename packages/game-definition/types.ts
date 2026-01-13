// Type definitions for game proto messages
// TODO: Generate types from proto file

// GameDefinition related types (from proto/game.proto)

export interface Action {
    id: string;
    description: string;
}

export interface PlayerActions {
    id: string;
    actions: Action[];
}

export enum ResourceType {
    RESOURCE_TYPE_UNKNOWN = 0,
    RESOURCE_TYPE_PLAYER_HEALTH = 1,
    RESOURCE_TYPE_OPPONENT_HEALTH = 2,
}

export enum TerminalSituationType {
    TERMINAL_SITUATION_TYPE_UNKNOWN = 0,
    TERMINAL_SITUATION_TYPE_NEUTRAL = 1,
}

export interface ResourceConsumption {
    resourceType: ResourceType;
    value: number;
}

export interface DynamicStateResource {
    resourceType: ResourceType;
    value: number;
}

export interface DynamicState {
    resources: DynamicStateResource[];
}

export interface TerminalSituation {
    situationId: string;
    type: TerminalSituationType;
    name: string;
    description: string;
}

export interface ProtoSituation {
    situationId: string;
    description: string;
    playerActions: PlayerActions;
    opponentActions: PlayerActions;
    transitions: ProtoTransition[];
}

export interface ProtoTransition {
    playerActionId: string;
    opponentActionId: string;
    nextSituationId: string;
    resourceConsumptions: ResourceConsumption[];
}

export interface GameDefinition {
    id: string;
    name: string;
    description: string;
    rootSituationId: string;
    situations: ProtoSituation[];
    terminalSituations: TerminalSituation[];
    initialDynamicState: DynamicState;
}
