/**
 * Jest setup file
 * Runs before each test suite
 */

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
