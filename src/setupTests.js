// src/setupTests.js
import '@testing-library/jest-dom'; // Keep this if you have it

// Polyfill / Mock for ResizeObserver (Keep from previous step)
class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
}
window.ResizeObserver = ResizeObserver;

// --- ADD THIS BLOCK ---
// Mock HTMLCanvasElement.prototype.getContext needed for Jest/JSDOM
HTMLCanvasElement.prototype.getContext = function (contextType) {
  if (contextType === '2d') {
    // Return a mock 2D context with methods used by the component
    return {
      fillRect: jest.fn(),
      save: jest.fn(),
      restore: jest.fn(),
      translate: jest.fn(),
      scale: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      closePath: jest.fn(),
      fill: jest.fn(),
      stroke: jest.fn(),
      setTransform: jest.fn(), // Mock the method causing the error
      getTransform: jest.fn(() => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })),
      // Add other methods if needed later
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      clearRect: jest.fn(), // Add clearRect if used
      // ... any other context methods used by drawTile or resizeCanvas
    };
  }
  return null; // Return null for other context types
};
// --- End of block ---