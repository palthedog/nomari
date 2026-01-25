import baseConfig from './index.mjs';
import vuePlugin from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import tsparser from '@typescript-eslint/parser';

export default [
    ...baseConfig,
    ...vuePlugin.configs['flat/recommended'],
    {
        files: ['*.vue', '**/*.vue'],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: tsparser,
                ecmaVersion: 2026,
                sourceType: 'module',
            },
        },
        rules: {
            // Vue specific rules
            'vue/multi-word-component-names': 'off',
        },
    },
];
