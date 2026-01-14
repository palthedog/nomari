import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
    js.configs.recommended,
    ...tseslint.configs['flat/recommended'],
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 2020,
                sourceType: 'module',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
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
        },
    },
];
