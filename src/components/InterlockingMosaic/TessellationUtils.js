/**
 * TessellationUtils.js
 * A JavaScript port of the Python tessellation algorithm.
 */

/**
 * Calculates the shortest distance squared between two points on a 2D torus.
 * @param {Array} p1 - First point [x, y]
 * @param {Array} p2 - Second point [x, y]
 * @param {number} width - Width of the torus domain
 * @param {number} height - Height of the torus domain
 * @returns {number} - Squared toroidal distance
 */
export const toroidalDistanceSq = (p1, p2, width, height) => {
    const dx = p1[0] - p2[0];
    const dy = p1[1] - p2[1];
  
    // Account for wrap-around
    const deltaX = Math.min(Math.abs(dx), width - Math.abs(dx));
    const deltaY = Math.min(Math.abs(dy), height - Math.abs(dy));
  
    return deltaX * deltaX + deltaY * deltaY;
  };
  
  /**
   * Calculates the shortest distance between two points on a 2D torus.
   * @param {Array} p1 - First point [x, y]
   * @param {Array} p2 - Second point [x, y]
   * @param {number} width - Width of the torus domain
   * @param {number} height - Height of the torus domain
   * @returns {number} - Toroidal distance
   */
  export const toroidalDistance = (p1, p2, width, height) => {
    return Math.sqrt(toroidalDistanceSq(p1, p2, width, height));
  };
  
  /**
   * Calculates the area of a 2D polygon using the Shoelace formula.
   * @param {Array} vertices - Array of [x, y] coordinates
   * @returns {number} - Area of the polygon (always positive)
   */
  export const polygonArea = (vertices) => {
    if (!vertices || vertices.length < 3) return 0;
  
    let area = 0;
    for (let i = 0; i < vertices.length; i++) {
      const j = (i + 1) % vertices.length;
      area += vertices[i][0] * vertices[j][1];
      area -= vertices[j][0] * vertices[i][1];
    }
  
    return Math.abs(area) / 2;
  };
  
  /**
   * Calculates the centroid of a 2D polygon.
   * @param {Array} vertices - Array of [x, y] coordinates
   * @returns {Array} - Centroid coordinates [x, y], or null if invalid
   */
  export const polygonCentroid = (vertices) => {
    if (!vertices || vertices.length < 3) return null;
  
    let signedArea = 0;
    let cx = 0;
    let cy = 0;
    const n = vertices.length;
  
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const crossTerm = vertices[i][0] * vertices[j][1] - vertices[j][0] * vertices[i][1];
      signedArea += crossTerm;
      cx += (vertices[i][0] + vertices[j][0]) * crossTerm;
      cy += (vertices[i][1] + vertices[j][1]) * crossTerm;
    }
  
    // Avoid division by zero
    if (Math.abs(signedArea) < 1e-12) {
      // Fallback: return geometric mean
      return vertices.reduce(
        (acc, v) => [acc[0] + v[0] / n, acc[1] + v[1] / n],
        [0, 0]
      );
    }
  
    signedArea *= 0.5;
    cx /= 6 * signedArea;
    cy /= 6 * signedArea;
  
    return [cx, cy];
  };
  
  /**
   * Wraps a point's coordinates to stay within [0, width) x [0, height)
   * @param {Array} point - Point [x, y]
   * @param {number} width - Width of the domain
   * @param {number} height - Height of the domain
   * @returns {Array} - Wrapped point
   */
  export const wrapPoint = (point, width, height) => {
    let x = point[0] % width;
    let y = point[1] % height;
    
    // Handle negative values
    if (x < 0) x += width;
    if (y < 0) y += height;
    
    return [x, y];
  };
  
  /**
   * Generates 8 'ghost' copies of each point, shifted for the toroidal topology.
   * @param {Array} points - Array of [x, y] points
   * @param {number} width - Width of the domain
   * @param {number} height - Height of the domain
   * @returns {Object} - Object with all points and original indices
   */
  export const generateGhostPoints = (points, width, height) => {
    const allPoints = [];
    const originalIndices = [];
    
    points.forEach((p, i) => {
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          allPoints.push([
            p[0] + dx * width,
            p[1] + dy * height
          ]);
          originalIndices.push(i);
        }
      }
    });
    
    return { allPoints, originalIndices };
  };
  
  /**
   * Clips a polygon to the rectangular boundary [0, W] x [0, H].
   * Uses Sutherland-Hodgman algorithm.
   * @param {Array} vertices - Array of [x, y] vertices
   * @param {number} width - Width of the boundary
   * @param {number} height - Height of the boundary
   * @returns {Array} - Array of clipped polygon pieces
   */
  export const clipPolygonToBoundary = (vertices, width, height) => {
    if (!vertices || vertices.length < 3) return [];
  
    // Implementation of Sutherland-Hodgman polygon clipping algorithm
    const clipEdge = (subjectPolygon, clipEdge) => {
      const outputList = [];
      const [clipStart, clipEnd] = clipEdge;
      
      // Helper function to determine if a point is inside a clip edge
      const inside = (p) => {
        return (clipEnd[0] - clipStart[0]) * (p[1] - clipStart[1]) - 
               (clipEnd[1] - clipStart[1]) * (p[0] - clipStart[0]) >= 0;
      };
      
      // Helper to find intersection of line segments
      const computeIntersection = (s, e) => {
        const dc = [clipStart[0] - clipEnd[0], clipStart[1] - clipEnd[1]];
        const dp = [s[0] - e[0], s[1] - e[1]];
        const n1 = clipStart[0] * clipEnd[1] - clipStart[1] * clipEnd[0];
        const n2 = s[0] * e[1] - s[1] * e[0];
        const n3 = 1.0 / (dc[0] * dp[1] - dc[1] * dp[0]);
        return [(n1 * dp[0] - n2 * dc[0]) * n3, (n1 * dp[1] - n2 * dc[1]) * n3];
      };
      
      let s = subjectPolygon[subjectPolygon.length - 1];
      
      for (let i = 0; i < subjectPolygon.length; i++) {
        const e = subjectPolygon[i];
        
        if (inside(e)) {
          if (!inside(s)) {
            outputList.push(computeIntersection(s, e));
          }
          outputList.push(e);
        } else if (inside(s)) {
          outputList.push(computeIntersection(s, e));
        }
        
        s = e;
      }
      
      return outputList;
    };
    
    // Define clipping boundaries
    const boundaries = [
      [[0, 0], [width, 0]],   // Bottom edge
      [[width, 0], [width, height]],  // Right edge
      [[width, height], [0, height]], // Top edge
      [[0, height], [0, 0]]   // Left edge
    ];
    
    let clippedPolygon = vertices;
    
    // Clip against each boundary
    for (const boundary of boundaries) {
      clippedPolygon = clipEdge(clippedPolygon, boundary);
      if (clippedPolygon.length === 0) {
        break;
      }
    }
    
    // Return empty result if polygon is completely outside
    if (clippedPolygon.length < 3) return [];
    
    // Check if the polygon area is significant
    if (polygonArea(clippedPolygon) < 1e-12) return [];
    
    return [clippedPolygon];
  };
  
  /**
   * Uses d3-delaunay to generate Voronoi regions for points on a 2D torus.
   * @param {Array} points - Array of [x, y] points
   * @param {number} width - Width of the torus domain
   * @param {number} height - Height of the torus domain
   * @returns {Array} - Array of region vertices for each point
   */
  export const generateVoronoiRegionsToroidal = (points, width, height) => {
    // This is where we'll use d3-delaunay to generate the diagram
    // For now, this is a placeholder - the actual implementation will use d3-delaunay
    try {
      if (!points || points.length < 4) return null;
      if (width <= 0 || height <= 0) return null;
      
      // In a real implementation, this would use d3-delaunay
      // For now, return a dummy implementation
      return points.map(() => [
        [[0, 0], [width/4, 0], [width/4, height/4], [0, height/4]]
      ]);
    } catch (error) {
      console.error("Error generating Voronoi regions:", error);
      return null;
    }
  };
  
  /**
   * Calculates the total energy of the 2D toroidal tessellation.
   * @param {Array} regionsData - Array of region vertex arrays
   * @param {Array} points - Array of generator points
   * @param {Object} params - Object containing energy calculation parameters
   * @returns {Object} - Total energy and energy components
   */
  export const calculateEnergy2D = (regionsData, points, params) => {
    const { 
      width, height, 
      lambdaArea = 1.0, 
      lambdaCentroid = 0.1, 
      lambdaAngle = 0.01,
      targetAreaFunc = null,
      pointWeights = null,
      lambdaMinArea = 0.0,
      minAreaThreshold = 0.0
    } = params;
    
    let totalEnergy = 0;
    const energyComponents = {
      area: 0,
      centroid: 0,
      angle: 0,
      minArea: 0
    };
    
    // Count of valid regions
    // Let's remove this unused variable
    const numGenerators = points.length;
    const targetTotalArea = width * height;
    
    // Weights preprocessing
    let useWeights = false;
    let sumWeights = 0;
    
    if (!targetAreaFunc && pointWeights) {
      if (pointWeights.length === numGenerators && pointWeights.every(w => w > 0)) {
        sumWeights = pointWeights.reduce((a, b) => a + b, 0);
        if (sumWeights > 1e-9) useWeights = true;
      }
    }
    
    if (!regionsData || regionsData.length !== points.length) {
      return { totalEnergy: Infinity, components: energyComponents };
    }
    
    const calculatedAreas = [];
    
    regionsData.forEach((regionPieces, i) => {
      // Calculate area
      const currentTotalArea = regionPieces.reduce((total, piece) => 
        total + polygonArea(piece), 0);
      
      calculatedAreas.push(currentTotalArea);
      
      if (!regionPieces.length || currentTotalArea < 1e-12) return;
      
      const generatorPoint = points[i];
      // No need to increment any counter here
      
      // Area Term
      let targetArea = 1e-9;
      if (targetAreaFunc) {
        targetArea = targetAreaFunc(generatorPoint);
      } else if (useWeights) {
        targetArea = targetTotalArea * pointWeights[i] / sumWeights;
      } else if (numGenerators > 0) {
        targetArea = targetTotalArea / numGenerators;
      }
      
      if (targetArea <= 0) targetArea = 1e-9;
      const areaDiffSq = Math.pow(currentTotalArea - targetArea, 2);
      energyComponents.area += lambdaArea * areaDiffSq;
      
      // Centroid Term
      let overallCentroidX = 0;
      let overallCentroidY = 0;
      let totalWeight = 0;
      
      regionPieces.forEach(piece => {
        const pieceArea = polygonArea(piece);
        const pieceCentroid = polygonCentroid(piece);
        
        if (pieceArea > 1e-12 && pieceCentroid) {
          overallCentroidX += pieceCentroid[0] * pieceArea;
          overallCentroidY += pieceCentroid[1] * pieceArea;
          totalWeight += pieceArea;
        }
      });
      
      if (totalWeight > 1e-12) {
        const regionCentroid = [
          overallCentroidX / totalWeight,
          overallCentroidY / totalWeight
        ];
        
        const centroidDistSq = toroidalDistanceSq(
          generatorPoint, regionCentroid, width, height
        );
        
        energyComponents.centroid += lambdaCentroid * centroidDistSq;
      }
      
      // Angle Term
      let anglePenalty = 0;
      const smallAngleThresholdRad = Math.PI / 9; // 20 degrees
      
      regionPieces.forEach(verts => {
        const nVerts = verts.length;
        if (nVerts < 3) return;
        
        for (let j = 0; j < nVerts; j++) {
          const pPrev = verts[(j - 1 + nVerts) % nVerts];
          const pCurr = verts[j];
          const pNext = verts[(j + 1) % nVerts];
          
          const v1 = [pPrev[0] - pCurr[0], pPrev[1] - pCurr[1]];
          const v2 = [pNext[0] - pCurr[0], pNext[1] - pCurr[1]];
          
          const norm1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]);
          const norm2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1]);
          
          if (norm1 > 1e-12 && norm2 > 1e-12) {
            const dotProduct = v1[0] * v2[0] + v1[1] * v2[1];
            const cosTheta = Math.min(Math.max(dotProduct / (norm1 * norm2), -1.0), 1.0);
            const angle = Math.acos(cosTheta);
            
            if (0 < angle && angle < smallAngleThresholdRad) {
              anglePenalty += Math.pow(smallAngleThresholdRad - angle, 2);
            }
          }
        }
      });
      
      energyComponents.angle += lambdaAngle * anglePenalty;
    });
    
    // Minimum Area Penalty Term
    if (lambdaMinArea > 0 && minAreaThreshold > 0) {
      calculatedAreas.forEach(area => {
        if (0 < area && area < minAreaThreshold) {
          const penalty = Math.pow(minAreaThreshold - area, 2);
          energyComponents.minArea += lambdaMinArea * penalty;
        }
      });
    }
    
    totalEnergy = Object.values(energyComponents).reduce((a, b) => a + b, 0);
    
    return { totalEnergy, components: energyComponents };
  };
  
  /**
   * Calculates the gradient of the 2D energy function using finite differences.
   * @param {Array} points - Array of generator points
   * @param {Object} params - Parameters for gradient calculation
   * @param {number} delta - Delta for finite difference approximation
   * @returns {Array} - Gradient vector for each point
   */
  export const calculateGradient2D = (points, params, delta = 1e-6) => {
    const { 
      width, 
      height
    } = params;
    
    const gradient = Array(points.length).fill().map(() => [0, 0]);
    const pointsForGrad = points.map(p => [...p]);
    
    // Calculate base energy
    const regionsBase = generateVoronoiRegionsToroidal(pointsForGrad, width, height);
    if (!regionsBase) return gradient;
    
    const { totalEnergy: energyBase } = calculateEnergy2D(regionsBase, pointsForGrad, params);
    if (!isFinite(energyBase)) return gradient;
    
    // Calculate gradient using finite differences
    for (let i = 0; i < points.length; i++) {
      for (let j = 0; j < 2; j++) {
        const pointsPerturbed = pointsForGrad.map(p => [...p]);
        pointsPerturbed[i][j] += delta;
        
        const regionsPerturbed = generateVoronoiRegionsToroidal(pointsPerturbed, width, height);
        if (!regionsPerturbed) {
          gradient[i][j] = 0;
          continue;
        }
        
        const { totalEnergy: energyPerturbed } = calculateEnergy2D(
          regionsPerturbed, pointsPerturbed, params
        );
        
        if (!isFinite(energyPerturbed)) {
          gradient[i][j] = 0;
          continue;
        }
        
        gradient[i][j] = (energyPerturbed - energyBase) / delta;
      }
    }
    
    return gradient;
  };
  
  /**
   * Optimizes 2D toroidal tessellation using gradient descent.
   * @param {Array} initialPoints - Initial generator points
   * @param {Object} params - Optimization parameters
   * @param {Function} progressCallback - Callback for optimization progress
   * @returns {Object} - Optimized results
   */
  export const optimizeTessellation2D = (initialPoints, params, progressCallback = null) => {
    const { 
      width, 
      height, 
      iterations = 50, 
      learningRate = 0.1,
      verbose = false
    } = params;
    
    // Copy and wrap initial points
    const points = initialPoints.map(p => {
      const x = ((p[0] % width) + width) % width;
      const y = ((p[1] % height) + height) % height;
      return [x, y];
    });
    
    // Validate weights, but we don't use this value so just skip this step
    // We'll pass params directly to calculateEnergy2D instead
    
    const history = [];
    let lastSuccessfulRegions = null;
    let pointsBeforeFail = points.map(p => [...p]);
    
    for (let i = 0; i < iterations; i++) {
      const regionsCurrent = generateVoronoiRegionsToroidal(points, width, height);
      if (!regionsCurrent) {
        if (verbose) console.log(`Iter ${i+1}/${iterations}: Failed Voronoi gen. Stopping.`);
        return { 
          regions: lastSuccessfulRegions, 
          points: pointsBeforeFail, 
          history 
        };
      }
      
      lastSuccessfulRegions = regionsCurrent;
      pointsBeforeFail = points.map(p => [...p]);
      
      // Calculate energy
      const { totalEnergy: currentEnergy, components } = calculateEnergy2D(
        regionsCurrent, points, params
      );
      
      history.push(currentEnergy);
      
      if (progressCallback) {
        progressCallback({
          iteration: i,
          totalIterations: iterations,
          energy: currentEnergy,
          components
        });
      }
      
      if (!isFinite(currentEnergy)) {
        if (verbose) console.log(`Iter ${i+1}/${iterations}: Energy non-finite. Stopping.`);
        return { 
          regions: lastSuccessfulRegions, 
          points: pointsBeforeFail, 
          history 
        };
      }
      
      // Calculate gradient
      const grad = calculateGradient2D(
        points, 
        params,
        1e-6
      );
      
      // Calculate gradient norm
      let gradNorm = 0;
      for (const g of grad) {
        gradNorm += g[0] * g[0] + g[1] * g[1];
      }
      gradNorm = Math.sqrt(gradNorm);
      
      if (!isFinite(gradNorm)) {
        if (verbose) console.log(`Iter ${i+1}/${iterations}: Gradient non-finite. Stopping.`);
        return { 
          regions: lastSuccessfulRegions, 
          points: pointsBeforeFail, 
          history 
        };
      }
      
      if (gradNorm < 1e-9) {
        if (verbose) console.log(`Iter ${i+1}/${iterations}: Gradient norm near zero (${gradNorm.toExponential(2)}). Converged/Stuck.`);
        break;
      }
      
      // Update points using gradient descent
      for (let j = 0; j < points.length; j++) {
        points[j][0] -= learningRate * grad[j][0];
        points[j][1] -= learningRate * grad[j][1];
        
        // Wrap coordinates to stay in domain
        points[j][0] = ((points[j][0] % width) + width) % width;
        points[j][1] = ((points[j][1] % height) + height) % height;
      }
    }
    
    const finalRegions = generateVoronoiRegionsToroidal(points, width, height);
    
    return { 
      regions: finalRegions || lastSuccessfulRegions, 
      points, 
      history 
    };
  };
  
  /**
   * Utility to generate repository tile parameters based on metrics
   * @param {Object} repo - Repository object with metadata
   * @param {number} baseArea - Base area for a tile
   * @returns {Object} - Parameters for the repository tile
   */
  export const calculateRepoTileParams = (repo, baseArea) => {
    // Calculate weight based on collaborators and activity
    const collaboratorFactor = Math.log(repo.collaborators + 1) * 0.5;
    const activityFactor = (repo.commits / 100) * 0.5;
    const weight = collaboratorFactor + activityFactor;
    
    // Return parameters object
    return {
      id: repo.id,
      name: repo.name,
      weight,
      targetArea: baseArea * weight,
      color: repo.color || generateColorFromName(repo.name)
    };
  };
  
  /**
   * Generate a deterministic color from a string (like a repo name)
   * @param {string} name - Name to generate color from
   * @returns {string} - Hex color
   */
  export const generateColorFromName = (name) => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Generate RGB components - ensuring they're not too dark
    const r = Math.min(255, 60 + Math.abs(hash & 0xFF));
    const g = Math.min(255, 60 + Math.abs((hash >> 8) & 0xFF));
    const b = Math.min(255, 60 + Math.abs((hash >> 16) & 0xFF));
    
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  };