import { createRouter, createWebHashHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';

// Dummy component - App.vue handles rendering, router is only for URL state
const EmptyComponent = {
    render: () => null
};

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        redirect: '/edit/scenario',
    },

    // Local editing (no source)
    {
        path: '/edit',
        redirect: '/edit/scenario',
    },
    {
        path: '/edit/scenario',
        name: 'local-edit-scenario',
        component: EmptyComponent,
    },
    {
        path: '/edit/situation/:situationId',
        name: 'local-edit-situation',
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
        redirect: (to) => `/example/${to.params.exampleName}/edit/scenario`,
    },
    {
        path: '/example/:exampleName/edit',
        redirect: (to) => `/example/${to.params.exampleName}/edit/scenario`,
    },
    {
        path: '/example/:exampleName/edit/scenario',
        name: 'example-edit-scenario',
        component: EmptyComponent,
    },
    {
        path: '/example/:exampleName/edit/situation/:situationId',
        name: 'example-edit-situation',
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
];

const router = createRouter({
    history: createWebHashHistory(),
    routes,
});

export default router;
