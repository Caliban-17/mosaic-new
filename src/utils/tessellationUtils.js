/**
 * TessellationUtils.js
 * Contains utilities for tessellation, including Voronoi generation,
 * optimization steps (gradient calc), and drawing color-filled tiles.
 */
import { Delaunay } from 'd3-delaunay';
// console.log('Delaunay import:', Delaunay); // Keep commented unless debugging Delaunay itself
import polygonClipping from 'polygon-clipping';

// --- Geometric Utilities ---

/**
 * Calculates the squared toroidal distance between two points.
 * Handles wrapping around the domain defined by width and height.
 * Returns Infinity for invalid inputs.
 */
export const toroidalDistanceSq = (p1, p2, width, height) => {
  // Input validation
  if (!Array.isArray(p1) || p1.length !== 2 || typeof p1[0] !== 'number' || typeof p1[1] !== 'number' ||
      !Array.isArray(p2) || p2.length !== 2 || typeof p2[0] !== 'number' || typeof p2[1] !== 'number') {
    return Infinity;
  }
  const dx = p1[0] - p2[0];
  const dy = p1[1] - p2[1];
  // Wrap differences correctly for torus
  const deltaX = Math.min(Math.abs(dx), width - Math.abs(dx));
  const deltaY = Math.min(Math.abs(dy), height - Math.abs(dy));
  return deltaX * deltaX + deltaY * deltaY;
};

/**
 * Calculates the toroidal distance between two points.
 */
export const toroidalDistance = (p1, p2, width, height) => {
  return Math.sqrt(toroidalDistanceSq(p1, p2, width, height));
};

/**
 * Calculates the area of a polygon using the Shoelace formula.
 * Returns 0 for invalid inputs or polygons with fewer than 3 vertices.
 */
export const polygonArea = (vertices) => {
  if (!vertices || !Array.isArray(vertices) || vertices.length < 3) return 0;
  let area = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    // Ensure vertices are valid points during calculation
    if (!vertices[i] || !vertices[j] || vertices[i].length !== 2 || vertices[j].length !== 2) {
        console.warn("Invalid vertex detected during polygonArea calculation.");
        return 0; // Return 0 if invalid vertex found
    }
    area += vertices[i][0] * vertices[j][1];
    area -= vertices[j][0] * vertices[i][1];
  }
  return Math.abs(area) / 2;
};

/**
 * Calculates the centroid (center of mass) of a polygon.
 * Handles n=2 (line segment) by returning the midpoint.
 * Handles degenerate (zero-area) polygons by returning the mean of vertices.
 * Returns null for invalid inputs or polygons with 0 or 1 vertex.
 */
export const polygonCentroid = (vertices) => {
  if (!vertices || !Array.isArray(vertices)) return null;
  const n = vertices.length;

  if (n === 0) return null; // No centroid for empty array
  if (n === 1) return null; // Cannot find centroid of 1 point (or return the point itself?) Test expects null.

  if (n === 2) {
    // Handle line segment: return midpoint
    if (!vertices[0] || !vertices[1] || vertices[0].length !== 2 || vertices[1].length !== 2) return null;
    return [(vertices[0][0] + vertices[1][0]) / 2, (vertices[0][1] + vertices[1][1]) / 2];
  }

  // Standard centroid calculation for n >= 3
  let signedArea = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (!vertices[i] || !vertices[j] || vertices[i].length !== 2 || vertices[j].length !== 2) {
        console.warn("Invalid vertex encountered during polygonCentroid calculation.");
        return null;
    }
    const crossTerm = vertices[i][0] * vertices[j][1] - vertices[j][0] * vertices[i][1];
    signedArea += crossTerm;
    cx += (vertices[i][0] + vertices[j][0]) * crossTerm;
    cy += (vertices[i][1] + vertices[j][1]) * crossTerm;
  }

  // Handle near-zero area (degenerate polygon or line)
  if (Math.abs(signedArea) < 1e-12) {
    // Fallback: return average of vertices (geometric center)
    let meanX = 0, meanY = 0;
    let validPoints = 0;
    vertices.forEach(v => {
        // Ensure vertex is valid before using
        if (v && v.length === 2 && typeof v[0] === 'number' && typeof v[1] === 'number') {
            meanX += v[0]; meanY += v[1]; validPoints++;
        }
    });
    return validPoints > 0 ? [meanX / validPoints, meanY / validPoints] : null;
  }

  signedArea *= 0.5;
  cx /= (6 * signedArea);
  cy /= (6 * signedArea);
  return [cx, cy];
};

