module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>'],
    testMatch: ['**/*.test.ts'],
    moduleNameMapper: {
        '^@mari/game-definition/types$': '<rootDir>/../game-definition/types',
        '^@mari/game-tree/game-tree$': '<rootDir>/../game-tree/game-tree',
    },
};
