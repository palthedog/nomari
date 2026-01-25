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
    CornerState,
    ComboStarter,
} from '@nomari/ts-proto';
import {
    GameTree,
    Node,
    NodeTransition,
} from '@nomari/game-tree/game-tree';

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

/**
 * Calculates rewards for both players based on win probability.
 * Rewards are scaled so that winProbability=1 yields +10000,
 * winProbability=0 yields -10000, and 0.5 yields 0 for player.
 */
function calculateRewardForWinProbability(winProbability: number): { playerReward: number;
    opponentReward: number } {
    // Scale reward: -10000 to +10000 based on win probability
    // winProbability = 0 -> -10000, winProbability = 1 -> +10000
    const playerReward = winProbability * 20000 - 10000;
    const opponentReward = -playerReward; // Zero-sum game
    return {
        playerReward,
        opponentReward 
    };
}

/**
 * Calculate reward for neutral terminal situation based on win probability.
 */
function calculateRewardForNeutral(
    playerHealth: number,
    opponentHealth: number
): { playerReward: number;
    opponentReward: number } {
    const totalHealth = playerHealth + opponentHealth;
    let winProbability: number;
    if (totalHealth === 0) {
        winProbability = 0.5; // When both zero, treat as equally likely (draw)
    } else {
        winProbability = playerHealth / totalHealth;
    }
    return calculateRewardForWinProbability(winProbability);
}

/**
 * Calculate reward for neutral terminal situation based on win probability with corner information.
 * Uses HP difference with sigmoid function to calculate win probability.
 * Also considers OD/SA gauge differences if weights are provided.
 */
function calculateRewardForWinProbabilityWithCorner(
    playerHealth: number,
    opponentHealth: number,
    cornerState: CornerState | undefined,
    cornerPenalty: number,
    playerOd: number = 0,
    opponentOd: number = 0,
    playerSa: number = 0,
    opponentSa: number = 0,
    odGaugeWeight: number = 0,
    saGaugeWeight: number = 0
): { playerReward: number;
    opponentReward: number } {
    // 1. Calculate HP difference
    let score = playerHealth - opponentHealth;

    // 2. Apply HP value adjustment based on corner state
    if (cornerState === CornerState.PLAYER_IN_CORNER) {
        score -= cornerPenalty;
    } else if (cornerState === CornerState.OPPONENT_IN_CORNER) {
        score += cornerPenalty;
    }

    // 3. Apply OD/SA gauge adjustment
    score += odGaugeWeight * (playerOd - opponentOd);
    score += saGaugeWeight * (playerSa - opponentSa);

    // 4. Convert to probability [0, 1] using sigmoid function
    // k = 0.0003: HP difference of 5000 yields approximately 80% win probability
    const k = 0.0003;
    const winProbability = 1 / (1 + Math.exp(-k * score));

    return calculateRewardForWinProbability(winProbability);
}

/**
 * Calculate reward based on damage race (damage dealt - damage received).
 * No scaling is applied - the damage race value is used directly as reward.
 */