/**
 * Wraps a point toroidally into the domain [0, width) x [0, height).
 * Returns [0, 0] for invalid inputs.
 */
export const wrapPoint = (point, width, height) => {
  if (!point || !Array.isArray(point) || point.length !== 2 || typeof point[0] !== 'number' || typeof point[1] !== 'number') return [0, 0];
  let x = point[0] % width;
  let y = point[1] % height;
  // Handle negative modulo result correctly
  if (x < 0) x += width;
  if (y < 0) y += height;
  // Handle cases exactly at the boundary (modulo might return width/height)
  if (Math.abs(x - width) < 1e-9) x = 0;
  if (Math.abs(y - height) < 1e-9) y = 0;
  return [x, y];
};

/**
 * Generates a 3x3 grid of ghost points for each input point to handle toroidal wrapping.
 * Returns an object containing all ghost points and a mapping back to their original indices.
 */
export const generateGhostPoints = (points, width, height) => {
  const allPoints = [];
  const originalIndices = []; // Keep track of which original point each ghost belongs to
  points.forEach((p, index) => {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        allPoints.push([p[0] + dx * width, p[1] + dy * height]);
        originalIndices.push(index);
      }
    }
  });
  return { allPoints, originalIndices };
};


// --- Vertex Snapping Helper Functions ---
/**
 * Snaps a single numerical value to a specified precision grid.
 */
const snapValue = (val, precision = 1e-7) => {
    if (precision === 0) return val; // Avoid division by zero
    return Math.round(val / precision) * precision;
};

/**
 * Snaps the coordinates of a point [x, y] to a specified precision.
 * Returns null if the input point is invalid.
 */
const snapPoint = (point, precision = 1e-7) => {
    if (!point || !Array.isArray(point) || point.length !== 2 || typeof point[0] !== 'number' || typeof point[1] !== 'number') {
        // console.warn("Invalid point passed to snapPoint:", point);
        return null;
    }
    return [snapValue(point[0], precision), snapValue(point[1], precision)];
};

/**
 * Snaps all vertices of a polygon to a specified precision grid.
 * Removes consecutive duplicate vertices that may arise from snapping.
 * Ensures the polygon remains valid (>= 3 distinct vertices).
 * Returns an empty array [] if the polygon becomes degenerate after snapping.
 */
const snapPolygon = (polygon, precision = 1e-7) => {
    // Input validation: Ensure it's an array with at least 3 potential points
    if (!polygon || !Array.isArray(polygon) || polygon.length < 3) {
        return [];
    }

    const snapped = [];
    let lastAddedPoint = null;

    for (let i = 0; i < polygon.length; i++) {
        const currentSnapped = snapPoint(polygon[i], precision);

        // Check if snapping was successful and point is valid
        if (currentSnapped) {
            // Add if it's the first point OR different from the last added point
            if (!lastAddedPoint ||
                Math.abs(currentSnapped[0] - lastAddedPoint[0]) > precision / 2 ||
                Math.abs(currentSnapped[1] - lastAddedPoint[1]) > precision / 2)
            {
                snapped.push(currentSnapped);
                lastAddedPoint = currentSnapped;
            }
        }
        // If snapPoint returned null, we simply skip this vertex
    }

    // Check if first and last points became identical after snapping
    // Only do this if we have at least 3 potentially distinct points after initial snapping
     if (snapped.length >= 3) {
        const firstSnapped = snapped[0];
        const lastSnappedFinal = snapped[snapped.length - 1];
         if (Math.abs(firstSnapped[0] - lastSnappedFinal[0]) < precision / 2 &&
             Math.abs(firstSnapped[1] - lastSnappedFinal[1]) < precision / 2) {
               snapped.pop(); // Remove duplicate closing point
           }
     }

    // Return the snapped polygon only if it still has 3 or more distinct vertices
    return snapped.length >= 3 ? snapped : [];
};


// --- Voronoi Generation Logic ---

/**
 * Helper: Clips a single polygon (array of vertices) against the domain box [0, width] x [0, height].
 * Uses polygon-clipping library. Returns an array of resulting outer rings.
 */
