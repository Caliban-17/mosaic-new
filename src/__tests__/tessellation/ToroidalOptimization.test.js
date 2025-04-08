// src/__tests__/tessellation/ToroidalOptimization.test.js
import {
    toroidalDistanceSq,
    toroidalDistance,
    wrapPoint,
    generateVoronoiRegionsToroidal,
    calculateEnergy2D
  } from '../../utils/TessellationUtils';
  
  // Tell Jest to use the real implementations instead of mocks
    jest.unmock('d3-delaunay');  // This unmocks instead of trying to provide implementation
    jest.unmock('polygon-clipping');  // This unmocks instead of trying to provide implementation
  
  describe('Tessellation Toroidal Wrapping & Center Size Optimization', () => {
    const WIDTH = 10.0;
    const HEIGHT = 8.0;
    const CENTER = [WIDTH / 2, HEIGHT / 2];
    
    // Test toroidal wrapping functions
    describe('toroidalDistance functions', () => {
      test('should calculate correct toroidal distances', () => {
        // Points on same side
        expect(toroidalDistance([1, 1], [4, 5], WIDTH, HEIGHT)).toBe(5);
        
        // Points where wrap-around is shorter
        expect(toroidalDistance([1, 1], [9, 1], WIDTH, HEIGHT)).toBe(2); // Wraps horizontally
        expect(toroidalDistance([1, 1], [1, 7], WIDTH, HEIGHT)).toBe(2); // Wraps vertically
        
        // Points on diagonal with wrap
        expect(toroidalDistance([9, 7], [1, 1], WIDTH, HEIGHT)).toBe(Math.sqrt(8)); // Wraps both ways
      });
      
      test('should correctly calculate squared distances', () => {
        // Edge case: points exactly at opposite boundaries
        expect(toroidalDistanceSq([0, 0], [0, HEIGHT], WIDTH, HEIGHT)).toBe(0);
        expect(toroidalDistanceSq([0, 0], [WIDTH, 0], WIDTH, HEIGHT)).toBe(0);
        
        // Point in middle and corner
        expect(toroidalDistanceSq(CENTER, [0, 0], WIDTH, HEIGHT)).toBe(
          Math.min(Math.pow(WIDTH/2, 2) + Math.pow(HEIGHT/2, 2), 
                   Math.pow(WIDTH/2, 2) + Math.pow(HEIGHT/2, 2))
        );
      });
    });
    
    describe('wrapPoint function', () => {
      test('should wrap points correctly for drag operations', () => {
        // Points inside domain stay the same
        expect(wrapPoint([5, 4], WIDTH, HEIGHT)).toEqual([5, 4]);
        
        // Points outside wrap correctly
        expect(wrapPoint([WIDTH + 2, 4], WIDTH, HEIGHT)).toEqual([2, 4]);
        expect(wrapPoint([5, HEIGHT + 3], WIDTH, HEIGHT)).toEqual([5, 3]);
        expect(wrapPoint([WIDTH + 2, HEIGHT + 3], WIDTH, HEIGHT)).toEqual([2, 3]);
        
        // Negative coordinates wrap properly too
        expect(wrapPoint([-2, -3], WIDTH, HEIGHT)).toEqual([8, 5]);
        
        // Multiple wraps
        expect(wrapPoint([WIDTH*3 + 2, HEIGHT*2 + 3], WIDTH, HEIGHT)).toEqual([2, 3]);
      });
      
      test('should handle wrap with any float values', () => {
        expect(wrapPoint([10.5, 8.5], WIDTH, HEIGHT)).toEqual([0.5, 0.5]);
        expect(wrapPoint([-0.5, -0.25], WIDTH, HEIGHT)).toEqual([9.5, 7.75]);
      });
    });
    
    // Test area targeting - larger tiles in center, smaller at edges
    describe('center size optimization', () => {
      test('should apply proper area gradient with target function', () => {
        const points = [
          [CENTER[0], CENTER[1]], // Center point
          [1, 1],                // Corner point
          [WIDTH-1, HEIGHT-1]    // Opposite corner
        ];
        
        // Create target function (larger areas in center)
        const targetTotalArea = WIDTH * HEIGHT;
        const baseArea = targetTotalArea / points.length;
        const maxDist = Math.sqrt(Math.pow(WIDTH/2, 2) + Math.pow(HEIGHT/2, 2));
        const factor = 1.2;
        
        // Larger towards center function
        const targetAreaFunc = (p) => {
          const dist = toroidalDistance(p, CENTER, WIDTH, HEIGHT);
          const normalizedDist = maxDist > 0 ? dist / maxDist : 0;
          return baseArea * (1 + factor * (1 - normalizedDist));
        };
        
        // Target values calculation
        const centerTarget = targetAreaFunc(points[0]);
        const cornerTarget = targetAreaFunc(points[1]);
        
        // Verify center target is larger than corner target
        expect(centerTarget).toBeGreaterThan(cornerTarget);
        
        // Calculate energy with this target function
        const mockRegions = [
          [[[CENTER[0]-1, CENTER[1]-1], [CENTER[0]+1, CENTER[1]-1], [CENTER[0]+1, CENTER[1]+1], [CENTER[0]-1, CENTER[1]+1]]],
          [[[0, 0], [2, 0], [2, 2], [0, 2]]],
          [[[WIDTH-2, HEIGHT-2], [WIDTH, HEIGHT-2], [WIDTH, HEIGHT], [WIDTH-2, HEIGHT]]]
        ];
        
        const params = {
          width: WIDTH,
          height: HEIGHT,
          lambdaArea: 1.0,
          targetAreaFunc
        };
        
        const { totalEnergy, components } = calculateEnergy2D(mockRegions, points, params);
        
        // Energy should be finite
        expect(isFinite(totalEnergy)).toBe(true);
        
        // Area component should exist
        expect(components).toHaveProperty('area');
        expect(components.area).toBeGreaterThanOrEqual(0);
      });
      
      test('should calculate correct target areas for different positions', () => {
        // Create model target function like in main algorithm
        const targetTotalArea = WIDTH * HEIGHT;
        const numPoints = 50;
        const baseArea = targetTotalArea / numPoints;
        const maxDist = Math.sqrt(Math.pow(WIDTH/2, 2) + Math.pow(HEIGHT/2, 2));
        const factor = 1.2;
        
        // Target function: larger towards center
        const targetAreaFunc = (p) => {
          const dist = toroidalDistance(p, CENTER, WIDTH, HEIGHT);
          const normalizedDist = maxDist > 0 ? dist / maxDist : 0;
          return baseArea * (1 + factor * (1 - normalizedDist));
        };
        
        // Verify center point gets largest area
        const centerArea = targetAreaFunc(CENTER);
        
        // Check various points at different distances
        const testPoints = [
          { point: CENTER, expectedFactor: (1 + factor) }, // Center should have max factor
          { point: [0, 0], expectedFactor: (1) },          // Corner should have min factor
          { point: [CENTER[0], 0], expectedFactor: null }  // Midpoint on edge - we'll compute expected 
        ];
        
        // For the midpoint, calculate expected factor
        const midEdgeDist = toroidalDistance(testPoints[2].point, CENTER, WIDTH, HEIGHT);
        const midEdgeNormDist = midEdgeDist / maxDist;
        testPoints[2].expectedFactor = (1 + factor * (1 - midEdgeNormDist));
        
        // Test all points
        testPoints.forEach(({ point, expectedFactor }) => {
          const area = targetAreaFunc(point);
          const actualFactor = area / baseArea;
          expect(actualFactor).toBeCloseTo(expectedFactor, 5);
        });
      });
    });
    
    // Test how voronoi regions interface with toroidal boundaries
    describe('voronoi region wrapping', () => {
      // We'll use a larger number of points to get a more realistic tessellation
      test('should generate wrapped regions at boundaries', () => {
        const points = [
          [1, 1],          // Near top-left
          [WIDTH-1, 1],    // Near top-right
          [1, HEIGHT-1],   // Near bottom-left
          [WIDTH-1, HEIGHT-1], // Near bottom-right
          [WIDTH/2, HEIGHT/2]  // Center point
        ];
        
        const regions = generateVoronoiRegionsToroidal(points, WIDTH, HEIGHT);
        
        // Regions should be generated
        expect(regions).toBeTruthy();
        expect(regions.length).toBe(points.length);
        
        // Each point should have at least one region piece
        regions.forEach(pointRegions => {
          expect(pointRegions.length).toBeGreaterThan(0);
        });
      });
      
      test('should handle points near boundaries', () => {
        const epsilon = 0.001; // Small offset from exact boundary
        const points = [
          [0 + epsilon, 0 + epsilon],           // Near top-left corner
          [WIDTH - epsilon, 0 + epsilon],       // Near top-right corner
          [0 + epsilon, HEIGHT - epsilon],      // Near bottom-left corner
          [WIDTH - epsilon, HEIGHT - epsilon],  // Near bottom-right corner
          [WIDTH/2, HEIGHT/2]                   // Center point
        ];
        
        const regions = generateVoronoiRegionsToroidal(points, WIDTH, HEIGHT);
        
        // Regions should be generated despite having points near boundaries
        expect(regions).toBeTruthy();
        expect(regions.length).toBe(points.length);
      });
    });
  });