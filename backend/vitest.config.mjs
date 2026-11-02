// Lambdas commit their compiled index.js next to index.ts; resolve .ts first so tests run the source and vi.mock applies.
export default {
  root: process.cwd(),
  resolve: {
    extensions: ['.ts', '.mts', '.mjs', '.js', '.json'],
  },
  test: {
    environment: 'node',
    include: ['**/__tests__/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
};
