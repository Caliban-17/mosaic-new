/**
 * repositoryUtils.js
 * Utility functions for handling repository data
 */

import { generateColorFromName } from './TessellationUtils';

/**
 * Calculates repository metrics and visualization parameters
 * @param {Array} repositories - Raw repository data from API
 * @param {Object} options - Calculation options
 * @returns {Array} - Repositories with calculated parameters
 */
export const calculateRepositoryMetrics = (repositories, options = {}) => {
  if (!repositories || repositories.length === 0) return [];
  
  const {
    width = window.innerWidth,
    height = window.innerHeight,
    minArea = 500,
    maxArea = 20000
  } = options;
  
  const totalArea = width * height;
  const baseArea = totalArea / repositories.length;
  
  return repositories.map(repo => {
    // Calculate weight based on collaborators and activity
    const collaboratorFactor = Math.log(repo.collaborators + 1) * 0.5;
    const activityFactor = repo.activity ? (repo.activity / 100) * 0.5 : 0;
    const commitFactor = repo.commits ? Math.log(repo.commits + 1) * 0.3 : 0;
    const weight = Math.max(1, collaboratorFactor + activityFactor + commitFactor);
    
    // Calculate target area based on weight
    const rawTargetArea = baseArea * weight;
    
    // Clamp to min/max area
    const targetArea = Math.min(maxArea, Math.max(minArea, rawTargetArea));
    
    // Generate color if not present
    const color = repo.color || generateColorFromName(repo.name || repo.id);
    
    return {
      ...repo,
      weight,
      targetArea,
      color,
      hasChildren: Boolean(repo.childProjects?.length)
    };
  });
};

/**
 * Simulates a real-time repository data stream (for demo purposes)
 * @param {Function} callback - Function to call with updated repo data
 * @param {Array} initialRepos - Initial repository data
 * @param {Object} options - Simulation options
 * @returns {Function} - Cleanup function to stop simulation
 */
export const simulateRepositoryStream = (callback, initialRepos = [], options = {}) => {
  const {
    updateInterval = 5000,
    addInterval = 15000,
    maxRepos = 100,
    collaboratorRange = [1, 50],
    activityRange = [0, 100],
    commitRange = [0, 1000]
  } = options;
  
  // Clone initial repos to avoid mutations
  let repoData = [...initialRepos];
  
  // Generate ID for new repositories
  const generateId = () => `repo-${Math.floor(Math.random() * 100000)}`;
  
  // Generate random repository name
  const generateName = () => {
    const prefixes = ['awesome', 'super', 'cool', 'next-gen', 'advanced', 'modern'];
    const types = ['api', 'app', 'ui', 'service', 'platform', 'framework', 'tool', 'system'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const type = types[Math.floor(Math.random() * types.length)];
    return `${prefix}-${type}`;
  };
  
  // Generate random number in range
  const randomInRange = (min, max) => Math.floor(min + Math.random() * (max - min + 1));
  
  // Update existing repositories
  const updateIntervalId = setInterval(() => {
    if (repoData.length === 0) return;
    
    // Select a random repository to update
    const repoIndex = Math.floor(Math.random() * repoData.length);
    
    // Update its metrics
    repoData = repoData.map((repo, index) => {
      if (index === repoIndex) {
        // Randomly update collaborators and activity
        const collaborators = randomInRange(
          Math.max(1, repo.collaborators - 5),
          repo.collaborators + 5
        );
        
        const activity = randomInRange(
          Math.max(0, repo.activity - 10),
          Math.min(100, repo.activity + 10)
        );
        
        const commits = randomInRange(
          repo.commits,
          repo.commits + randomInRange(0, 20)
        );
        
        return {
          ...repo,
          collaborators,
          activity,
          commits
        };
      }
      return repo;
    });
    
    // Call callback with updated data
    callback(repoData);
  }, updateInterval);
  
  // Add new repositories
  const addIntervalId = setInterval(() => {
    if (repoData.length >= maxRepos) return;
    
    // Create a new repository with random metrics
    const newRepo = {
      id: generateId(),
      name: generateName(),
      collaborators: randomInRange(collaboratorRange[0], collaboratorRange[1]),
      activity: randomInRange(activityRange[0], activityRange[1]),
      commits: randomInRange(commitRange[0], commitRange[1]),
      childProjects: Math.random() > 0.7 ? [{ id: 'child-1' }, { id: 'child-2' }] : []
    };
    
    // Add to repository list
    repoData = [...repoData, newRepo];
    
    // Call callback with updated data
    callback(repoData);
  }, addInterval);
  
  // Return cleanup function
  return () => {
    clearInterval(updateIntervalId);
    clearInterval(addIntervalId);
  };
};

/**
 * Creates initial sample repository data
 * @param {number} count - Number of repositories to generate
 * @returns {Array} - Sample repository data
 */
export const generateSampleRepositories = (count = 20) => {
  const repos = [];
  
  for (let i = 0; i < count; i++) {
    const collaborators = Math.floor(Math.random() * 50) + 1;
    const activity = Math.floor(Math.random() * 100);
    const commits = Math.floor(Math.random() * 1000);
    const hasChildren = Math.random() > 0.7;
    
    repos.push({
      id: `repo-${i}`,
      name: `Repository ${i + 1}`,
      collaborators,
      activity,
      commits,
      childProjects: hasChildren ? [{ id: `child-${i}-1` }, { id: `child-${i}-2` }] : []
    });
  }
  
  return repos;
};