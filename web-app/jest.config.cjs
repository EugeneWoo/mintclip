/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src/__tests__'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    // CSS/style imports — return empty object
    '\\.(css|less|scss|sass)$': '<rootDir>/src/__tests__/__mocks__/styleMock.js',
    // Mock the config module by absolute path (uses window.location which isn't available in jsdom)
    '<rootDir>/src/config': '<rootDir>/src/__tests__/__mocks__/config.ts',
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
};
