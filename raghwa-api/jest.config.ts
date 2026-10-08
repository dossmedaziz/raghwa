import type { Config } from 'jest';

// Unit tests: pure logic, in `*.spec.ts` files next to the code under src/. E2E tests live in test/.
const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.(t|j)s', '!src/**/*.module.ts', '!src/main.ts', '!src/database/migrations/**'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
};

export default config;
