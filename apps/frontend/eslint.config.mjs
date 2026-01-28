import vueConfig from '@nomari/eslint-config/vue';

export default [
    ...vueConfig,
    {
        ignores: ['.vite/**', 'dist/**', 'node_modules/**'],
    },
];