const clipPolygonWithLib = (polygonVertices, width, height) => {
  // Basic validation
  if (!polygonVertices || !Array.isArray(polygonVertices) || polygonVertices.length < 3) { return []; }
  // Ensure vertices are valid points
  if (!polygonVertices.every(p => Array.isArray(p) && p.length === 2)) { return []; }

  // Define the clipping box (counter-clockwise)
  const boundaryBox = [[[0, 0], [width, 0], [width, height], [0, height]]];
  // The polygon to be clipped (subject)
  const subjectPolygon = [polygonVertices.map(p => [p[0], p[1]])]; // Ensure copy

  try {
    const clipped = polygonClipping.intersection(subjectPolygon, boundaryBox);
    // Result is MultiPolygon: [ Polygon ], where Polygon = [outerRing, hole1...]
    // Return only the valid outer rings.
    return clipped.filter(poly => poly?.[0]?.length >= 3).map(poly => poly[0]);
  } catch (error) {
    // Log minimal error message
    console.error("polygonClipping.intersection error:", error.message);
    return []; // Return empty array on error
  }
};

/**
 * Helper: Formats clipped polygons, removing duplicate closing vertex if numerically close.
 * Input is an array of polygons (each an array of vertices).
 */
const formatClippedPolygons = (clippedPolygons) => {
  const outputPolygons = [];
  if (!clippedPolygons || clippedPolygons.length === 0) { return outputPolygons; }

  for (const polygon of clippedPolygons) {
    if (polygon && polygon.length >= 3) {
      const first = polygon[0];
      const last = polygon[polygon.length - 1];
      // Check if first and last points are numerically close
      if (first && last && Math.abs(first[0] - last[0]) < 1e-9 && Math.abs(first[1] - last[1]) < 1e-9) {
        outputPolygons.push(polygon.slice(0, -1)); // Add without duplicate closing point
      } else {
        outputPolygons.push(polygon); // Add as is
      }
    }
  }
  return outputPolygons;
};

/**
 * Generates toroidal Voronoi regions for a set of points within a given width and height.
 * Handles wrapping by using ghost points and clipping/unioning cell fragments.
 * Applies vertex snapping to improve robustness of polygon union.
 * Returns an array where each element corresponds to an input point and contains
 * an array of polygon pieces that make up its Voronoi region.
 * Returns null on invalid input or unhandled errors.
 */
