/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  transform: {
    '^.+\\.ts$': ['ts-jest', { diagnostics: { ignoreCodes: [151002] } }],
  },
  testEnvironment: 'node',
  setupFilesAfterEnv: ['../shared/jest.setup.cjs'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: ['index.ts'],
  coverageDirectory: 'coverage',
};