function calculateRewardForDamageRace(
    playerHealth: number,
    opponentHealth: number,
    initialPlayerHealth: number,
    initialOpponentHealth: number
): { playerReward: number;
    opponentReward: number } {
    const damageDealt = initialOpponentHealth - opponentHealth;
    const damageReceived = initialPlayerHealth - playerHealth;
    const damageRace = damageDealt - damageReceived;

    // Use damage race value directly without scaling
    const playerReward = damageRace;
    const opponentReward = -damageRace; // Zero-sum game
    return {
        playerReward,
        opponentReward 
    };
}

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
    let opponentReward: number;

    // Check reward computation method first
    if (rewardComputationMethod && rewardComputationMethod.method.oneofKind === 'damageRace') {
        // Use damage race for all terminal types (win/lose/draw)
        ({ playerReward, opponentReward } = calculateRewardForDamageRace(
            playerHealth,
            opponentHealth,
            initialPlayerHealth,
            initialOpponentHealth
        ));
    } else if (type === 'win') {
        ({ playerReward, opponentReward } = calculateRewardForWinProbability(1));
    } else if (type === 'lose') {
        ({ playerReward, opponentReward } = calculateRewardForWinProbability(0));
    } else {
        // draw: use selected reward computation method
        if (rewardComputationMethod && rewardComputationMethod.method.oneofKind !== undefined) {
            if (rewardComputationMethod.method.oneofKind === 'winProbability') {
                const winProb = rewardComputationMethod.method.winProbability;
                const cornerPenalty = winProb.cornerPenalty || 0;
                const odGaugeWeight = winProb.odGaugeWeight ?? 0;
                const saGaugeWeight = winProb.saGaugeWeight ?? 0;
                const playerOd = getResourceValue(state, ResourceType.PLAYER_OD_GAUGE);
                const opponentOd = getResourceValue(state, ResourceType.OPPONENT_OD_GAUGE);
                const playerSa = getResourceValue(state, ResourceType.PLAYER_SA_GAUGE);
                const opponentSa = getResourceValue(state, ResourceType.OPPONENT_SA_GAUGE);
                ({ playerReward, opponentReward } = calculateRewardForWinProbabilityWithCorner(
                    playerHealth,
                    opponentHealth,
                    undefined, // No corner state for auto-generated terminal nodes
                    cornerPenalty,
                    playerOd,
                    opponentOd,
                    playerSa,
                    opponentSa,
                    odGaugeWeight,
                    saGaugeWeight
                ));
            } else {
                // Fallback to default
                const rewards = calculateRewardForNeutral(playerHealth, opponentHealth);
                playerReward = rewards.playerReward;
                opponentReward = rewards.opponentReward;
            }
        } else {
            // Default behavior when reward computation method is not specified
            const rewards = calculateRewardForNeutral(playerHealth, opponentHealth);
            playerReward = rewards.playerReward;
            opponentReward = rewards.opponentReward;
        }
    }

    return {
        nodeId: nodeId,
        description: `Terminal: ${type}`,
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
            value: opponentReward 
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
    let opponentReward: number;

    if (rewardComputationMethod && rewardComputationMethod.method.oneofKind !== undefined) {
        if (rewardComputationMethod.method.oneofKind === 'damageRace') {
            ({ playerReward, opponentReward } = calculateRewardForDamageRace(
                playerHealth,
                opponentHealth,
                initialPlayerHealth,
                initialOpponentHealth
            ));
        } else if (rewardComputationMethod.method.oneofKind === 'winProbability') {
            const winProb = rewardComputationMethod.method.winProbability;
            const cornerPenalty = winProb.cornerPenalty || 0;
            const odGaugeWeight = winProb.odGaugeWeight ?? 0;
            const saGaugeWeight = winProb.saGaugeWeight ?? 0;
            const playerOd = getResourceValue(state, ResourceType.PLAYER_OD_GAUGE);
            const opponentOd = getResourceValue(state, ResourceType.OPPONENT_OD_GAUGE);
            const playerSa = getResourceValue(state, ResourceType.PLAYER_SA_GAUGE);
            const opponentSa = getResourceValue(state, ResourceType.OPPONENT_SA_GAUGE);
            ({ playerReward, opponentReward } = calculateRewardForWinProbabilityWithCorner(
                playerHealth,
                opponentHealth,
                terminalSituation.cornerState,
                cornerPenalty,
                playerOd,
                opponentOd,
                playerSa,
                opponentSa,
                odGaugeWeight,
                saGaugeWeight
            ));
        } else {
            // Fallback to default
            const rewards = calculateRewardForNeutral(playerHealth, opponentHealth);
            playerReward = rewards.playerReward;
            opponentReward = rewards.opponentReward;
        }
    } else {
        // Default behavior when reward computation method is not specified
        const rewards = calculateRewardForNeutral(playerHealth, opponentHealth);
        playerReward = rewards.playerReward;
        opponentReward = rewards.opponentReward;
    }

    return {
        nodeId: nodeId,
        name: terminalSituation.name,
        description: terminalSituation.description || terminalSituation.name,
        state: {
            situation_id: terminalSituation.situationId,
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
            value: opponentReward 
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
 * Build a GameTree from a GameDefinition
 * Returns a result object with either the game tree or an error
 */
export function buildGameTree(gameDefinition: GameDefinition): GameTreeBuildResult {
    // Map to store generated nodes: key = `${situationId}_${dynamicStateHash}`
    const nodeMap = new Map<string, Node>();
    const nodeStateMap = new Map<string, DynamicState>(); // Track state for each node
    const creatingNodes = new Set<string>(); // Track nodes currently being created to prevent infinite loops

    // Store initial dynamic state for damage race calculation
    const initialDynamicState = gameDefinition.initialDynamicState || {
        resources: [] 
    };
    const initialPlayerHealth = getResourceValue(initialDynamicState, ResourceType.PLAYER_HEALTH);
    const initialOpponentHealth = getResourceValue(initialDynamicState, ResourceType.OPPONENT_HEALTH);

    // Get reward computation method
    const rewardComputationMethod = gameDefinition.rewardComputationMethod;

    // Map situations and terminal situations by ID
    const situationMap = new Map<number, Situation>();
    for (const situation of gameDefinition.situations) {
        situationMap.set(situation.situationId, situation);
    }

    const terminalSituationMap = new Map<number, TerminalSituation>();
    for (const terminalSituation of gameDefinition.terminalSituations) {
        terminalSituationMap.set(terminalSituation.situationId, terminalSituation);
    }

    // Map ComboStarters by situation_id (player and opponent separately)
    const playerComboStarterMap = new Map<number, ComboStarter>();
    for (const comboStarter of gameDefinition.playerComboStarters) {
        playerComboStarterMap.set(comboStarter.situationId, comboStarter);
    }

    const opponentComboStarterMap = new Map<number, ComboStarter>();
    for (const comboStarter of gameDefinition.opponentComboStarters) {
        opponentComboStarterMap.set(comboStarter.situationId, comboStarter);
    }

    /**
     * Get or create a node for a given situation and dynamic state
     * Returns either a Node or an error result
     */
    function getOrCreateNode(situationId: number, state: DynamicState): Node | GameTreeBuildError {
        const stateHash = hashDynamicState(state);
        const nodeKey = `${situationId}_${stateHash}`;

        // Check if node already exists
        if (nodeMap.has(nodeKey)) {
            return nodeMap.get(nodeKey)!;
        }

        // Check if node is currently being created (infinite loop prevention)
        if (creatingNodes.has(nodeKey)) {
            // Cycle with no DynamicState change is an error
            return {
                code: GameTreeBuildErrorCode.CYCLE_DETECTED,
                message: `Cycle detected: Infinite loop found with same DynamicState. ` +
                    `This indicates a game definition error where transitions form a cycle without changing game state.`,
                situationId: situationId,
                stateHash: stateHash,
            };
        }

        // Mark node as being created
        creatingNodes.add(nodeKey);

        // Check if this is a terminal state (health <= 0)
        const terminalCheck = isTerminalState(state);
        if (terminalCheck.isTerminal) {
            const playerHealth = getResourceValue(state, ResourceType.PLAYER_HEALTH);
            const opponentHealth = getResourceValue(
                state,
                ResourceType.OPPONENT_HEALTH
            );
            const node = createTerminalNode(
                nodeKey,
                terminalCheck.type!,
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

        // Check if this is a terminal situation (check before regular situation)
        const terminalSituation = terminalSituationMap.get(situationId);
        if (terminalSituation) {
            const playerHealth = getResourceValue(state, ResourceType.PLAYER_HEALTH);
            const opponentHealth = getResourceValue(state, ResourceType.OPPONENT_HEALTH);
            const node = createTerminalSituationNode(
                nodeKey,
                terminalSituation,
                playerHealth,
                opponentHealth,
                rewardComputationMethod,
                initialPlayerHealth,
                initialOpponentHealth,
                state
            );

            nodeMap.set(nodeKey, node);
            nodeStateMap.set(nodeKey, state);
            creatingNodes.delete(nodeKey);
            return node;
        }

        // Check if this is a ComboStarter
        const comboStarter = playerComboStarterMap.get(situationId)
            || opponentComboStarterMap.get(situationId);
        if (comboStarter) {
            const comboNodeResult = createComboStarterNode(
                nodeKey,
                comboStarter,
                state
            );
            if (isGameTreeBuildError(comboNodeResult)) {
                creatingNodes.delete(nodeKey);
                return comboNodeResult;
            }

            nodeMap.set(nodeKey, comboNodeResult);
            nodeStateMap.set(nodeKey, state);
            creatingNodes.delete(nodeKey);
            return comboNodeResult;
        }

        // Get the situation definition
        const situation = situationMap.get(situationId);
        if (!situation) {
            creatingNodes.delete(nodeKey);
            return {
                code: GameTreeBuildErrorCode.SITUATION_NOT_FOUND,
                message: `Situation not found: ${situationId}`,
                situationId: situationId,
            };
        }

        // Create a new node
        const playerHealth = getResourceValue(state, ResourceType.PLAYER_HEALTH);
        const opponentHealth = getResourceValue(state, ResourceType.OPPONENT_HEALTH);
        const node: Node = {
            nodeId: nodeKey,
            description: situation.name,
            state: {
                situation_id: situationId,
                playerHealth: playerHealth,
                opponentHealth: opponentHealth,
                playerOd: getResourceValue(state, ResourceType.PLAYER_OD_GAUGE),
                opponentOd: getResourceValue(state, ResourceType.OPPONENT_OD_GAUGE),
                playerSa: getResourceValue(state, ResourceType.PLAYER_SA_GAUGE),
                opponentSa: getResourceValue(state, ResourceType.OPPONENT_SA_GAUGE),
            },
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
            const requirements = protoTransition.resourceRequirements || [];
            if (!canApplyTransition(state, requirements)) {
                continue;
            }

            const newState = applyResourceConsumptions(state, protoTransition.resourceConsumptions);
            const terminalCheck = isTerminalState(newState);

            if (terminalCheck.isTerminal) {
                const nextNode = getOrCreateTerminalNode(
                    nodeMap,
                    nodeStateMap,
                    newState,
                    terminalCheck.type!,
                    rewardComputationMethod,
                    initialPlayerHealth,
                    initialOpponentHealth
                );
                node.transitions.push({
                    playerActionId: protoTransition.playerActionId,
                    opponentActionId: protoTransition.opponentActionId,
                    nextNodeId: nextNode.nodeId,
                });
                continue;
            }

            if (terminalSituationMap.has(protoTransition.nextSituationId)) {
                const nodeResult = getOrCreateNode(protoTransition.nextSituationId, newState);
                if (isGameTreeBuildError(nodeResult)) {
                    return nodeResult;
                }
                node.transitions.push({
                    playerActionId: protoTransition.playerActionId,
                    opponentActionId: protoTransition.opponentActionId,
                    nextNodeId: nodeResult.nodeId,
                });
                continue;
            }

            const nodeResult = getOrCreateNode(protoTransition.nextSituationId, newState);
            if (isGameTreeBuildError(nodeResult)) {
                return nodeResult;
            }
            node.transitions.push({
                playerActionId: protoTransition.playerActionId,
                opponentActionId: protoTransition.opponentActionId,
                nextNodeId: nodeResult.nodeId,
            });
        }

        nodeMap.set(nodeKey, node);
        nodeStateMap.set(nodeKey, state);
        creatingNodes.delete(nodeKey);
        return node;
    }

    /**
     * Create a ComboStarter node with routes as player actions
     */
    function createComboStarterNode(
        nodeKey: string,
        comboStarter: ComboStarter,
        state: DynamicState
    ): Node | GameTreeBuildError {
        const playerHealth = getResourceValue(state, ResourceType.PLAYER_HEALTH);
        const opponentHealth = getResourceValue(state, ResourceType.OPPONENT_HEALTH);

        // Filter routes based on requirements
        const availableRoutes = comboStarter.routes.filter(
            route => canApplyTransition(state, route.requirements)
        );

        // Create player actions from available routes (use route index as action ID)
        const playerActions = availableRoutes.map((route, index) => ({
            actionId: index + 1,
            name: route.name,
            description: '',
        }));

        // Single opponent action (opponent cannot choose during combo)
        const opponentActionId = 0;
        const opponentActions = [{
            actionId: opponentActionId,
            name: '被コンボ',
            description: '',
        }];

        // Create transitions for each route
        const transitions: NodeTransition[] = [];
        for (let i = 0; i < availableRoutes.length; i++) {
            const route = availableRoutes[i];
            const routeActionId = i + 1;

            // Apply route consumptions
            const stateAfterCombo = applyResourceConsumptions(state, route.consumptions);

            // Get or create the destination node
            const nextNodeResult = getOrCreateNode(route.nextSituationId, stateAfterCombo);
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
            state: {
                situation_id: comboStarter.situationId,
                playerHealth,
                opponentHealth,
                playerOd: getResourceValue(state, ResourceType.PLAYER_OD_GAUGE),
                opponentOd: getResourceValue(state, ResourceType.OPPONENT_OD_GAUGE),
                playerSa: getResourceValue(state, ResourceType.PLAYER_SA_GAUGE),
                opponentSa: getResourceValue(state, ResourceType.OPPONENT_SA_GAUGE),
            },
            playerActions: {
                actions: playerActions 
            },
            opponentActions: {
                actions: opponentActions 
            },
            transitions,
        };
    }

    // Build the tree starting from root
    const rootNodeResult = getOrCreateNode(
        gameDefinition.rootSituationId,
        initialDynamicState
    );

    if (isGameTreeBuildError(rootNodeResult)) {
        const error: GameTreeBuildError = rootNodeResult;
        return {
            success: false,
            error 
        };
    }

    // Collect all nodes into a map
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
    collectNodes(rootNodeResult);

    return {
        success: true,
        gameTree: {
            id: gameDefinition.gameId,
            root: rootNodeResult.nodeId,
            nodes: allNodes,
        },
    };
}
