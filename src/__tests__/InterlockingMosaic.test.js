// src/__tests__/InterlockingMosaic.test.js
import React from 'react'; // Keep top-level React import for JSX elsewhere if needed
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { throttle } from 'lodash'; // Keep lodash unmocked

// --- Import Component Under Test (Using User's Path) ---
import InterlockingMosaic from '/Users/dominicgarvey/Code_Projects/mosaic-new/src/components/InterlockingMosaic/index.js'; // Assuming index.js is the entry

// --- Mock Dependencies (Using User's Paths where applicable) ---

// Mock Hooks
const mockInitializeFocus = jest.fn();
const mockExitFocus = jest.fn();
jest.mock('/Users/dominicgarvey/Code_Projects/mosaic-new/src/hooks/useFocusMode.js', () => ({
  useFocusMode: jest.fn(() => ({
    focusMode: false,
    focusScale: 1,
    interactionEnabled: true,
    initializeFocus: mockInitializeFocus,
    exitFocus: mockExitFocus,
  })),
}));

const mockSetPanEnabled = jest.fn();
jest.mock('/Users/dominicgarvey/Code_Projects/mosaic-new/src/hooks/usePanAndZoom.js', () => jest.fn(() => ({
  transform: { x: 0, y: 0, scale: 1 }, // Default transform
  panEnabled: false,
  setPanEnabled: mockSetPanEnabled,
})));

// Mock Utility Functions
const mockToroidalDistance = jest.fn((p1, p2) => Math.sqrt(Math.pow(p1[0] - p2[0], 2) + Math.pow(p1[1] - p2[1], 2)));
const mockPolygonCentroid = jest.fn(poly => poly && poly.length >= 3 ? [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length] : [0,0]);
const mockDrawTile = jest.fn();
const mockGenerateVoronoiRegionsToroidal = jest.fn();
const mockCalculateGradient2D = jest.fn();
jest.mock('/Users/dominicgarvey/Code_Projects/mosaic-new/src/utils/TessellationUtils.js', () => ({
  toroidalDistance: (p1, p2, w, h) => mockToroidalDistance(p1, p2, w, h),
  polygonCentroid: (poly) => mockPolygonCentroid(poly),
  drawTile: (ctx, tile, scale) => mockDrawTile(ctx, tile, scale),
  generateVoronoiRegionsToroidal: (pts, w, h) => mockGenerateVoronoiRegionsToroidal(pts, w, h),
  calculateGradient2D: (pts, params, delta) => mockCalculateGradient2D(pts, params, delta),
}));

const mockInteractionFeedback = jest.fn();
const mockIsPointInPolygon = jest.fn();
jest.mock('/Users/dominicgarvey/Code_Projects/mosaic-new/src/utils/InteractionUtils.js', () => ({
  createInteractionFeedback: jest.fn(() => mockInteractionFeedback),
  isPointInPolygon: (x, y, poly) => mockIsPointInPolygon(x, y, poly),
}));

const mockCreateEnhancedAnimations = jest.fn(() => ({
    enhancedShatterAnimation: jest.fn(),
}));
jest.mock('/Users/dominicgarvey/Code_Projects/mosaic-new/src/utils/AnimationUtils.js', () => ({
  createEnhancedAnimations: () => mockCreateEnhancedAnimations(),
}));

// Mock SoundUtils (Using corrected full path)
jest.mock('/Users/dominicgarvey/Code_Projects/mosaic-new/src/utils/AnimationUtils.js', () => ({
    // Mock the exported 'createEnhancedAnimations' function directly
    // to return the object structure expected by useMemo's result.
    createEnhancedAnimations: jest.fn(() => ({
        enhancedShatterAnimation: jest.fn(), // The function the component tries to destructure
    })),
}));

