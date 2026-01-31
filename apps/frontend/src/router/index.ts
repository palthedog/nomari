import { createRouter, createWebHashHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

// Dummy component - App.vue handles rendering, router is only for URL state
const EmptyComponent = {
    render: () => null
};

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        redirect: '/edit',
    },

    // Local editing (no source)
    {
        path: '/edit',
        name: 'local-edit',
        component: EmptyComponent,
    },
    {
        path: '/strategy',
        name: 'local-strategy',
        component: EmptyComponent,
    },
    {
        path: '/strategy/node/:nodeId',
        name: 'local-strategy-node',
        component: EmptyComponent,
    },

    // Example loading
    {
        path: '/example/:exampleName',
        redirect: (to) => `/example/${to.params.exampleName}/edit`,
    },
    {
        path: '/example/:exampleName/edit',
        name: 'example-edit',
        component: EmptyComponent,
    },
    {
        path: '/example/:exampleName/strategy',
        name: 'example-strategy',
        component: EmptyComponent,
    },
    {
        path: '/example/:exampleName/strategy/node/:nodeId',
        name: 'example-strategy-node',
        component: EmptyComponent,
    },

    // Demo pages
    {
        path: '/demo/sankey-tree',
        name: 'demo-sankey-tree',
        component: () => import('@/pages/demo-sankey-tree-page.vue'),
    },
];

const router = createRouter({
    history: createWebHashHistory(),
    routes,
});

export default router;
