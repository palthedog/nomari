import vueConfig from '@mari/eslint-config/vue';

export default [
    ...vueConfig,
    {
        ignores: ['.vite/**', 'dist/**', 'node_modules/**'],
    },
];
