import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import stylistic from '@stylistic/eslint-plugin';

export default [
    js.configs.recommended,
    ...tseslint.configs['flat/recommended'],
    {
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: 'module',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
            '@stylistic': stylistic,
        },
        rules: {
            // Google Style Guide aligned rules
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                },
            ],
            // General code quality
            'no-console': ['warn', { allow: ['warn', 'error'] }],
            'prefer-const': 'warn',
            'no-var': 'warn',
            'curly': ['error', 'all'],
            '@stylistic/brace-style': [
                'error',
                '1tbs',
                {
                    allowSingleLine: false,
                },
            ],
            '@stylistic/indent': ['error', 4],
            '@stylistic/object-curly-newline': [
                'error',
                {
                    ObjectExpression: { multiline: true, minProperties: 2 },
                    ObjectPattern: { multiline: true },
                    ImportDeclaration: { multiline: true },
                    ExportDeclaration: { multiline: true },
                },
            ],
            '@stylistic/object-property-newline': [
                'error',
                {
                    allowAllPropertiesOnSameLine: false,
                },
            ],
        },
    },
];
