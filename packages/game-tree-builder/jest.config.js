module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>'],
    testMatch: ['**/*.test.ts'],
    moduleNameMapper: {
        '^@nomari/ts-proto$': '<rootDir>/../ts-proto/generated/game',
        '^@nomari/game-tree/game-tree$': '<rootDir>/../game-tree/game-tree',
    },
};
