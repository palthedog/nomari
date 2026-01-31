# Router Architecture

## Design Principle: URL as Single Source of Truth

The router follows a **unidirectional data flow** where the URL is the single source of truth for application state.

```
URL (Source of Truth)
    │
    ▼
Route Guards (side effects: validation, loading, redirects)
    │
    ▼
Derived Stores (state computed from route)
    │
    ▼
Components (read stores, navigate via router.push)
```

## Files

- **index.ts** - Route definitions. All routes use `EmptyComponent` because `App.vue` handles rendering based on store state.
- **guards.ts** - Navigation guards for side effects (example loading, validation, node verification).

## Store Integration

Stores derive state from `router.currentRoute`:

```typescript
// view-store.ts
const viewMode = computed(() => {
    const name = router.currentRoute.value.name?.toString() ?? '';
    return name.includes('strategy') ? 'strategy' : 'edit';
});

// game-tree-store.ts
const selectedNodeId = computed(() => {
    return router.currentRoute.value.params.nodeId ?? gameTree.value?.root;
});
```

Navigation uses `router.push()`:

```typescript
function selectNode(nodeId: string) {
    router.push({ name: 'local-strategy-node', params: { nodeId } });
}
```

## Benefits

- **No race conditions** - Data flows one direction
- **Predictable** - State is deterministic based on URL
- **Deep-linking** - URL always reflects app state
