import {
    GameDefinition,
    DynamicState,
    ResourceConsumption,
    ResourceRequirement,
    ResourceType,
    Situation,
    TerminalSituation,
    Action,
    RewardComputationMethod,
    ComboStarter,
} from '@nomari/ts-proto';
import {
    calculateRewardForWinProbability,
    calculateRewardForWinProbabilityWithCorner,
    calculateRewardForDamageRace,
} from './reward';
import {
    GameTree,
    Node,
    NodeTransition,
} from '@nomari/game-tree/game-tree';
import log from 'loglevel';

// Configure log level based on environment
if (process.env.NODE_ENV === 'development') {
    log.setLevel('debug');
} else {
    log.setLevel('warn');
}

/**
 * Error codes for game tree building
 */
export enum GameTreeBuildErrorCode {
    CYCLE_DETECTED = 'CYCLE_DETECTED',
    SITUATION_NOT_FOUND = 'SITUATION_NOT_FOUND',
}

/**
 * Error information for game tree building
 */
export interface GameTreeBuildError {
    code: GameTreeBuildErrorCode;
    message: string;
    situationId?: number;
    stateHash?: string;
}

/**
 * Result type for game tree building
 */
export type GameTreeBuildResult =
    | { success: true;
        gameTree: GameTree }
    | { success: false;
        error: GameTreeBuildError };

/**
 * Context object containing all state needed for building the game tree
 */
interface BuildContext {
    nodeMap: Map<string, Node>;
    nodeStateMap: Map<string, DynamicState>;
    creatingNodes: Set<string>;
    situationMap: Map<number, Situation>;
    terminalSituationMap: Map<number, TerminalSituation>;
    playerComboStarterMap: Map<number, ComboStarter>;
    opponentComboStarterMap: Map<number, ComboStarter>;
    rewardComputationMethod: RewardComputationMethod | undefined;
    initialPlayerHealth: number;
    initialOpponentHealth: number;
}

/**
 * Hash a DynamicState to create a unique identifier
 */
function hashDynamicState(state: DynamicState): string {
    const sorted = [...state.resources].sort((a, b) => a.resourceType - b.resourceType);
    return sorted.map(r => `${r.resourceType}:${r.value.toFixed(2)}`).join('|');
}

/**
 * Check if a resource type is a gauge (OD or SA)
 * Gauges have special consumption rules: if insufficient, consume all remaining
 */
function isGaugeResource(resourceType: ResourceType): boolean {
    return resourceType === ResourceType.PLAYER_OD_GAUGE ||
        resourceType === ResourceType.PLAYER_SA_GAUGE ||
        resourceType === ResourceType.OPPONENT_OD_GAUGE ||
        resourceType === ResourceType.OPPONENT_SA_GAUGE;
}

/**
 * Check if the current state meets all requirements for a transition
 * Returns true if all requirements are met (or no requirements), false otherwise
 */
function canApplyTransition(
    state: DynamicState,
    requirements: ResourceRequirement[]
): boolean {
    for (const req of requirements) {
        const currentValue = state.resources.find(
            r => r.resourceType === req.resourceType
        )?.value || 0;
        if (currentValue < req.value) {
            return false;
        }
    }
    return true;
}

/**
 * Apply resource consumptions to a dynamic state
 * For gauge resources (OD/SA): if insufficient, consume all remaining (Burnout behavior)
 * For other resources (HP): consume the fixed value
 */
function applyResourceConsumptions(
    state: DynamicState,
    consumptions: ResourceConsumption[]
): DynamicState {
    const newResources = new Map<ResourceType, number>();

    // Copy existing resources
    for (const resource of state.resources) {
        newResources.set(resource.resourceType, resource.value);
    }

    // Apply consumptions
    for (const consumption of consumptions) {
        const currentValue = newResources.get(consumption.resourceType) || 0;

        let actualConsumption: number;
        if (isGaugeResource(consumption.resourceType)) {
            // OD/SA gauge: consume all remaining if insufficient (Burnout behavior)
            actualConsumption = currentValue < consumption.value
                ? currentValue  // Insufficient: consume all remaining
                : consumption.value;  // Sufficient: consume fixed value
        } else {
            // HP etc: consume fixed value
            actualConsumption = consumption.value;
        }

        const newValue = Math.max(0, currentValue - actualConsumption);
        newResources.set(consumption.resourceType, newValue);
    }

    // Convert back to array
    const resources = Array.from(newResources.entries()).map(([resourceType, value]) => ({
        resourceType,
        value,
    }));

    return {
        resources 
    };
}

