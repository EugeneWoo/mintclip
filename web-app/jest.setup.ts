import '@testing-library/jest-dom';

// Mock URL.createObjectURL / revokeObjectURL (not in jsdom)
global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock document.createElement('a').click so download tests don't crash
const originalCreateElement = document.createElement.bind(document);
jest.spyOn(document, 'createElement').mockImplementation((tag: string) => {
  const element = originalCreateElement(tag);
  if (tag === 'a') {
    jest.spyOn(element as HTMLAnchorElement, 'click').mockImplementation(() => {});
  }
  return element;
});

// Mock global fetch
global.fetch = jest.fn();

// Suppress console.log/warn during tests (reduce noise)
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'warn').mockImplementation(() => {});
