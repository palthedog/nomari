module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>'],
    testMatch: ['**/*.test.ts'],
    moduleNameMapper: {
        '^@mari/ts-proto$': '<rootDir>/../ts-proto/generated/game',
        '^@mari/game-tree/game-tree$': '<rootDir>/../game-tree/game-tree',
    },
};
