module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>'],
    testMatch: ['**/*.test.ts'],
    moduleNameMapper: {
        '^@mari/ts-proto$': '<rootDir>/../ts-proto',
        '^@mari/game-tree/game-tree$': '<rootDir>/../game-tree/game-tree',
    },
};
