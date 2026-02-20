/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src/__tests__'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  setupFilesAfterFramework: ['<rootDir>/jest.setup.ts'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    // CSS/style imports — return empty object
    '\\.(css|less|scss|sass)$': '<rootDir>/src/__tests__/__mocks__/styleMock.js',
    // Mock the config module (uses window.location which isn't available in jsdom)
    '^../config$': '<rootDir>/src/__tests__/__mocks__/config.ts',
    '^../../config$': '<rootDir>/src/__tests__/__mocks__/config.ts',
    '^../../../config$': '<rootDir>/src/__tests__/__mocks__/config.ts',
    // Mock JSZip (uses browser APIs not available in jsdom)
    '^jszip$': '<rootDir>/src/__tests__/__mocks__/jszip.ts',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        module: 'commonjs',
      },
    }],
  },
  extensionsToTreatAsEsm: [],
};
