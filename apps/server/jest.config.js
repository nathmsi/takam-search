/** Two projects: the unit tests (next to the code, `*.spec.ts`) and the end-to-end tests of each module (`test/**\/*.e2e-spec.ts`). */
const shared = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json', diagnostics: { ignoreCodes: [151002] } }] },
  testEnvironment: 'node',
};

module.exports = {
  projects: [
    { ...shared, displayName: 'unit', testMatch: ['<rootDir>/src/**/*.spec.ts'] },
    { ...shared, displayName: 'e2e', testMatch: ['<rootDir>/test/**/*.e2e-spec.ts'] },
  ],
};
