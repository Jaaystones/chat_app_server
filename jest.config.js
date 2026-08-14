/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/*.test.ts'],
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  // Integration tests share one real database; running files in parallel
  // causes one file's cleanup to race another file's in-flight test.
  maxWorkers: 1,
  // Default 5000ms is tight for tests doing several real HTTP+DB round trips
  // once the LibreTranslate container is also competing for CPU/memory.
  testTimeout: 15000,
};