// Mock Child Components (Using User's Paths)
jest.mock('/Users/dominicgarvey/Code_Projects/mosaic-new/src/components/InterlockingMosaic/MosaicLoader.js', () => ({ message }) => <div data-testid="mosaic-loader">{message}</div>);
jest.mock('/Users/dominicgarvey/Code_Projects/mosaic-new/src/components/InterlockingMosaic/MosaicStatus.js', () => ({ viewType, tileCount, debugMode }) => <div data-testid="mosaic-status">Status: {viewType} {tileCount} {debugMode ? 'Debug' : ''}</div>);
jest.mock('/Users/dominicgarvey/Code_Projects/mosaic-new/src/components/InterlockingMosaic/MosaicControls.js', () => ({ onToggleFocus, onToggleDebug, onTogglePan, focusMode, debugMode, panEnabled }) => (
  <div data-testid="mosaic-controls">
    <button onClick={onToggleFocus}>Focus: {focusMode ? 'On' : 'Off'}</button>
    <button onClick={onToggleDebug}>Debug: {debugMode ? 'On' : 'Off'}</button>
    <button onClick={onTogglePan}>Pan: {panEnabled ? 'On' : 'Off'}</button>
  </div>
));

// --- CORRECTED Canvas Mock (using require inside factory) ---
jest.mock('/Users/dominicgarvey/Code_Projects/mosaic-new/src/components/InterlockingMosaic/MosaicCanvas.js', () => {
    const ActualReact = require('react'); // Require React dynamically INSIDE the factory
    return ActualReact.forwardRef(({ onClick, onMouseMove, style }, ref) => (
        <canvas
            ref={ref}
            data-testid="mosaic-canvas" // Keep data-testid for queries
            onClick={onClick}
            onMouseMove={onMouseMove}
            style={style}
            width="800" height="600" // Provide default dimensions
        />
    ));
});
// --- END CORRECTED Canvas Mock ---


// Mock Web Worker (Using User's Path)
let mockWorkerInstance;
const mockPostMessage = jest.fn();
const mockTerminate = jest.fn();
let workerOnMessageCallback = null;
let workerOnErrorCallback = null;
// Ensure the path matches exactly what's in the InterlockingMosaic component import
jest.mock('worker-loader!/Users/dominicgarvey/Code_Projects/mosaic-new/src/workers/Tessellation.worker.js', () => {
    return class MockWorker {
        constructor() {
            mockWorkerInstance = this;
            this.postMessage = mockPostMessage;
            this.terminate = mockTerminate;
        }
        set onmessage(callback) { workerOnMessageCallback = callback; }
        set onerror(callback) { workerOnErrorCallback = callback; }
    };
}, { virtual: true });


// Mock Browser APIs
// --- Mock Image API ---
let mockImageInstance;
const mockImageOnload = jest.fn();
const mockImageOnerror = jest.fn();
global.Image = class MockImage {
    constructor() {
        mockImageInstance = this;
    }
    set onload(fn) { mockImageOnload.mockImplementation(fn); }
    get onload() { return mockImageOnload; }
    set onerror(fn) { mockImageOnerror.mockImplementation(fn); }
    get onerror() { return mockImageOnerror; }
    set src(value) { this._src = value; /* console.log("Mock Image src set:", value); */ }
    get src() { return this._src; }
    // Helper methods for tests
    _triggerLoad() {
        this.naturalWidth = 100; this.naturalHeight = 100;
        if (this.onload) { act(() => { this.onload(); }); }
    }
    _triggerError(err = new Error('Mock image load error')) {
        if (this.onerror) { act(() => { this.onerror(err); }); }
    }
};

// --- Other Browser API Mocks ---
// Mock getBoundingClientRect needed by resize logic
Element.prototype.getBoundingClientRect = jest.fn(() => ({
    width: 800, height: 600, top: 0, left: 0, bottom: 600, right: 800, x: 0, y: 0, toJSON: () => {}
}));
// Mock devicePixelRatio
Object.defineProperty(window, 'devicePixelRatio', { value: 1, configurable: true });
// NOTE: We are NOT using fake timers globally here, but will use them in specific describe blocks if needed