/**
 * Get resource value from DynamicState
 */
function getResourceValue(state: DynamicState, resourceType: ResourceType): number {
    const resource = state.resources.find(r => r.resourceType === resourceType);
    return resource?.value || 0;
}

/**
 * Check if a state is terminal and determine the terminal type
 */
function isTerminalState(state: DynamicState): {
    isTerminal: boolean;
    type: 'win' | 'lose' | 'draw' | null;
} {
    const playerHealth = getResourceValue(state, ResourceType.PLAYER_HEALTH);
    const opponentHealth = getResourceValue(state, ResourceType.OPPONENT_HEALTH);

    if (playerHealth <= 0 && opponentHealth <= 0) {
        return {
            isTerminal: true,
            type: 'draw' 
        };
    } else if (playerHealth <= 0) {
        return {
            isTerminal: true,
            type: 'lose' 
        };
    } else if (opponentHealth <= 0) {
        return {
            isTerminal: true,
            type: 'win' 
        };
    }

    return {
        isTerminal: false,
        type: null 
    };
}

const DEFAULT_REWARD_COMPUTATION_METHOD: RewardComputationMethod = {
    method: {
        oneofKind: 'damageRace',
        damageRace: {}
    }
};

/**
 * Create a terminal node based on terminal type
 */
function createTerminalNode(
    nodeId: string,
    type: 'win' | 'lose' | 'draw',
    playerHealth: number,
    opponentHealth: number,
    rewardComputationMethod: RewardComputationMethod | undefined,
    initialPlayerHealth: number,
    initialOpponentHealth: number,
    state: DynamicState
): Node {
    let playerReward: number;

    if (!rewardComputationMethod) {
        rewardComputationMethod = DEFAULT_REWARD_COMPUTATION_METHOD;
    }

    // Check reward computation method first
    if (rewardComputationMethod.method.oneofKind === 'damageRace') {
        // Use damage race for all terminal types (win/lose/draw)
        playerReward = calculateRewardForDamageRace(
            playerHealth,
            opponentHealth,
            initialPlayerHealth,
            initialOpponentHealth
        );
    } else if (type === 'win') {
        playerReward = calculateRewardForWinProbability(1);
    } else if (type === 'lose') {
        playerReward = calculateRewardForWinProbability(0);
    } else {
        // type === 'draw'
        playerReward = 0;
    }

    return {
        nodeId: nodeId,
        name: `終端ノード: ${type}`,
        description: '',
        state: {
            playerHealth: playerHealth,
            opponentHealth: opponentHealth,
            playerOd: getResourceValue(state, ResourceType.PLAYER_OD_GAUGE),
            opponentOd: getResourceValue(state, ResourceType.OPPONENT_OD_GAUGE),
            playerSa: getResourceValue(state, ResourceType.PLAYER_SA_GAUGE),
            opponentSa: getResourceValue(state, ResourceType.OPPONENT_SA_GAUGE),
        },
        transitions: [],
        playerActions: undefined,
        opponentActions: undefined,
        playerReward: {
            value: playerReward 
        },
        opponentReward: {
            value: -playerReward 
        },
    };
}

/**
 * Create a terminal node for TerminalSituation
 */
