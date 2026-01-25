import baseConfig from '@nomari/eslint-config';

export default [
    ...baseConfig,
    {
        ignores: [
            '.vite/**',
            'dist/**',
            'node_modules/**',
        ]
    },
];
