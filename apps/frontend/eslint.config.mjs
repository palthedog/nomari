import vueConfig from '@mari/eslint-config/vue';

export default [
    ...vueConfig,
    {
        ignores: ['dist/**', 'node_modules/**'],
    },
];