function createTerminalSituationNode(
    nodeId: string,
    terminalSituation: TerminalSituation,
    playerHealth: number,
    opponentHealth: number,
    rewardComputationMethod: RewardComputationMethod | undefined,
    initialPlayerHealth: number,
    initialOpponentHealth: number,
    state: DynamicState
): Node {
    let playerReward: number;

    const playerOd = getResourceValue(state, ResourceType.PLAYER_OD_GAUGE);
    const opponentOd = getResourceValue(state, ResourceType.OPPONENT_OD_GAUGE);
    const playerSa = getResourceValue(state, ResourceType.PLAYER_SA_GAUGE);
    const opponentSa = getResourceValue(state, ResourceType.OPPONENT_SA_GAUGE);

    if (!rewardComputationMethod) {
        rewardComputationMethod = DEFAULT_REWARD_COMPUTATION_METHOD;
    }

    if (rewardComputationMethod.method.oneofKind === 'damageRace') {
        playerReward = calculateRewardForDamageRace(
            playerHealth,
            opponentHealth,
            initialPlayerHealth,
            initialOpponentHealth
        );
    } else if (rewardComputationMethod.method.oneofKind === 'winProbability') {
        const winProb = rewardComputationMethod.method.winProbability;
        const cornerBonus = winProb.cornerBonus || 0;
        const odBonus = winProb.odGaugeBonus ?? 0;
        const saBonus = winProb.saGaugeBonus ?? 0;
        playerReward = calculateRewardForWinProbabilityWithCorner(
            playerHealth,
            opponentHealth,
            terminalSituation.cornerState,
            cornerBonus,
            playerOd,
            opponentOd,
            playerSa,
            opponentSa,
            odBonus,
            saBonus
        );
    } else {
        // Unknown reward computation method - fallback to damage race
        log.warn('Unknown reward computation method:', rewardComputationMethod.method.oneofKind, '- using damageRace');
        playerReward = calculateRewardForDamageRace(
            playerHealth,
            opponentHealth,
            initialPlayerHealth,
            initialOpponentHealth
        );
    }

    return {
        nodeId: nodeId,
        name: terminalSituation.name,
        description: terminalSituation.description ?? '',
        state: {
            situation_id: terminalSituation.situationId,
            playerHealth: playerHealth,
            opponentHealth: opponentHealth,
            playerOd: playerOd,
            opponentOd: opponentOd,
            playerSa: playerSa,
            opponentSa: opponentSa,
        },
        transitions: [],
        playerActions: undefined,
        opponentActions: undefined,
        playerReward: {
            value: playerReward 
        },
        opponentReward: {
            value: -playerReward 
        },
    };
}

/**
 * Type guard to check if a value is a GameTreeBuildError
 */
function isGameTreeBuildError<T>(result: T | GameTreeBuildError): result is GameTreeBuildError {
    return typeof result === 'object' && result !== null && 'code' in result;
}

/**
 * Get or create a terminal node for auto-detected terminal state (HP <= 0)
 */
function getOrCreateTerminalNode(
    nodeMap: Map<string, Node>,
    nodeStateMap: Map<string, DynamicState>,
    state: DynamicState,
    terminalType: 'win' | 'lose' | 'draw',
    rewardComputationMethod: RewardComputationMethod | undefined,
    initialPlayerHealth: number,
    initialOpponentHealth: number
): Node {
    const playerHealth = getResourceValue(state, ResourceType.PLAYER_HEALTH);
    const opponentHealth = getResourceValue(state, ResourceType.OPPONENT_HEALTH);
    const stateHash = hashDynamicState(state);
    const nodeKey = `terminal_${terminalType}_${stateHash}`;

    const cached = nodeMap.get(nodeKey);
    if (cached) {
        return cached;
    }

    const node = createTerminalNode(
        nodeKey,
        terminalType,
        playerHealth,
        opponentHealth,
        rewardComputationMethod,
        initialPlayerHealth,
        initialOpponentHealth,
        state
    );
    nodeMap.set(nodeKey, node);
    nodeStateMap.set(nodeKey, state);
    return node;
}

/**
 * Initialize build context from game definition
 */
function initializeBuildContext(gameDefinition: GameDefinition): BuildContext {
    const initialDynamicState = gameDefinition.initialDynamicState || {
        resources: [] 
    };

    const situationMap = new Map<number, Situation>();
    for (const situation of gameDefinition.situations) {
        situationMap.set(situation.situationId, situation);
    }

    const terminalSituationMap = new Map<number, TerminalSituation>();
    for (const terminalSituation of gameDefinition.terminalSituations) {
        terminalSituationMap.set(terminalSituation.situationId, terminalSituation);
    }

    const playerComboStarterMap = new Map<number, ComboStarter>();
    for (const comboStarter of gameDefinition.playerComboStarters) {
        playerComboStarterMap.set(comboStarter.situationId, comboStarter);
    }

    const opponentComboStarterMap = new Map<number, ComboStarter>();
    for (const comboStarter of gameDefinition.opponentComboStarters) {
        opponentComboStarterMap.set(comboStarter.situationId, comboStarter);
    }

    return {
        nodeMap: new Map<string, Node>(),
        nodeStateMap: new Map<string, DynamicState>(),
        creatingNodes: new Set<string>(),
        situationMap,
        terminalSituationMap,
        playerComboStarterMap,
        opponentComboStarterMap,
        rewardComputationMethod: gameDefinition.rewardComputationMethod,
        initialPlayerHealth: getResourceValue(initialDynamicState, ResourceType.PLAYER_HEALTH),
        initialOpponentHealth: getResourceValue(initialDynamicState, ResourceType.OPPONENT_HEALTH),
    };
}