export const generateVoronoiRegionsToroidal = (points, width, height, epsilon = 1e-9) => {
  // Basic input validation
  if (!points || !Array.isArray(points) || width <= 0 || height <= 0) {
    // console.warn("generateVoronoiRegionsToroidal: Invalid input points array, width, or height.");
    return null;
  }
  // Minimum 3 points required for a meaningful Voronoi diagram.
  if (points.length < 3) {
     // console.warn(`generateVoronoiRegionsToroidal: Requires at least 3 input points. Got ${points.length}. Returning null.`);
     return null;
  }

  const N_original = points.length;
  const points_orig = points.map(p => [p[0], p[1]]); // Ensure copies

  try {
    // Generate ghost points and mapping
    const { allPoints, originalIndices } = generateGhostPoints(points_orig, width, height);

    // Create Delaunay triangulation and Voronoi diagram from ghost points
    const delaunay = Delaunay.from(allPoints);
    // Bounds need to encompass the 3x3 grid of ghost points
    const voronoiBounds = [-width - epsilon, -height - epsilon, 2 * width + epsilon, 2 * height + epsilon];
    const voronoi = delaunay.voronoi(voronoiBounds);

    // Collect all relevant polygon pieces for each original point
    const finalMergedRegions = Array(N_original).fill().map(() => []);

    for (let i_all = 0; i_all < allPoints.length; i_all++) {
        const i_orig = originalIndices[i_all]; // Index of the original point
        let rawCellVertices;
        try {
            rawCellVertices = voronoi.cellPolygon(i_all);
        } catch (e) {
            // console.warn(`Error getting cellPolygon for ghost index ${i_all}:`, e);
            rawCellVertices = null;
        }

        if (rawCellVertices && rawCellVertices.length >= 3) {
            // Translate the cell polygon back to the base domain [0, width] x [0, height]
            const ghostPoint = allPoints[i_all];
            const originalPoint = points_orig[i_orig];
            const dx_world = ghostPoint[0] - originalPoint[0];
            const dy_world = ghostPoint[1] - originalPoint[1];
            const translatedVertices = rawCellVertices.map(v => [v[0] - dx_world, v[1] - dy_world]);

            // Clip the translated polygon against the base domain
            const clippedPieces = clipPolygonWithLib(translatedVertices, width, height);
            // Format the clipped pieces (e.g., remove duplicate end vertex)
            const formattedPieces = formatClippedPolygons(clippedPieces);

            // Snap and collect valid pieces
            if (formattedPieces.length > 0) {
               formattedPieces.forEach(piece => {
                 // Snap vertices to improve robustness before union
                 const snappedPiece = snapPolygon(piece); // Use snapping helper

                 // Add the snapped piece if it's still a valid polygon with area
                 if (snappedPiece && snappedPiece.length >= 3 && polygonArea(snappedPiece) > 1e-9) {
                     finalMergedRegions[i_orig].push(snappedPiece);
                 }
               });
            }
        }
    } // End loop through allPoints

    // --- Union overlapping pieces for each original region ---
    const finalOutputRegions = Array(N_original).fill().map(() => []);
    for (let i_orig = 0; i_orig < N_original; i_orig++) {
        let piecesToMerge = finalMergedRegions[i_orig]; // These pieces are already snapped
        if (!piecesToMerge || piecesToMerge.length === 0) continue; // Skip if no pieces collected

        // Optional: Filter exact duplicate polygons (more effective after snapping)
        const uniquePieces = [];
        const pieceSignatures = new Set();
        for(const piece of piecesToMerge) {
            // Use snapped coordinates for signature
            const signature = piece.map(p => `${p[0]},${p[1]}`).join(';');
            if (!pieceSignatures.has(signature)) {
                pieceSignatures.add(signature);
                uniquePieces.push(piece);
            }
        }
        piecesToMerge = uniquePieces;

        // Format for polygonClipping.union: Array<MultiPolygon>
        const polygonsForUnion = piecesToMerge.map(verts => [verts]);
        if (polygonsForUnion.length === 0) continue;
        if (polygonsForUnion.length === 1) {
            // Only one piece, no union needed
            finalOutputRegions[i_orig] = [polygonsForUnion[0][0]];
            continue;
        }

        // Attempt to union the pieces
        try {
            const mergedMultiPolygon = polygonClipping.union(...polygonsForUnion);
            // Format the result (outer rings)
            const formattedMergedPieces = formatClippedPolygons(mergedMultiPolygon.map(p => p[0]));
            // Filter final unioned pieces by area
             finalOutputRegions[i_orig] = formattedMergedPieces.filter(verts => polygonArea(verts) > 1e-9);

        } catch (unionError) {
            // Fallback if union fails: Set the region to empty to avoid area inflation
            console.error(`Union error for point ${i_orig}: ${unionError.message}. Falling back to empty region.`);
            finalOutputRegions[i_orig] = []; // <<< CORRECTED FALLBACK
        }
    } // End loop through i_orig for union

    // Final check for area conservation (for debugging)
    let totalFinalArea = 0;
    finalOutputRegions.forEach(regionPieces => {
      regionPieces.forEach(piece => { totalFinalArea += polygonArea(piece); });
    });
    const expectedArea = width * height;
    // Use a relaxed tolerance due to potential floating point inaccuracies and fallback behavior
    if (Math.abs(totalFinalArea - expectedArea) > expectedArea * 1e-4) {
       console.warn(`Area conservation issue after snapping: Expected ${expectedArea.toFixed(6)}, Got ${totalFinalArea.toFixed(6)}`);
    }

    return finalOutputRegions;

  } catch (error) {
    // Catch unhandled errors during the overall process
    console.error("Unhandled error during Voronoi generation:", error);
    return null;
  }
};


// --- Energy and Gradient Calculations ---

/**
 * Calculates the total energy of the tessellation based on various components.
 */
