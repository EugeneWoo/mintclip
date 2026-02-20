export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom', // Changed from 'node' to support React components
  roots: ['<rootDir>/__tests__'],
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Mock config.ts to avoid import.meta.env (Vite-only, not available in Jest)
    '^../src/config$': '<rootDir>/__tests__/__mocks__/config.ts',
    '^../../src/config$': '<rootDir>/__tests__/__mocks__/config.ts',
    '^../config$': '<rootDir>/__tests__/__mocks__/config.ts',
    '^./config$': '<rootDir>/__tests__/__mocks__/config.ts',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        module: 'esnext',
        moduleResolution: 'bundler',
      },
    }],
  },
};