/**
 * Check node cache and return cached node if exists
 */
function checkNodeCache(nodeKey: string, ctx: BuildContext): Node | null {
    const cached = ctx.nodeMap.get(nodeKey);
    if (cached) {
        log.debug('Node cache hit:', nodeKey);
        return cached;
    }
    return null;
}

/**
 * Check for cycle detection (node currently being created)
 */
function checkCycleDetection(
    nodeKey: string,
    situationId: number,
    stateHash: string,
    ctx: BuildContext
): GameTreeBuildError | null {
    if (ctx.creatingNodes.has(nodeKey)) {
        log.warn('Cycle detected at situation:', situationId, 'stateHash:', stateHash);
        return {
            code: GameTreeBuildErrorCode.CYCLE_DETECTED,
            message: `Cycle detected: Infinite loop found with same DynamicState. ` +
                `This indicates a game definition error where transitions form a cycle without changing game state.`,
            situationId,
            stateHash,
        };
    }
    return null;
}

/**
 * Process terminal state (HP <= 0) and create terminal node
 */
function processTerminalState(
    nodeKey: string,
    state: DynamicState,
    ctx: BuildContext
): Node | null {
    const terminalCheck = isTerminalState(state);
    if (!terminalCheck.isTerminal) {
        return null;
    }

    const playerHealth = getResourceValue(state, ResourceType.PLAYER_HEALTH);
    const opponentHealth = getResourceValue(state, ResourceType.OPPONENT_HEALTH);

    log.debug('Creating terminal node:', nodeKey, 'type:', terminalCheck.type);

    const node = createTerminalNode(
        nodeKey,
        terminalCheck.type!,
        playerHealth,
        opponentHealth,
        ctx.rewardComputationMethod,
        ctx.initialPlayerHealth,
        ctx.initialOpponentHealth,
        state
    );

    ctx.nodeMap.set(nodeKey, node);
    ctx.nodeStateMap.set(nodeKey, state);
    return node;
}

/**
 * Process terminal situation and create terminal situation node
 */
function processTerminalSituation(
    nodeKey: string,
    situationId: number,
    state: DynamicState,
    ctx: BuildContext
): Node | null {
    const terminalSituation = ctx.terminalSituationMap.get(situationId);
    if (!terminalSituation) {
        return null;
    }

    const playerHealth = getResourceValue(state, ResourceType.PLAYER_HEALTH);
    const opponentHealth = getResourceValue(state, ResourceType.OPPONENT_HEALTH);

    log.debug('Creating terminal situation node:', nodeKey, 'name:', terminalSituation.name);

    const node = createTerminalSituationNode(
        nodeKey,
        terminalSituation,
        playerHealth,
        opponentHealth,
        ctx.rewardComputationMethod,
        ctx.initialPlayerHealth,
        ctx.initialOpponentHealth,
        state
    );

    ctx.nodeMap.set(nodeKey, node);
    ctx.nodeStateMap.set(nodeKey, state);
    ctx.creatingNodes.delete(nodeKey);
    return node;
}

/**
 * Create node state object from DynamicState
 */
function createNodeState(situationId: number, state: DynamicState): Node['state'] {
    return {
        situation_id: situationId,
        playerHealth: getResourceValue(state, ResourceType.PLAYER_HEALTH),
        opponentHealth: getResourceValue(state, ResourceType.OPPONENT_HEALTH),
        playerOd: getResourceValue(state, ResourceType.PLAYER_OD_GAUGE),
        opponentOd: getResourceValue(state, ResourceType.OPPONENT_OD_GAUGE),
        playerSa: getResourceValue(state, ResourceType.PLAYER_SA_GAUGE),
        opponentSa: getResourceValue(state, ResourceType.OPPONENT_SA_GAUGE),
    };
}