export const calculateEnergy2D = (regionsData, points, params) => {
    const { width, height, lambdaArea = 2.5, lambdaCentroid = 0.0, lambdaAngle = 0.01, targetAreaFunc = null, pointWeights = null, lambdaMinArea = 0.0, minAreaThreshold = 0.0 } = params;
    let totalEnergy = 0;
    const energyComponents = { area: 0, centroid: 0, angle: 0, minArea: 0 };

    // Basic validation
    if (!points || !Array.isArray(points) || points.length === 0) {
         return { totalEnergy: Infinity, components: energyComponents };
    }
    const numGenerators = points.length;
    if (!regionsData || !Array.isArray(regionsData) || regionsData.length !== numGenerators) {
        // console.warn("Energy calc: Invalid regionsData input or length mismatch.");
        return { totalEnergy: Infinity, components: energyComponents };
    }

    const targetTotalArea = width * height;
    let useWeights = false;
    let sumWeights = 0;

    // Determine target area calculation method (function > weights > uniform)
    if (!targetAreaFunc && pointWeights && Array.isArray(pointWeights) && pointWeights.length === numGenerators) {
        if (pointWeights.every(w => typeof w === 'number' && w > 0)) { // Ensure weights are positive numbers
            sumWeights = pointWeights.reduce((a, b) => a + b, 0);
            if (sumWeights > 1e-9) useWeights = true;
        }
    }

    const calculatedAreas = [];
    regionsData.forEach((regionPieces, i) => {
        // Validate individual region piece array
        if (!Array.isArray(regionPieces)) {
            // console.warn(`Energy calc: regionPieces for point ${i} is not an array, skipping.`);
            calculatedAreas.push(0);
            return; // Skip this point's energy contribution
        }

        // Calculate current total area for the region
        const currentTotalArea = regionPieces.reduce((total, piece) => total + polygonArea(piece), 0);
        calculatedAreas.push(currentTotalArea);

        // Skip energy calculation for empty or numerically insignificant regions
        if (!regionPieces.length || currentTotalArea < 1e-12) return;

        const generatorPoint = points[i];
        let targetArea = 1e-9; // Default small positive target area

        // Determine target area for this specific region
        if (targetAreaFunc) {
            targetArea = targetAreaFunc(generatorPoint);
        } else if (useWeights) {
            targetArea = targetTotalArea * pointWeights[i] / sumWeights;
        } else { // Uniform distribution
            targetArea = targetTotalArea / numGenerators;
        }
        // Ensure target area is positive
        if (targetArea <= 0) targetArea = 1e-9;

        // --- Area Energy Component ---
        energyComponents.area += lambdaArea * Math.pow(currentTotalArea - targetArea, 2);

        // --- Centroid Energy Component ---
        if (lambdaCentroid > 1e-12) {
            let overallCentroidX = 0, overallCentroidY = 0, totalWeight = 0;
            regionPieces.forEach(piece => {
                const pieceArea = polygonArea(piece);
                // Only calculate centroid if piece has significant area
                if (pieceArea > 1e-12) {
                    const pieceCentroid = polygonCentroid(piece);
                    if (pieceCentroid) { // Check if centroid calculation was successful
                        overallCentroidX += pieceCentroid[0] * pieceArea;
                        overallCentroidY += pieceCentroid[1] * pieceArea;
                        totalWeight += pieceArea;
                    }
                }
            });
            // Calculate weighted average centroid for the region
            if (totalWeight > 1e-12) {
                const regionCentroid = [overallCentroidX / totalWeight, overallCentroidY / totalWeight];
                energyComponents.centroid += lambdaCentroid * toroidalDistanceSq(generatorPoint, regionCentroid, width, height);
            }
        } else {
            energyComponents.centroid = 0.0;
        }

        // --- Angle Energy Component ---
        if (lambdaAngle > 1e-12) {
            let anglePenalty = 0;
            const smallAngleThresholdRad = Math.PI / 9; // ~20 degrees
            regionPieces.forEach(verts => {
                const nVerts = verts.length;
                if (nVerts < 3) return; // Need at least 3 vertices

                for (let j = 0; j < nVerts; j++) {
                    const pPrev = verts[(j - 1 + nVerts) % nVerts];
                    const pCurr = verts[j];
                    const pNext = verts[(j + 1) % nVerts];

                    // Ensure vertices are valid points
                    if(!pPrev || !pCurr || !pNext || pPrev.length!==2 || pCurr.length!==2 || pNext.length!==2) continue;

                    const v1 = [pPrev[0] - pCurr[0], pPrev[1] - pCurr[1]];
                    const v2 = [pNext[0] - pCurr[0], pNext[1] - pCurr[1]];
                    const norm1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]);
                    const norm2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1]);

                    if (norm1 > 1e-12 && norm2 > 1e-12) { // Avoid division by zero
                        const dotProduct = v1[0] * v2[0] + v1[1] * v2[1];
                        // Clamp cosine value due to potential precision errors
                        const cosTheta = Math.min(Math.max(dotProduct / (norm1 * norm2), -1.0), 1.0);
                        const angle = Math.acos(cosTheta); // Angle in radians [0, PI]

                        // Penalize angles that are positive but too small
                        if (angle > 1e-9 && angle < smallAngleThresholdRad) {
                            anglePenalty += Math.pow(smallAngleThresholdRad - angle, 2);
                        }
                    }
                }
            });
            energyComponents.angle += lambdaAngle * anglePenalty;
        } else {
            energyComponents.angle = 0.0;
        }
    }); // End of regionsData.forEach

    // --- Minimum Area Energy Component ---
    // Calculated after all areas are computed
    if (lambdaMinArea > 0 && minAreaThreshold > 0) {
        calculatedAreas.forEach(area => {
            // Penalize areas that are positive but below the threshold
            if (area > 1e-12 && area < minAreaThreshold) {
                energyComponents.minArea += lambdaMinArea * Math.pow(minAreaThreshold - area, 2);
            }
        });
    } else {
        energyComponents.minArea = 0.0;
    }

    // Sum up all energy components
    totalEnergy = Object.values(energyComponents).reduce((a, b) => a + b, 0);
    return { totalEnergy, components: energyComponents };
};