// --- Test Suite ---
describe('InterlockingMosaic Component', () => {

    // Helper function
    const createMockTiles = (count = 5) => {
        return Array.from({ length: count }, (_, i) => ({
            id: `tile-${i}`, points: [[i, i], [i + 1, i], [i + 1, i + 1], [i, i + 1]],
            allPieces: [[[i, i], [i + 1, i], [i + 1, i + 1], [i, i + 1]]],
            x: i + 0.5, y: i + 0.5, generatorX: i + 0.5, generatorY: i + 0.5,
            color: `rgb(${i * 10}, ${i * 10}, ${i * 10})`, hasChildren: i % 2 === 0,
        }));
    };

    // Predefined mock results
    const mockVoronoiRegions = Array.from({ length: 500 }, (_, i) => [
        [[i*0.1, i*0.1], [(i+1)*0.1, i*0.1], [(i+1)*0.1, (i+1)*0.1], [i*0.1, (i+1)*0.1]]
    ]);
    const mockGradient = Array.from({ length: 500 }, (_, i) => [Math.random() * 0.1, Math.random() * 0.1]);

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset hooks
        require('/Users/dominicgarvey/Code_Projects/mosaic-new/src/hooks/useFocusMode.js').useFocusMode.mockImplementation(() => ({
          focusMode: false, focusScale: 1, interactionEnabled: true, initializeFocus: mockInitializeFocus, exitFocus: mockExitFocus,
        }));
        require('/Users/dominicgarvey/Code_Projects/mosaic-new/src/hooks/usePanAndZoom.js').mockImplementation(() => ({
          transform: { x: 0, y: 0, scale: 1 }, panEnabled: false, setPanEnabled: mockSetPanEnabled,
        }));
        // Reset worker
        mockWorkerInstance = null; workerOnMessageCallback = null; workerOnErrorCallback = null;
        // Reset utils
        mockGenerateVoronoiRegionsToroidal.mockReturnValue(mockVoronoiRegions);
        mockCalculateGradient2D.mockReturnValue(mockGradient);
        mockIsPointInPolygon.mockReturnValue(false);
        // Reset Image mock state
        mockImageInstance = null;
    });

    // --- Initialization Tests ---
    describe('Initialization and Loading', () => {
        test('should render loader initially and display loading message', () => {
            render(<InterlockingMosaic />);
            expect(screen.getByTestId('mosaic-loader')).toBeInTheDocument();
            // Check initial message, could also check subsequent message if needed
            expect(screen.getByTestId('mosaic-loader')).toHaveTextContent(/Loading source image...|Initializing.../i);
        });

        test('should load image and proceed to generate points and tiles', async () => {
            render(<InterlockingMosaic />);
            expect(screen.getByTestId('mosaic-loader')).toBeInTheDocument();
            expect(mockImageInstance).not.toBeNull();
            mockImageInstance._triggerLoad(); // Simulate successful load

            // Wait for initial Voronoi calculation after image load
            await waitFor(() => expect(mockGenerateVoronoiRegionsToroidal).toHaveBeenCalledTimes(1));
            // Loader should disappear
            await waitFor(() => expect(screen.queryByTestId('mosaic-loader')).not.toBeInTheDocument());
            // drawTile should have been called for initial render
            await waitFor(() => expect(mockDrawTile).toHaveBeenCalled());
        });

        test('should handle image loading error', async () => {
            render(<InterlockingMosaic />);
            expect(mockImageInstance).not.toBeNull();
            mockImageInstance._triggerError(); // Simulate error

            // Should still proceed past loading, possibly with defaults
            await waitFor(() => expect(screen.queryByTestId('mosaic-loader')).not.toBeInTheDocument());
            // Voronoi generation should still happen even if image fails
            await waitFor(() => expect(mockGenerateVoronoiRegionsToroidal).toHaveBeenCalledTimes(1));
        });

        test('should initialize worker', async () => {
            render(<InterlockingMosaic />);
            expect(mockImageInstance).not.toBeNull();
            mockImageInstance._triggerLoad();
            // Wait for worker instance to be created via the mock factory
            await waitFor(() => expect(mockWorkerInstance).not.toBeNull());
            expect(workerOnMessageCallback).toBeInstanceOf(Function);
            expect(workerOnErrorCallback).toBeInstanceOf(Function);
        });

        test('should terminate worker on unmount', async () => {
            const { unmount } = render(<InterlockingMosaic />);
            expect(mockImageInstance).not.toBeNull();
            mockImageInstance._triggerLoad();
            await waitFor(() => expect(mockWorkerInstance).not.toBeNull());
            unmount();
            // Check mock worker's terminate function
            expect(mockTerminate).toHaveBeenCalledTimes(1);
        });
    });

    // --- Worker Communication Tests ---
    describe('Web Worker Communication', () => {
        const simulateWorkerMessage = (data) => { act(() => { if (workerOnMessageCallback) workerOnMessageCallback({ data }); }); };
        const simulateWorkerError = (error) => { act(() => { if (workerOnErrorCallback) workerOnErrorCallback(error); }); };

        // Setup component ready state before each test in this block
        beforeEach(async () => {
             render(<InterlockingMosaic />);
             expect(mockImageInstance).not.toBeNull();
             mockImageInstance._triggerLoad();
             await waitFor(() => expect(screen.queryByTestId('mosaic-loader')).not.toBeInTheDocument());
             await waitFor(() => expect(mockWorkerInstance).not.toBeNull());
        });

        // Use fake timers because the iteration loop uses requestAnimationFrame (mocked by setTimeout)
        beforeEach(() => { jest.useFakeTimers(); });
        afterEach(() => { jest.useRealTimers(); });


        test('should post "iterate_step" message during iteration loop', async () => {
             // Wait for the gradient calculation which happens before postMessage in the loop
             await waitFor(() => expect(mockCalculateGradient2D).toHaveBeenCalled());

             // Advance timers to allow the RAF/setTimeout callback to run
             act(() => { jest.advanceTimersByTime(100); });

             // Check if postMessage was called on the mock worker instance
             await waitFor(() => {
                expect(mockPostMessage).toHaveBeenCalledWith(expect.objectContaining({
                    command: 'iterate_step',
                    data: expect.objectContaining({ grad: mockGradient }) // Check gradient data was passed
                }));
             });
        });

        test('should update tiles and points on "iterationStepComplete" message', async () => {
            const newMockPoints = Array.from({ length: 500 }, () => [Math.random(), Math.random()]);
            // Ensure the mock returns something different for the update step
            const newMockRegions = Array.from({ length: 500 }, (_, i) => [ [[i*0.2, i*0.2]] /* simplified new region */ ]);
            mockGenerateVoronoiRegionsToroidal.mockReturnValue(newMockRegions); // Setup mock for the update

            // Wait for the initial iteration to potentially run
            await waitFor(() => expect(mockCalculateGradient2D).toHaveBeenCalled());
            const initialVoronoiCalls = mockGenerateVoronoiRegionsToroidal.mock.calls.length;

            // Simulate the worker responding
            simulateWorkerMessage({
                status: 'iterationStepComplete',
                result: { points: newMockPoints }
            });

            // Check Voronoi called again after message (in main thread)
            await waitFor(() => expect(mockGenerateVoronoiRegionsToroidal.mock.calls.length).toBeGreaterThan(initialVoronoiCalls));
            // Check centroid called with new region data
            expect(mockPolygonCentroid).toHaveBeenCalledWith(newMockRegions[0][0]); // Check with data from newMockRegions

            const drawCallsBefore = mockDrawTile.mock.calls.length;
            // Advance timers to allow potential drawing updates triggered by state change
            act(() => { jest.advanceTimersByTime(100); });
            await waitFor(() => expect(mockDrawTile.mock.calls.length).toBeGreaterThan(drawCallsBefore));
        });

        test('should handle worker error message', async () => {
            const errorMessage = 'Test Worker Error From Test';
             simulateWorkerError({ message: errorMessage }); // Simulate error from worker

             // Expect the error message to be displayed (assuming setLoadingMessage is used)
             await screen.findByText(`Error: ${errorMessage}`);
             // Loader should remain hidden
             expect(screen.queryByTestId('mosaic-loader')).not.toBeInTheDocument();
        });
    });

    // --- Interaction Tests ---
    describe('User Interactions', () => {
        let canvas;
        let mockOnTileClick;

        beforeEach(async () => {
            mockOnTileClick = jest.fn();
            render(<InterlockingMosaic onTileClick={mockOnTileClick} />);
            expect(mockImageInstance).not.toBeNull();
            mockImageInstance._triggerLoad();
            await waitFor(() => expect(screen.queryByTestId('mosaic-loader')).not.toBeInTheDocument());
            canvas = screen.getByTestId('mosaic-canvas'); // Use data-testid from MOCK canvas
            expect(canvas).toBeInTheDocument();
            // Provide mock regions for tile generation
            mockGenerateVoronoiRegionsToroidal.mockReturnValue(createMockTiles(5).map(t => t.allPieces));
             // Allow initial draw potentially triggered by tile state update
             await waitFor(() => expect(mockDrawTile).toHaveBeenCalled());
             mockDrawTile.mockClear(); // Clear calls from setup for interaction tests
        });

        test('should handle canvas click, find tile, and call feedback/onTileClick', async () => {
             mockIsPointInPolygon.mockReturnValueOnce(true); // Simulate click hits a tile

             fireEvent.click(canvas, { clientX: 100, clientY: 100 });

             // Wait for the interaction util to be called
             await waitFor(() => expect(mockIsPointInPolygon).toHaveBeenCalled());
             // Assuming the logic correctly finds tile index 1 (hasChildren=false) based on mocks
             expect(mockInteractionFeedback).toHaveBeenCalledWith('click');
             expect(mockOnTileClick).toHaveBeenCalled();
        });

         test('should trigger shatter on click if tile has children', async () => {
            jest.useFakeTimers();
            mockIsPointInPolygon.mockReturnValueOnce(true);
            // Assume logic finds tile index 0 (hasChildren=true) based on mocks

            fireEvent.click(canvas, { clientX: 100, clientY: 100 });

            await waitFor(() => expect(mockIsPointInPolygon).toHaveBeenCalled());
            expect(mockInteractionFeedback).toHaveBeenCalledWith('shatter');
            // Check class applied to parent div
            expect(canvas.parentElement).toHaveClass('shattered');

            // Fast-forward timers for the setTimeout in shatter logic
            act(() => { jest.advanceTimersByTime(501); });
            expect(canvas.parentElement).not.toHaveClass('shattered');
            expect(mockOnTileClick).toHaveBeenCalled();

            jest.useRealTimers();
         });

        test('should call initializeFocus on double click on selected tile', async () => {
            mockIsPointInPolygon.mockReturnValue(true); // Assume all clicks hit

            // First click selects the tile (and calls interaction feedback)
            fireEvent.click(canvas, { clientX: 100, clientY: 100 });
            await waitFor(() => expect(mockInteractionFeedback).toHaveBeenCalledTimes(1));

            // Second click (double click)
            fireEvent.click(canvas, { clientX: 100, clientY: 100, detail: 2 });

            // Check if the mocked focus hook function was called
            await waitFor(() => expect(mockInitializeFocus).toHaveBeenCalled());
        });

         test('should change cursor on hover', async () => {
            // Hover outside a tile
            mockIsPointInPolygon.mockReturnValue(false);
            fireEvent.mouseMove(canvas, { clientX: 10, clientY: 10 });
            await waitFor(() => expect(canvas).toHaveStyle('cursor: default'));

            // Hover inside a tile
            mockIsPointInPolygon.mockReturnValue(true);
            fireEvent.mouseMove(canvas, { clientX: 100, clientY: 100 });
            await waitFor(() => expect(canvas).toHaveStyle('cursor: pointer'));
         });

         test('should toggle controls via buttons', () => {
             render(<InterlockingMosaic />); // Fresh render for controls
             // Use mocked controls component testid
             const controls = screen.getByTestId('mosaic-controls');
             // Use queries appropriate for mocked controls
             const panButton = screen.getByRole('button', { name: /Pan: Off/i });
             const debugButton = screen.getByRole('button', { name: /Debug: Off/i });
             const focusButton = screen.getByRole('button', { name: /Focus: Off/i });

             fireEvent.click(panButton);
             expect(mockSetPanEnabled).toHaveBeenCalledWith(true); // Check mock hook func

             fireEvent.click(debugButton);
             // Check mocked status component for update
             expect(screen.getByTestId('mosaic-status')).toHaveTextContent(/Debug/i);

             fireEvent.click(focusButton);
             expect(mockInitializeFocus).toHaveBeenCalled(); // Check mock hook func
         });
    });

     // --- Rendering and Visuals ---
    describe('Rendering and Visuals', () => {
        test('should pass correct props to child components', async () => {
             const tileCount = 5;
             mockGenerateVoronoiRegionsToroidal.mockReturnValue(createMockTiles(tileCount).map(t=>t.allPieces));
             render(<InterlockingMosaic viewType="test-view" />);
             expect(mockImageInstance).not.toBeNull();
             mockImageInstance._triggerLoad(); // Need to trigger load to update state
             await waitFor(() => expect(screen.queryByTestId('mosaic-loader')).not.toBeInTheDocument());

             // Check mocked status component
             expect(screen.getByTestId('mosaic-status')).toHaveTextContent(`Status: test-view ${tileCount}`);
             // Check mocked controls component buttons
             expect(screen.getByRole('button', { name: /Focus: Off/i })).toBeInTheDocument();
             expect(screen.getByRole('button', { name: /Debug: Off/i })).toBeInTheDocument();
             expect(screen.getByRole('button', { name: /Pan: Off/i })).toBeInTheDocument();
        });

        test('should call drawTile for each tile', async () => {
             const tileCount = 7;
             mockGenerateVoronoiRegionsToroidal.mockReturnValue(createMockTiles(tileCount).map(t=>t.allPieces));
             render(<InterlockingMosaic />);
             expect(mockImageInstance).not.toBeNull();
             mockImageInstance._triggerLoad();
             await waitFor(() => expect(screen.queryByTestId('mosaic-loader')).not.toBeInTheDocument());

             // Check mock drawTile func
             await waitFor(() => expect(mockDrawTile).toHaveBeenCalled());
             expect(mockDrawTile.mock.calls.length).toBeGreaterThanOrEqual(tileCount);
        });

        test('should apply transform style to canvas', async () => {
             const mockTransform = { x: 50, y: -20, scale: 1.5 };
             // Update the hook mock for this test
             require('/Users/dominicgarvey/Code_Projects/mosaic-new/src/hooks/usePanAndZoom.js').mockImplementation(() => ({
                 transform: mockTransform, panEnabled: false, setPanEnabled: mockSetPanEnabled,
             }));
             render(<InterlockingMosaic />);
             expect(mockImageInstance).not.toBeNull();
             mockImageInstance._triggerLoad();
             await waitFor(() => expect(screen.queryByTestId('mosaic-loader')).not.toBeInTheDocument());
             // Check style on mocked canvas
             const canvas = screen.getByTestId('mosaic-canvas');
             // Check style uses mocked hook values (initial focusScale is 1)
             expect(canvas).toHaveStyle(`transform: translate(${mockTransform.x}px, ${mockTransform.y}px) scale(${mockTransform.scale * 1})`);
        });
    });
});