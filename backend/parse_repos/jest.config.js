/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['../shared/jest.setup.cjs'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['index.ts'],
  coverageDirectory: 'coverage',
};
