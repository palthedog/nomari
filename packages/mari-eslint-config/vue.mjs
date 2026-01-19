import baseConfig from './index.mjs';
import vuePlugin from 'eslint-plugin-vue';
import vueParser from 'vue-eslint-parser';
import tsparser from '@typescript-eslint/parser';
import eslintConfigPrettier from 'eslint-config-prettier';

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
            // Disable Vue formatting rules that conflict with Prettier
            'vue/html-indent': 'off',
            'vue/html-closing-bracket-newline': 'off',
            'vue/html-closing-bracket-spacing': 'off',
            'vue/html-self-closing': 'off',
            'vue/max-attributes-per-line': 'off',
            'vue/first-attribute-linebreak': 'off',
            'vue/multiline-html-element-content-newline': 'off',
            'vue/singleline-html-element-content-newline': 'off',
        },
    },
    // Disable formatting rules that conflict with Prettier
    eslintConfigPrettier,
];
