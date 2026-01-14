import baseConfig from './index.mjs';
import vuePlugin from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import tsparser from '@typescript-eslint/parser';
import tseslint from '@typescript-eslint/eslint-plugin';

export default [
    ...baseConfig,
    ...vuePlugin.configs['flat/recommended'],
    {
        files: ['**/*.vue'],
        languageOptions: {
            parser: vueParser,
            parserOptions: {
                parser: tsparser,
                ecmaVersion: 2020,
                sourceType: 'module',
            },
        },
        rules: {
            // Vue specific rules
            'vue/multi-word-component-names': 'off',
        },
    },
];
