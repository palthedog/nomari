import {
    GameDefinition,
    DynamicState,
    ResourceConsumption,
    ResourceType,
    TerminalSituationType,
    Situation,
    TerminalSituation,
    Action,
    RewardComputationMethod,
    CornerState,
} from '@mari/ts-proto';
import {
    GameTree,
    Node,
    NodeTransition,
    Reward,
} from '@mari/game-tree/game-tree';

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
    situationId?: string;
    stateHash?: string;
}

/**
 * Result type for game tree building
 */
export type GameTreeBuildResult =
    | { success: true; gameTree: GameTree }
    | { success: false; error: GameTreeBuildError };

/**
 * Hash a DynamicState to create a unique identifier
 */
function hashDynamicState(state: DynamicState): string {
    const sorted = [...state.resources].sort((a, b) => a.resourceType - b.resourceType);
    return sorted.map(r => `${r.resourceType}:${r.value.toFixed(2)}`).join('|');
}

/**
 * Apply resource consumptions to a dynamic state
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
        const newValue = Math.max(0, currentValue - consumption.value);
        newResources.set(consumption.resourceType, newValue);
    }

    // Convert back to array
    const resources = Array.from(newResources.entries()).map(([resourceType, value]) => ({
        resourceType,
        value,
    }));

    return { resources };
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
        return { isTerminal: true, type: 'draw' };
    } else if (playerHealth <= 0) {
        return { isTerminal: true, type: 'lose' };
    } else if (opponentHealth <= 0) {
        return { isTerminal: true, type: 'win' };
    }

    return { isTerminal: false, type: null };
}

/**
 * Calculates rewards for both players based on win probability.
 * Rewards are scaled so that winProbability=1 yields +10000,
 * winProbability=0 yields -10000, and 0.5 yields 0 for player.
 */
function calculateRewardForWinProbability(winProbability: number): { playerReward: number; opponentReward: number } {
    // Scale reward: -10000 to +10000 based on win probability
    // winProbability = 0 -> -10000, winProbability = 1 -> +10000
    const playerReward = winProbability * 20000 - 10000;
    const opponentReward = -playerReward; // Zero-sum game
    return { playerReward, opponentReward };
}

/**
 * Calculate reward for neutral terminal situation based on win probability.
 */
