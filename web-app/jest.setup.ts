// Mock global fetch (needed by export.test.ts)
global.fetch = jest.fn();

// Suppress console.log/warn during tests (reduce noise)
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});
