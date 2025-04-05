/**
 * useTessellation.js
 * React hook for managing tessellation state and operations
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { debounce } from 'lodash';
import { generateColorFromName } from './TessellationUtils';
// Removed unused import wrapPoint

// Create a worker instance
const createWorker = () => {
  return new Worker(new URL('./TessellationWorker.js', import.meta.url), { type: 'module' });
};

/**
 * Hook for managing tessellation operations
 * @param {Object} config - Configuration options
 * @returns {Object} - Tessellation state and functions
 */
const useTessellation = (config = {}) => {
  const {
    width = window.innerWidth,
    height = window.innerHeight,
    iterations = 50,
    learningRate = 0.1,
    updateDebounceTime = 500,
    autoOptimize = true
  } = config;
  
  // Main state
  const [repositories, setRepositories] = useState([]);
  const [points, setPoints] = useState([]);
  const [regions, setRegions] = useState([]);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  
  // Refs
  const workerRef = useRef(null);
  const requestIdRef = useRef(0);
  const pendingUpdatesRef = useRef(false);
  
  // Initialize worker
  useEffect(() => {
    workerRef.current = createWorker();
    
    // Set up message handler
    workerRef.current.onmessage = (event) => {
      const { status, message, result, progress: workerProgress } = event.data;
      // Removed unused destructuring of requestId
      
      switch (status) {
        case 'progress':
          setProgress(workerProgress || 0);
          break;
          
        case 'complete':
          if (result) {
            if (result.points) setPoints(result.points);
            if (result.regions) setRegions(result.regions);
          }
          setIsOptimizing(false);
          setProgress(1);
          
          // If there are pending updates, run optimization again
          if (pendingUpdatesRef.current) {
            pendingUpdatesRef.current = false;
            runOptimization();
          }
          break;
          
        case 'error':
          console.error('Tessellation worker error:', message);
          setError(message);
          setIsOptimizing(false);
          break;
      }
    };
    
    // Clean up worker on unmount
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);
  
  // Run optimization
  const runOptimization = useCallback(() => {
    if (!workerRef.current || !repositories.length) return;
    
    // If already optimizing, set flag for pending updates
    if (isOptimizing) {
      pendingUpdatesRef.current = true;
      return;
    }
    
    setIsOptimizing(true);
    setError(null);
    
    const totalArea = width * height;
    const baseArea = totalArea / repositories.length;
    
    // Calculate target areas and weights
    const targetAreas = repositories.map(repo => {
      const weight = repo.collaborators ? Math.log(repo.collaborators + 1) : 1;
      return baseArea * weight;
    });
    
    const pointWeights = repositories.map(repo => {
      return repo.collaborators ? Math.log(repo.collaborators + 1) : 1;
    });
    
    // Use existing points or generate initial random points
    const initialPoints = points.length === repositories.length
      ? [...points]
      : repositories.map(() => [
          Math.random() * width,
          Math.random() * height
        ]);
    
    // Send message to worker
    const requestId = ++requestIdRef.current;
    workerRef.current.postMessage({
      command: 'optimize',
      data: {
        initialPoints,
        width,
        height,
        iterations,
        learningRate,
        targetAreas,
        pointWeights,
        lambdaArea: 1.0,
        lambdaCentroid: 0.1,
        lambdaAngle: 0.01,
        requestId
      }
    });
  }, [repositories, points, width, height, iterations, learningRate, isOptimizing]);
  
  // Debounced optimization
  const debouncedOptimization = useCallback(
    debounce(() => {
      if (autoOptimize) runOptimization();
    }, updateDebounceTime),
    [runOptimization, autoOptimize, updateDebounceTime]
  );
  
  // Update repositories and trigger optimization
  const updateRepositories = useCallback((newRepositories) => {
    setRepositories(newRepositories);
    debouncedOptimization();
  }, [debouncedOptimization]);
  
  // Add a new repository
  const addRepository = useCallback((repo) => {
    // Generate a color if not provided
    const repoWithColor = {
      ...repo,
      color: repo.color || generateColorFromName(repo.name || repo.id)
    };
    
    setRepositories(prevRepos => [...prevRepos, repoWithColor]);
    debouncedOptimization();
  }, [debouncedOptimization]);
  
  // Remove a repository
  const removeRepository = useCallback((repoId) => {
    setRepositories(prevRepos => prevRepos.filter(repo => repo.id !== repoId));
    debouncedOptimization();
  }, [debouncedOptimization]);
  
  // Update a repository's properties
  const updateRepository = useCallback((repoId, updates) => {
    setRepositories(prevRepos => 
      prevRepos.map(repo => 
        repo.id === repoId ? { ...repo, ...updates } : repo
      )
    );
    debouncedOptimization();
  }, [debouncedOptimization]);
  
  // Force immediate optimization
  const forceOptimization = useCallback(() => {
    runOptimization();
  }, [runOptimization]);
  
  // Initialize points for new repositories
  useEffect(() => {
    if (repositories.length > points.length) {
      const newPoints = [...points];
      
      // Add new random points for the additional repositories
      for (let i = points.length; i < repositories.length; i++) {
        newPoints.push([
          Math.random() * width,
          Math.random() * height
        ]);
      }
      
      setPoints(newPoints);
    }
    
    if (repositories.length !== points.length) {
      debouncedOptimization();
    }
  }, [repositories.length, points.length, width, height, debouncedOptimization]);
  
  // Return state and functions
  return {
    repositories,
    points,
    regions,
    isOptimizing,
    progress,
    error,
    updateRepositories,
    addRepository,
    removeRepository,
    updateRepository,
    forceOptimization
  };
};

export default useTessellation;