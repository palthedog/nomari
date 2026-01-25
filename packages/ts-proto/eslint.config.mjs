import baseConfig from '@nomari/eslint-config';

export default [
    ...baseConfig,
    {
        ignores: [
            'generated/**',
            'dist/**',
            'node_modules/**',
        ]
    },
];