/**
 * Process a single transition and add to node
 */
function processTransition(
    node: Node,
    protoTransition: Situation['transitions'][0],
    state: DynamicState,
    ctx: BuildContext,
    getOrCreateNodeFn: (situationId: number, state: DynamicState) => Node | GameTreeBuildError
): GameTreeBuildError | null {
    const requirements = protoTransition.resourceRequirements || [];
    if (!canApplyTransition(state, requirements)) {
        return null;
    }

    const newState = applyResourceConsumptions(state, protoTransition.resourceConsumptions);
    const terminalCheck = isTerminalState(newState);

    if (terminalCheck.isTerminal) {
        const nextNode = getOrCreateTerminalNode(
            ctx.nodeMap,
            ctx.nodeStateMap,
            newState,
            terminalCheck.type!,
            ctx.rewardComputationMethod,
            ctx.initialPlayerHealth,
            ctx.initialOpponentHealth
        );
        node.transitions.push({
            playerActionId: protoTransition.playerActionId,
            opponentActionId: protoTransition.opponentActionId,
            nextNodeId: nextNode.nodeId,
        });
        return null;
    }

    const nodeResult = getOrCreateNodeFn(protoTransition.nextSituationId, newState);
    if (isGameTreeBuildError(nodeResult)) {
        return nodeResult;
    }

    node.transitions.push({
        playerActionId: protoTransition.playerActionId,
        opponentActionId: protoTransition.opponentActionId,
        nextNodeId: nodeResult.nodeId,
    });
    return null;
}

/**
 * Build a situation node with actions and transitions
 */
function buildSituationNode(
    nodeKey: string,
    situation: Situation,
    state: DynamicState,
    ctx: BuildContext,
    getOrCreateNodeFn: (situationId: number, state: DynamicState) => Node | GameTreeBuildError
): Node | GameTreeBuildError {
    log.debug('Building situation node:', nodeKey, 'name:', situation.name);

    const node: Node = {
        nodeId: nodeKey,
        name: situation.name,
        description: '',
        state: createNodeState(situation.situationId, state),
        playerActions: {
            actions: situation.playerActions!.actions.map((a: Action) => ({
                actionId: a.actionId,
                name: a.name,
                description: a.description,
            })),
        },
        opponentActions: {
            actions: situation.opponentActions!.actions.map((a: Action) => ({
                actionId: a.actionId,
                name: a.name,
                description: a.description,
            })),
        },
        transitions: [],
    };

    for (const protoTransition of situation.transitions) {
        const error = processTransition(node, protoTransition, state, ctx, getOrCreateNodeFn);
        if (error) {
            return error;
        }
    }

    ctx.nodeMap.set(nodeKey, node);
    ctx.nodeStateMap.set(nodeKey, state);
    ctx.creatingNodes.delete(nodeKey);
    return node;
}

/**
 * Build a ComboStarter node with routes as player actions
 */
function buildComboStarterNode(
    nodeKey: string,
    comboStarter: ComboStarter,
    state: DynamicState,
    ctx: BuildContext,
    getOrCreateNodeFn: (situationId: number, state: DynamicState) => Node | GameTreeBuildError
): Node | GameTreeBuildError {
    log.debug('Building combo starter node:', nodeKey, 'name:', comboStarter.name);

    const availableRoutes = comboStarter.routes.filter(
        route => canApplyTransition(state, route.requirements)
    );

    const playerActions = availableRoutes.map((route, index) => ({
        actionId: index + 1,
        name: route.name,
        description: '',
    }));

    const opponentActionId = 0;
    const opponentActions = [{
        actionId: opponentActionId,
        name: '被コンボ',
        description: '',
    }];

    const transitions: NodeTransition[] = [];
    for (let i = 0; i < availableRoutes.length; i++) {
        const route = availableRoutes[i];
        const routeActionId = i + 1;
        const stateAfterCombo = applyResourceConsumptions(state, route.consumptions);

        const nextNodeResult = getOrCreateNodeFn(route.nextSituationId, stateAfterCombo);
        if (isGameTreeBuildError(nextNodeResult)) {
            return nextNodeResult;
        }

        transitions.push({
            playerActionId: routeActionId,
            opponentActionId: opponentActionId,
            nextNodeId: nextNodeResult.nodeId,
        });
    }

    return {
        nodeId: nodeKey,
        name: comboStarter.name,
        description: comboStarter.description || comboStarter.name,
        state: createNodeState(comboStarter.situationId, state),
        playerActions: {
            actions: playerActions 
        },
        opponentActions: {
            actions: opponentActions 
        },
        transitions,
    };
}

