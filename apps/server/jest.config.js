/** Two projects: the unit tests (next to the code, `*.spec.ts`) and the end-to-end tests of each module (`test/**\/*.e2e-spec.ts`). */
const shared = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', diagnostics: { ignoreCodes: [151002] } }] },
  testEnvironment: 'node',
};

module.exports = {
  // Measured with `pnpm test:coverage`. The bars sit a little under what is measured today (statements 99.0, branches 87.1,
  // functions 100, lines 100 on 2026-11-11): a change that lowers the coverage fails the pipeline.
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts', '!src/**/*.spec.ts'],
  coverageThreshold: { global: { statements: 95, branches: 83, functions: 95, lines: 97 } },
  projects: [
    { ...shared, displayName: 'unit', testMatch: ['<rootDir>/src/**/*.spec.ts'] },
    { ...shared, displayName: 'e2e', testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'] },
  ],
};
