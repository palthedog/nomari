/**
 * Route Guards
 *
 * Handles side effects during navigation:
 *
 * beforeEach:
 *   1. Example Loading - Load protobuf when navigating to /example/:exampleName/...
 *   2. Strategy Validation - Validate scenario and build game tree when entering strategy mode
 *   3. Auto-redirect to Root - Redirect /strategy to /strategy/node/:rootId
 *
 * afterEach:
 *   1. Node Verification - If nodeId doesn't exist in tree, redirect to root
 */
import type { Router, RouteLocationNormalized } from 'vue-router';
import log from 'loglevel';
import { useScenarioStore } from '@/stores/scenario-store';
import { useGameTreeStore } from '@/stores/game-tree-store';
import { useNotificationStore } from '@/stores/notification-store';
import { useSolverStore } from '@/stores/solver-store';
import { parseAsProto } from '@/utils/export';

// Track loaded example to avoid reloading
let loadedExample: string | null = null;

// Validate example name to prevent path traversal (alphanumeric and underscore only)
function isValidExampleName(name: string): boolean {
    return /^[a-zA-Z0-9_]+$/.test(name);
}

// Get source type from route
function getSourceType(route: RouteLocationNormalized): 'local' | 'example' {
    const name = route.name?.toString() ?? '';
    return name.startsWith('example-') ? 'example' : 'local';
}

// Check if route is strategy mode
function isStrategyRoute(route: RouteLocationNormalized): boolean {
    const name = route.name?.toString() ?? '';
    return name.includes('strategy');
}

// Build redirect route for edit mode
function buildEditRedirect(route: RouteLocationNormalized): {
    name: string;
    params?: Record<string, string>;
} {
    const source = getSourceType(route);
    if (source === 'example') {
        const exampleName = route.params.exampleName;
        if (typeof exampleName === 'string') {
            return {
                name: 'example-edit-scenario',
                params: {
                    exampleName
                }
            };
        }
    }
    return {
        name: 'local-edit-scenario'
    };
}

// Build strategy route with node
function buildStrategyRouteWithNode(
    route: RouteLocationNormalized,
    nodeId: string
): {
    name: string;
    params: Record<string, string>;
} {
    const source = getSourceType(route);
    const params: Record<string, string> = {
        nodeId
    };

    if (source === 'example') {
        const exampleName = route.params.exampleName;
        if (typeof exampleName === 'string') {
            params.exampleName = exampleName;
        }
        return {
            name: 'example-strategy-node',
            params
        };
    }
    return {
        name: 'local-strategy-node',
        params
    };
}

// Load example from static files
async function loadExample(exampleName: string): Promise<boolean> {
    if (!isValidExampleName(exampleName)) {
        const notificationStore = useNotificationStore();
        notificationStore.showError(`Invalid example name: ${exampleName}`);
        return false;
    }

    try {
        const response = await fetch(`${import.meta.env.BASE_URL}static/examples/${exampleName}.pb`);
        const contentType = response.headers.get('content-type') ?? '';
        if (!response.ok || contentType.includes('text/html')) {
            const notificationStore = useNotificationStore();
            notificationStore.showError(`Failed to load example: ${exampleName}`);
            return false;
        }
        const buffer = await response.arrayBuffer();
        const scenario = parseAsProto(buffer);
        const scenarioStore = useScenarioStore();
        scenarioStore.loadScenario(scenario);
        loadedExample = exampleName;
        return true;
    } catch (error) {
        log.error('Failed to load example:', error);
        const notificationStore = useNotificationStore();
        notificationStore.showError(`Failed to load example: ${exampleName}`);
        return false;
    }
}

export function setupRouteGuards(router: Router): void {
    // Before each navigation
    router.beforeEach(async (to, from) => {
        // 1. Handle example loading
        const toExampleName = to.params.exampleName;
        const fromExampleName = from.params.exampleName;

        if (typeof toExampleName === 'string') {
            // Load example if different from current
            if (toExampleName !== fromExampleName || loadedExample !== toExampleName) {
                const loaded = await loadExample(toExampleName);
                if (!loaded) {
                    // Failed to load example, redirect to local edit
                    return {
                        name: 'local-edit-scenario'
                    };
                }
            }
        } else {
            // Leaving example route, clear tracking
            loadedExample = null;
        }

        // 2. Validate before entering strategy mode
        const enteringStrategy = isStrategyRoute(to) && !isStrategyRoute(from);
        if (enteringStrategy) {
            const scenarioStore = useScenarioStore();
            if (!scenarioStore.validateAndShowErrors()) {
                // Validation failed, redirect to edit
                return buildEditRedirect(to);
            }

            // Build game tree
            const gameTreeStore = useGameTreeStore();
            if (!gameTreeStore.ensureGameTreeUpdated()) {
                // Tree build failed, redirect to edit
                return buildEditRedirect(to);
            }

            // Start solving
            const solverStore = useSolverStore();
            solverStore.ensureSolved();
        }

        // 3. If entering strategy without nodeId, redirect to root
        if (isStrategyRoute(to) && !to.params.nodeId) {
            const gameTreeStore = useGameTreeStore();

            // Ensure tree is built (for direct URL access)
            if (!gameTreeStore.gameTree) {
                const scenarioStore = useScenarioStore();
                if (!scenarioStore.validateAndShowErrors()) {
                    return buildEditRedirect(to);
                }
                if (!gameTreeStore.ensureGameTreeUpdated()) {
                    return buildEditRedirect(to);
                }
                const solverStore = useSolverStore();
                solverStore.ensureSolved();
            }

            const root = gameTreeStore.gameTree?.root;
            if (root) {
                return buildStrategyRouteWithNode(to, root);
            }
        }

        return true;
    });

    // After each navigation - verify node exists
    router.afterEach((to) => {
        if (!isStrategyRoute(to)) {
            return;
        }

        const nodeId = to.params.nodeId;
        if (typeof nodeId !== 'string') {
            return;
        }

        const gameTreeStore = useGameTreeStore();
        const gameTree = gameTreeStore.gameTree;

        if (!gameTree) {
            return;
        }

        // If node doesn't exist in tree, redirect to root
        if (!gameTree.nodes[nodeId]) {
            log.warn(`Node ${nodeId} not found in game tree, redirecting to root`);
            if (gameTree.root) {
                router.replace(buildStrategyRouteWithNode(to, gameTree.root));
            }
        }
    });
}

// Export for resetting in tests
export function resetLoadedExample(): void {
    loadedExample = null;
}