/**
 * Calculates the gradient of the energy function with respect to point positions
 * using finite differences.
 */
export const calculateGradient2D = (points, params, delta = 1e-6) => {
    const { width, height } = params;

    // Basic validation for points
    if (!points || !Array.isArray(points) || points.length === 0) {
        console.warn("calculateGradient2D: Invalid points array provided.");
        return []; // Return empty gradient for invalid input
    }

    const gradient = Array(points.length).fill(0).map(() => [0, 0]); // Initialize zero gradient
    const pointsForGrad = points.map(p => [...p]); // Create a mutable copy

    // Calculate base regions and energy
    const regionsBase = generateVoronoiRegionsToroidal(pointsForGrad, width, height);
    // Handle potential failure of base region generation
    if (!regionsBase) {
        // console.warn("Grad calc failed: No base regions returned from generateVoronoiRegionsToroidal.");
        // Return zero gradient if base generation failed, allowing optimization to potentially recover
        return gradient;
    }

    const { totalEnergy: energyBase } = calculateEnergy2D(regionsBase, pointsForGrad, params);
    // Handle invalid base energy calculation
    if (!isFinite(energyBase)) {
        // console.warn("Grad calc failed: Base energy is not finite (NaN/Infinity).");
        // Return zero gradient if base energy is invalid
        return gradient;
    }

    // Calculate perturbed energy for each point and each dimension (x, y)
    for (let i = 0; i < points.length; i++) {
        for (let j = 0; j < 2; j++) { // j=0 for x, j=1 for y
            const pointsPerturbed = pointsForGrad.map(p => [...p]); // Fresh copy for perturbation
            pointsPerturbed[i][j] += delta; // Perturb one coordinate

            // Optional: Wrap perturbed point back into domain?
            // Usually not essential for small delta if Voronoi handles points outside correctly via ghosts.
            // pointsPerturbed[i] = wrapPoint(pointsPerturbed[i], width, height);

            // Generate regions for the perturbed points
            const regionsPerturbed = generateVoronoiRegionsToroidal(pointsPerturbed, width, height);
            // Handle failure during perturbed region generation
            if (!regionsPerturbed) {
                // console.warn(`Grad calc failed for perturb ${i},${j}: No regions returned.`);
                // If perturbed generation fails, assume derivative is zero for this component
                gradient[i][j] = 0;
                continue; // Move to next perturbation
            }

            // Calculate energy for the perturbed state
            const { totalEnergy: energyPerturbed } = calculateEnergy2D(regionsPerturbed, pointsPerturbed, params);
            // Handle invalid perturbed energy calculation
            if (!isFinite(energyPerturbed)) {
                // console.warn(`Grad calc failed for perturb ${i},${j}: Perturbed energy NaN/Infinity.`);
                // If perturbed energy is invalid, assume derivative is zero
                gradient[i][j] = 0;
                continue; // Move to next perturbation
            }

            // Calculate finite difference (forward difference)
            // dE/dx ~= (E(x+delta) - E(x)) / delta
            gradient[i][j] = (energyPerturbed - energyBase) / delta;
        }
    }
    return gradient;
};


