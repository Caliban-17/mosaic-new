/* eslint-disable no-restricted-globals */
/* eslint-env worker */
/**
 * TessellationWorker.js
 * Simplified worker: Calculates gradient descent point update based on
 * gradient received from the main thread.
 */

// --- Geometric Helpers (Minimal needed) ---
const wrapPoint = (point, width, height) => {
    if (!point || point.length !== 2) return [0, 0]; // Basic safety
    let x = point[0] % width;
    let y = point[1] % height;
    if (x < 0) x += width;
    if (y < 0) y += height;
    return [x, y];
};

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
  const { command, data } = event.data;

  switch (command) {
    case 'iterate_step': // Renamed command
      handleIterationStep(data);
      break;
    default:
      self.postMessage({
        status: 'error',
        message: `Unknown worker command: ${command}`,
        requestId: data?.requestId
      });
  }
});

/**
 * Handle single iteration step request
 * Receives points AND gradient, calculates next points.
 * @param {Object} data - Contains currentPoints, grad, params, requestId
 */
const handleIterationStep = (data) => {
  const { currentPoints, grad, params, requestId } = data;

  // Ensure required data is present
  if (!currentPoints || !grad || !Array.isArray(grad) || grad.length !== currentPoints.length || !params || !params.width || !params.height || typeof params.learningRate !== 'number') {
    self.postMessage({ status: 'error', message: 'Missing or invalid data/params for iteration step', requestId });
    return;
  }

  const { width, height, learningRate } = params;

  try {
    // 1. Update points using received gradient
    const updatedPoints = currentPoints.map((p, j) => {
        // Check individual gradient components for safety
        const gradX = (grad[j] && isFinite(grad[j][0])) ? grad[j][0] : 0;
        const gradY = (grad[j] && isFinite(grad[j][1])) ? grad[j][1] : 0;
        // Ensure p is valid before calculation
        const pointX = (p && isFinite(p[0])) ? p[0] : 0;
        const pointY = (p && isFinite(p[1])) ? p[1] : 0;
        return [pointX - learningRate * gradX, pointY - learningRate * gradY];
    });

    // 2. Wrap points
    const newPoints = updatedPoints.map(p => wrapPoint(p, width, height));

    // 3. Post back ONLY the new points
    self.postMessage({
      status: 'iterationStepComplete', // New status name
      result: {
        points: newPoints,
        // Regions are no longer calculated here
      },
      requestId
    });

  } catch (error) {
    console.error(`Worker Iteration Step (${requestId}) Error:`, error);
    self.postMessage({
      status: 'error',
      message: `Iteration step error: ${error.message}`,
      stack: error.stack, // Include stack if available
      requestId
    });
  }
};
