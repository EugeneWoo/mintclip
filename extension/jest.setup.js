/**
 * Jest setup file
 * Runs before each test suite
 */

// Mock import.meta.env (Vite-specific, not available in Jest/Node environment)
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        MODE: 'test',
        VITE_BACKEND_URL: 'http://localhost:8000',
        VITE_WEBAPP_URL: 'http://localhost:5173',
      },
    },
  },
  writable: true,
});

// Add custom matchers from jest-dom
require('@testing-library/jest-dom');

// Mock window.matchMedia (required for some CSS-in-JS libraries)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock Element.prototype.scrollIntoView (not available in jsdom)
Element.prototype.scrollIntoView = jest.fn();

// Mock chrome APIs globally
global.chrome = {
  runtime: {
    sendMessage: jest.fn(),
    lastError: undefined, // Use undefined instead of null for proper typing
  },
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
  identity: {
    getAuthToken: jest.fn(),
    removeCachedAuthToken: jest.fn(),
  },
  action: {
    openPopup: jest.fn(),
  },
};