// --- Drawing Utility ---

/**
 * Draws a single tile (polygon) with optional dynamic scaling.
 * Assumes context is already translated/scaled to the main domain coordinate system.
 */
export const drawTile = (ctx, tile, dynamicScaleFactor = 1.0) => {
  // Validate tile structure and points
  const hasValidPoints = tile && tile.points && Array.isArray(tile.points) && tile.points.length >= 3;
  if (!hasValidPoints) {
    // console.warn("Skipping drawTile: Invalid tile data or insufficient points", tile);
    return;
  }
   // Optional deeper validation: check if points are [number, number] arrays? Can be slow.

  // Get current transform to adjust line width for scaling
  const currentTransform = ctx.getTransform();
  // Calculate an average scale factor (more robust than just using 'a' or 'd')
  const avgScaleForStroke = (Math.sqrt(currentTransform.a**2 + currentTransform.c**2) + Math.sqrt(currentTransform.b**2 + currentTransform.d**2)) / 2 || 1;

  ctx.save(); // Save context state before potential transformations

  // --- Apply Dynamic Scaling (if requested and valid) ---
  const useDynamicScale = Math.abs(dynamicScaleFactor - 1.0) > 1e-6;
  // Requires centroid (tile.x, tile.y) to scale around center
  if (useDynamicScale && typeof tile.x === 'number' && typeof tile.y === 'number') {
      const centroidX = tile.x;
      const centroidY = tile.y;
      // Translate to centroid, scale, translate back
      ctx.translate(centroidX, centroidY);
      ctx.scale(dynamicScaleFactor, dynamicScaleFactor);
      ctx.translate(-centroidX, -centroidY);
  } else if (useDynamicScale) {
      // console.warn("Dynamic scale requested for drawTile but tile centroid (x, y) missing or invalid.");
  }

  // --- Draw Fill ---
  ctx.beginPath();
  // Ensure first point is valid before starting path
  if (!tile.points[0] || !Array.isArray(tile.points[0]) || tile.points[0].length !== 2) { ctx.restore(); return; }
  ctx.moveTo(tile.points[0][0], tile.points[0][1]);
  // Add subsequent points
  for (let i = 1; i < tile.points.length; i++) {
      // Ensure point is valid before adding line segment
      if (!tile.points[i] || !Array.isArray(tile.points[i]) || tile.points[i].length !== 2) { ctx.restore(); return; }
      ctx.lineTo(tile.points[i][0], tile.points[i][1]);
  }
  ctx.closePath(); // Close the path for filling

  // Set fill color (use default if not provided) and fill
  ctx.fillStyle = tile.color || '#333';
  ctx.fill();

  ctx.restore(); // Restore context state (removes dynamic scaling transform) before drawing border

  // --- Draw Border ---
  // Re-define path specifically for the stroke (required after restore)
  ctx.beginPath();
  // Again, ensure points are valid
  if (!tile.points[0] || !Array.isArray(tile.points[0]) || tile.points[0].length !== 2) return;
  ctx.moveTo(tile.points[0][0], tile.points[0][1]);
  for (let i = 1; i < tile.points.length; i++) {
       if (!tile.points[i] || !Array.isArray(tile.points[i]) || tile.points[i].length !== 2) return;
       ctx.lineTo(tile.points[i][0], tile.points[i][1]);
  }
  ctx.closePath(); // Close path for stroking

  // Style and draw the border stroke
  const baseLineWidth = 1.5; // Base desired line width in unscaled coordinates
  // Adjust line width based on canvas scaling to maintain apparent thickness
  // Ensure a minimum physical pixel width (e.g., 0.5px) but scale up otherwise
  ctx.lineWidth = Math.max(0.5 / avgScaleForStroke, baseLineWidth / avgScaleForStroke);
  ctx.strokeStyle = 'rgba(50, 50, 50, 0.8)'; // Darker border color
  ctx.stroke();
};