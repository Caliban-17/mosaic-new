/**
 * TessellationWorker.js
 * Web worker for handling tessellation optimization in a separate thread.
 */

// Import necessary functions from the utilities
import {
    generateVoronoiRegionsToroidal,
    optimizeTessellation2D
    // Removed unused import wrapPoint
  } from './TessellationUtils';
  
  // Listen for messages from the main thread
  self.addEventListener('message', (event) => {
    const { command, data } = event.data;
    
    switch (command) {
      case 'optimize':
        handleOptimization(data);
        break;
      case 'generate':
        handleGeneration(data);
        break;
      default:
        self.postMessage({
          status: 'error',
          message: `Unknown command: ${command}`
        });
    }
  });
  
  /**
   * Handle tessellation optimization request
   * @param {Object} data - Optimization parameters and data
   */
  const handleOptimization = (data) => {
    const {
      initialPoints,
      width,
      height,
      iterations = 50,
      learningRate = 0.1,
      lambdaArea = 1.0,
      lambdaCentroid = 0.1,
      lambdaAngle = 0.01,
      targetAreas = null,
      pointWeights = null,
      lambdaMinArea = 0.0,
      minAreaThreshold = 0.0,
      requestId
    } = data;
    
    try {
      self.postMessage({
        status: 'progress',
        message: 'Starting optimization...',
        progress: 0,
        requestId
      });
  
      // Create target area function if targetAreas is provided
      let targetAreaFunc = null;
      if (Array.isArray(targetAreas) && targetAreas.length === initialPoints.length) {
        targetAreaFunc = (point) => {
          // Find the closest point in initial points
          let minDistSq = Infinity;
          let closestIndex = 0;
          
          for (let i = 0; i < initialPoints.length; i++) {
            const dx = point[0] - initialPoints[i][0];
            const dy = point[1] - initialPoints[i][1];
            const distSq = dx * dx + dy * dy;
            
            if (distSq < minDistSq) {
              minDistSq = distSq;
              closestIndex = i;
            }
          }
          
          return targetAreas[closestIndex];
        };
      }
  
      // Run optimization with progress reporting
      const result = optimizeTessellation2D(
        initialPoints,
        {
          width,
          height,
          iterations,
          learningRate,
          lambdaArea,
          lambdaCentroid,
          lambdaAngle,
          targetAreaFunc,
          pointWeights,
          lambdaMinArea,
          minAreaThreshold
        },
        (progress) => {
          // Report progress back to main thread
          if (progress.iteration % Math.max(1, Math.floor(iterations / 10)) === 0) {
            self.postMessage({
              status: 'progress',
              message: `Optimization progress: ${progress.iteration + 1}/${iterations}`,
              progress: (progress.iteration + 1) / iterations,
              energy: progress.energy,
              components: progress.components,
              requestId
            });
          }
        }
      );
  
      // Send the final result back to the main thread
      self.postMessage({
        status: 'complete',
        message: 'Optimization complete',
        result: {
          points: result.points,
          regions: result.regions,
          history: result.history
        },
        requestId
      });
    } catch (error) {
      self.postMessage({
        status: 'error',
        message: `Optimization error: ${error.message}`,
        stack: error.stack,
        requestId
      });
    }
  };
  
  /**
   * Handle simple Voronoi generation request
   * @param {Object} data - Generation parameters and data
   */
  const handleGeneration = (data) => {
    const {
      points,
      width,
      height,
      requestId
    } = data;
    
    try {
      self.postMessage({
        status: 'progress',
        message: 'Generating Voronoi regions...',
        requestId
      });
      
      // Generate the Voronoi regions
      const regions = generateVoronoiRegionsToroidal(points, width, height);
      
      if (!regions) {
        throw new Error('Failed to generate Voronoi regions');
      }
      
      // Send the result back to the main thread
      self.postMessage({
        status: 'complete',
        message: 'Generation complete',
        result: {
          regions
        },
        requestId
      });
    } catch (error) {
      self.postMessage({
        status: 'error',
        message: `Generation error: ${error.message}`,
        stack: error.stack,
        requestId
      });
    }
  };