function calculateRewardForNeutral(
    playerHealth: number,
    opponentHealth: number
): { playerReward: number; opponentReward: number } {
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
 */
function calculateRewardForWinProbabilityWithCorner(
    playerHealth: number,
    opponentHealth: number,
    cornerState: CornerState | undefined,
    cornerPenalty: number
): { playerReward: number; opponentReward: number } {
    const totalHealth = playerHealth + opponentHealth;
    let winProbability: number;
    if (totalHealth === 0) {
        winProbability = 0.5; // When both zero, treat as equally likely (draw)
    } else {
        winProbability = playerHealth / totalHealth;
    }

    // Apply corner penalty if applicable
    if (cornerState === CornerState.PLAYER_IN_CORNER) {
        winProbability = Math.max(0, winProbability - cornerPenalty);
    } else if (cornerState === CornerState.OPPONENT_IN_CORNER) {
        winProbability = Math.min(1, winProbability + cornerPenalty);
    }
    // For NONE, UNKNOWN, or undefined, no penalty is applied

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
): { playerReward: number; opponentReward: number } {
    const damageDealt = initialOpponentHealth - opponentHealth;
    const damageReceived = initialPlayerHealth - playerHealth;
    const damageRace = damageDealt - damageReceived;

    // Use damage race value directly without scaling
    const playerReward = damageRace;
    const opponentReward = -damageRace; // Zero-sum game
    return { playerReward, opponentReward };
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
    initialOpponentHealth: number
): Node {
    let playerReward: number;
    let opponentReward: number;

    if (type === 'win') {
        ({ playerReward, opponentReward } = calculateRewardForWinProbability(1));
    } else if (type === 'lose') {
        ({ playerReward, opponentReward } = calculateRewardForWinProbability(0));
    } else {
        // draw: use selected reward computation method
        if (rewardComputationMethod && rewardComputationMethod.method.oneofKind !== undefined) {
            if (rewardComputationMethod.method.oneofKind === 'damageRace') {
                ({ playerReward, opponentReward } = calculateRewardForDamageRace(
                    playerHealth,
                    opponentHealth,
                    initialPlayerHealth,
                    initialOpponentHealth
                ));
            } else if (rewardComputationMethod.method.oneofKind === 'winProbability') {
                const cornerPenalty = rewardComputationMethod.method.winProbability.cornerPenalty || 0;
                ({ playerReward, opponentReward } = calculateRewardForWinProbabilityWithCorner(
                    playerHealth,
                    opponentHealth,
                    undefined, // No corner state for auto-generated terminal nodes
                    cornerPenalty
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
        },
        transitions: [],
        playerActions: undefined,
        opponentActions: undefined,
        playerReward: { value: playerReward },
        opponentReward: { value: opponentReward },
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
    initialOpponentHealth: number
): Node {
    if (terminalSituation.type === TerminalSituationType.NEUTRAL) {
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
                const cornerPenalty = rewardComputationMethod.method.winProbability.cornerPenalty || 0;
                ({ playerReward, opponentReward } = calculateRewardForWinProbabilityWithCorner(
                    playerHealth,
                    opponentHealth,
                    terminalSituation.cornerState,
                    cornerPenalty
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
            },
            transitions: [],
            playerActions: undefined,
            opponentActions: undefined,
            playerReward: { value: playerReward },
            opponentReward: { value: opponentReward },
        };
    }

    // For other terminal types, create a node with no rewards (to be set by caller if needed)
    return {
        nodeId: nodeId,
        name: terminalSituation.name,
        description: terminalSituation.description || terminalSituation.name,
        state: {
            situation_id: terminalSituation.situationId,
            playerHealth: playerHealth,
            opponentHealth: opponentHealth,
        },
        transitions: [],
        playerActions: undefined,
        opponentActions: undefined,
    };
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
    const initialDynamicState = gameDefinition.initialDynamicState || { resources: [] };
    const initialPlayerHealth = getResourceValue(initialDynamicState, ResourceType.PLAYER_HEALTH);
    const initialOpponentHealth = getResourceValue(initialDynamicState, ResourceType.OPPONENT_HEALTH);

    // Get reward computation method
    const rewardComputationMethod = gameDefinition.rewardComputationMethod;

    // Map situations and terminal situations by ID
    const situationMap = new Map<string, Situation>();
    for (const situation of gameDefinition.situations) {
        situationMap.set(situation.situationId, situation);
    }

    const terminalSituationMap = new Map<string, TerminalSituation>();
    for (const terminalSituation of gameDefinition.terminalSituations) {
        terminalSituationMap.set(terminalSituation.situationId, terminalSituation);
    }

    /**
     * Type guard to check if a value is a GameTreeBuildError
     */
    function isError(result: Node | GameTreeBuildError): result is GameTreeBuildError {
        return 'code' in result;
    }

    /**
     * Get or create a node for a given situation and dynamic state
     * Returns either a Node or an error result
     */
    function getOrCreateNode(situationId: string, state: DynamicState): Node | GameTreeBuildError {
        const stateHash = hashDynamicState(state);
        const nodeKey = `${situationId}_${stateHash}`;

        // Check if node already exists
        if (nodeMap.has(nodeKey)) {
            return nodeMap.get(nodeKey)!;
        }

        // Check if node is currently being created (infinite loop prevention)
        if (creatingNodes.has(nodeKey)) {
            // DynamicStateに変化がない循環参照はエラーとする
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
                initialOpponentHealth
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
                initialOpponentHealth
            );

            nodeMap.set(nodeKey, node);
            nodeStateMap.set(nodeKey, state);
            creatingNodes.delete(nodeKey);
            return node;
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
            description: situation.description,
            state: {
                situation_id: situationId,
                playerHealth: playerHealth,
                opponentHealth: opponentHealth,
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

        // Process transitions
        for (const protoTransition of situation.transitions) {
            // Apply resource consumptions
            const newState = applyResourceConsumptions(state, protoTransition.resourceConsumptions);

            // Check if the new state is terminal
            const newTerminalCheck = isTerminalState(newState);
            let nextNode: Node;

            if (newTerminalCheck.isTerminal) {
                // Create terminal node
                const playerHealth = getResourceValue(
                    newState,
                    ResourceType.PLAYER_HEALTH
                );
                const opponentHealth = getResourceValue(
                    newState,
                    ResourceType.OPPONENT_HEALTH
                );
                const newStateHash = hashDynamicState(newState);
                const terminalNodeKey = `terminal_${newTerminalCheck.type}_${newStateHash}`;
                const terminalNodeResult = getOrCreateNode(terminalNodeKey, newState);
                if (isError(terminalNodeResult)) {
                    return terminalNodeResult; // Return error to propagate
                }
                nextNode = terminalNodeResult;

                // Rewards are already set on the terminal node by createTerminalNode
                const transition: NodeTransition = {
                    playerActionId: protoTransition.playerActionId,
                    opponentActionId: protoTransition.opponentActionId,
                    nextNodeId: nextNode.nodeId,
                };
                node.transitions.push(transition);
                continue; // Skip to next transition
            }

            // Check if next situation is a terminal situation
            const nextTerminalSituation = terminalSituationMap.get(protoTransition.nextSituationId);
            if (nextTerminalSituation) {
                // Use the situationId directly, not a pre-computed nodeKey
                const terminalNodeResult = getOrCreateNode(protoTransition.nextSituationId, newState);
                if (isError(terminalNodeResult)) {
                    return terminalNodeResult; // Return error to propagate
                }
                nextNode = terminalNodeResult;

                // Rewards are already set on the terminal node by createTerminalSituationNode
                const transition: NodeTransition = {
                    playerActionId: protoTransition.playerActionId,
                    opponentActionId: protoTransition.opponentActionId,
                    nextNodeId: nextNode.nodeId,
                };
                node.transitions.push(transition);
            } else {
                // Regular transition to next situation
                const regularNodeResult = getOrCreateNode(protoTransition.nextSituationId, newState);
                if (isError(regularNodeResult)) {
                    return regularNodeResult; // Return error to propagate
                }
                nextNode = regularNodeResult;
                const transition: NodeTransition = {
                    playerActionId: protoTransition.playerActionId,
                    opponentActionId: protoTransition.opponentActionId,
                    nextNodeId: nextNode.nodeId,
                };
                node.transitions.push(transition);
            }
        }

        nodeMap.set(nodeKey, node);
        nodeStateMap.set(nodeKey, state);
        creatingNodes.delete(nodeKey);
        return node;
    }

    // Build the tree starting from root
    const rootNodeResult = getOrCreateNode(
        gameDefinition.rootSituationId,
        initialDynamicState
    );

    if (isError(rootNodeResult)) {
        const error: GameTreeBuildError = rootNodeResult;
        return { success: false, error };
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
