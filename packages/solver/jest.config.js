module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>'],
    testMatch: ['**/*.test.ts'],
    collectCoverageFrom: [
        '**/*.ts',
        '!**/*.test.ts',
        '!**/node_modules/**'
    ],
    moduleNameMapper: {
        '^@mari/game-tree/game-tree$': '<rootDir>/../game-tree/game-tree',
    },
};