/**
 * Collect all reachable nodes from root into a record
 */
function collectAllNodes(rootNode: Node, nodeMap: Map<string, Node>): Record<string, Node> {
    const allNodes: Record<string, Node> = {};

    function collectNodes(node: Node): void {
        allNodes[node.nodeId] = node;
        for (const transition of node.transitions) {
            if (transition.nextNodeId) {
                const nextNode = nodeMap.get(transition.nextNodeId);
                if (nextNode && !allNodes[nextNode.nodeId]) {
                    collectNodes(nextNode);
                }
            }
        }
    }

    collectNodes(rootNode);
    return allNodes;
}

/**
 * Build a GameTree from a GameDefinition
 * Returns a result object with either the game tree or an error
 */
export function buildGameTree(gameDefinition: GameDefinition): GameTreeBuildResult {
    log.debug('Building game tree:', gameDefinition.name || gameDefinition.gameId);

    const ctx = initializeBuildContext(gameDefinition);
    const initialDynamicState = gameDefinition.initialDynamicState || {
        resources: [] 
    };

    /**
     * Get or create a node for a given situation and dynamic state
     */
    function getOrCreateNode(situationId: number, state: DynamicState): Node | GameTreeBuildError {
        const stateHash = hashDynamicState(state);
        const nodeKey = `${situationId}_${stateHash}`;

        // Check cache
        const cached = checkNodeCache(nodeKey, ctx);
        if (cached) {
            return cached;
        }

        // Check for cycles
        const cycleError = checkCycleDetection(nodeKey, situationId, stateHash, ctx);
        if (cycleError) {
            return cycleError;
        }

        ctx.creatingNodes.add(nodeKey);

        // Check terminal state (HP <= 0)
        const terminalNode = processTerminalState(nodeKey, state, ctx);
        if (terminalNode) {
            return terminalNode;
        }

        // Check terminal situation
        const terminalSituationNode = processTerminalSituation(nodeKey, situationId, state, ctx);
        if (terminalSituationNode) {
            return terminalSituationNode;
        }

        // Check combo starter
        const comboStarter = ctx.playerComboStarterMap.get(situationId)
            || ctx.opponentComboStarterMap.get(situationId);
        if (comboStarter) {
            const result = buildComboStarterNode(nodeKey, comboStarter, state, ctx, getOrCreateNode);
            if (isGameTreeBuildError(result)) {
                ctx.creatingNodes.delete(nodeKey);
                return result;
            }
            ctx.nodeMap.set(nodeKey, result);
            ctx.nodeStateMap.set(nodeKey, state);
            ctx.creatingNodes.delete(nodeKey);
            return result;
        }

        // Get situation definition
        const situation = ctx.situationMap.get(situationId);
        if (!situation) {
            ctx.creatingNodes.delete(nodeKey);
            log.error('Situation not found:', situationId);
            return {
                code: GameTreeBuildErrorCode.SITUATION_NOT_FOUND,
                message: `Situation not found: ${situationId}`,
                situationId,
            };
        }

        // Build situation node
        return buildSituationNode(nodeKey, situation, state, ctx, getOrCreateNode);
    }

    // Build tree from root
    const rootNodeResult = getOrCreateNode(gameDefinition.rootSituationId, initialDynamicState);

    if (isGameTreeBuildError(rootNodeResult)) {
        log.error('Game tree build failed:', rootNodeResult.message);
        return {
            success: false,
            error: rootNodeResult 
        };
    }

    const allNodes = collectAllNodes(rootNodeResult, ctx.nodeMap);

    log.debug('Game tree built successfully, node count:', Object.keys(allNodes).length);

    return {
        success: true,
        gameTree: {
            id: gameDefinition.gameId,
            root: rootNodeResult.nodeId,
            nodes: allNodes,
        },
    };
}
