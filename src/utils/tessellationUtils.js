/**
 * TessellationUtils.js
 * Contains utilities for tessellation, including Voronoi generation,
 * optimization steps (gradient calc), and drawing color-filled tiles.
 */
import { Delaunay } from 'd3-delaunay';
import polygonClipping from 'polygon-clipping';

// --- Geometric Utilities ---
export const toroidalDistanceSq = (p1, p2, width, height) => { if (!p1 || !p2) return Infinity; const dx = p1[0] - p2[0]; const dy = p1[1] - p2[1]; const deltaX = Math.min(Math.abs(dx), width - Math.abs(dx)); const deltaY = Math.min(Math.abs(dy), height - Math.abs(dy)); return deltaX * deltaX + deltaY * deltaY; };
export const toroidalDistance = (p1, p2, width, height) => { return Math.sqrt(toroidalDistanceSq(p1, p2, width, height)); };
export const polygonArea = (vertices) => { if (!vertices || vertices.length < 3) return 0; let area = 0; for (let i = 0; i < vertices.length; i++) { const j = (i + 1) % vertices.length; area += vertices[i][0] * vertices[j][1]; area -= vertices[j][0] * vertices[i][1]; } return Math.abs(area) / 2; };
export const polygonCentroid = (vertices) => { if (!vertices || vertices.length < 3) return null; let signedArea = 0; let cx = 0; let cy = 0; const n = vertices.length; for (let i = 0; i < n; i++) { const j = (i + 1) % n; const crossTerm = vertices[i][0] * vertices[j][1] - vertices[j][0] * vertices[i][1]; signedArea += crossTerm; cx += (vertices[i][0] + vertices[j][0]) * crossTerm; cy += (vertices[i][1] + vertices[j][1]) * crossTerm; } if (Math.abs(signedArea) < 1e-12) { let meanX = 0, meanY = 0; vertices.forEach(v => { meanX += v[0]; meanY += v[1]; }); return [meanX / n, meanY / n]; } signedArea *= 0.5; cx /= (6 * signedArea); cy /= (6 * signedArea); return [cx, cy]; };
export const wrapPoint = (point, width, height) => { if (!point || point.length !== 2) return [0, 0]; let x = point[0] % width; let y = point[1] % height; if (x < 0) x += width; if (y < 0) y += height; return [x, y]; };
export const generateGhostPoints = (points, width, height) => { const allPoints = []; points.forEach((p) => { for (let dx = -1; dx <= 1; dx++) { for (let dy = -1; dy <= 1; dy++) { allPoints.push([p[0] + dx * width, p[1] + dy * height]); } } }); return { allPoints }; };

// --- Voronoi Generation Logic ---
const clipPolygonWithLib = (polygonVertices, width, height) => { if (!polygonVertices || polygonVertices.length < 3) return []; const boundaryBox = [[[0, 0], [width, 0], [width, height], [0, height]]]; const subjectPolygon = [polygonVertices.map(p => [p[0], p[1]])]; try { const clipped = polygonClipping.intersection(subjectPolygon, boundaryBox); return clipped.filter(poly => poly && poly.length > 0 && poly[0] && poly[0].length >= 3); } catch (error) { console.error("Clipping error:", error); return []; } };
const formatClippedPolygons = (clippedData) => { const outputPolygons = []; if (!clippedData || clippedData.length === 0) { return outputPolygons; } for (const polygonWithHoles of clippedData) { if (polygonWithHoles && polygonWithHoles.length > 0) { const outerRing = polygonWithHoles[0]; if (outerRing && outerRing.length >= 3) { const first = outerRing[0]; const last = outerRing[outerRing.length - 1]; if (first && last && Math.abs(first[0] - last[0]) < 1e-9 && Math.abs(first[1] - last[1]) < 1e-9) { outputPolygons.push(outerRing.slice(0, -1)); } else { outputPolygons.push(outerRing); } } } } return outputPolygons; };
export const generateVoronoiRegionsToroidal = (points, width, height, epsilon = 1e-9) => { if (!points || points.length < 4 || width <= 0 || height <= 0) return null; const N_original = points.length; const points_orig = points.map(p => [p[0], p[1]]); try { const { allPoints } = generateGhostPoints(points_orig, width, height); const delaunay = Delaunay.from(allPoints); const voronoiBounds = [-width - epsilon, -height - epsilon, 2 * width + epsilon, 2 * height + epsilon]; const voronoi = delaunay.voronoi(voronoiBounds); const groupedRawPieces = Array(N_original).fill().map(() => []); for (let i_orig = 0; i_orig < N_original; i_orig++) { const centerGhostIndex = i_orig * 9 + 4; const rawCellVertices = voronoi.cellPolygon(centerGhostIndex); if (rawCellVertices && rawCellVertices.length >= 3) { const clippedRawMultiPolygon = clipPolygonWithLib(rawCellVertices, width, height); const formattedPieces = formatClippedPolygons(clippedRawMultiPolygon); if (formattedPieces.length > 0) { groupedRawPieces[i_orig].push(...formattedPieces); } } } const finalMergedRegions = Array(N_original).fill().map(() => []); for (let i_orig = 0; i_orig < N_original; i_orig++) { const piecesToMerge = groupedRawPieces[i_orig]; if (!piecesToMerge || piecesToMerge.length === 0) continue; const polygonsForUnion = piecesToMerge.filter(verts => polygonArea(verts) > 1e-9).map(verts => [verts]); if (polygonsForUnion.length === 0) continue; if (polygonsForUnion.length === 1) { finalMergedRegions[i_orig] = [polygonsForUnion[0][0]]; continue; } try { const mergedMultiPolygon = polygonClipping.union(...polygonsForUnion); const formattedMergedPieces = formatClippedPolygons(mergedMultiPolygon); finalMergedRegions[i_orig] = formattedMergedPieces.filter(verts => polygonArea(verts) > 1e-9); } catch (unionError) { console.error(`Union error point ${i_orig}:`, unionError); finalMergedRegions[i_orig] = polygonsForUnion.map(p => p[0]); } } return finalMergedRegions; } catch (error) { console.error("Voronoi generation error:", error); return null; } };

// --- Energy and Gradient Calculations ---
export const calculateEnergy2D = (regionsData, points, params) => { const { width, height, lambdaArea = 2.5, lambdaCentroid = 0.0, lambdaAngle = 0.01, targetAreaFunc = null, pointWeights = null, lambdaMinArea = 0.0, minAreaThreshold = 0.0 } = params; let totalEnergy = 0; const energyComponents = { area: 0, centroid: 0, angle: 0, minArea: 0 }; const numGenerators = points.length; const targetTotalArea = width * height; let useWeights = false; let sumWeights = 0; if (!targetAreaFunc && pointWeights && Array.isArray(pointWeights) && pointWeights.length === numGenerators) { if (pointWeights.every(w => w > 0)) { sumWeights = pointWeights.reduce((a, b) => a + b, 0); if (sumWeights > 1e-9) useWeights = true; } } if (!regionsData || regionsData.length !== points.length) { return { totalEnergy: Infinity, components: energyComponents }; } const calculatedAreas = []; regionsData.forEach((regionPieces, i) => { const currentTotalArea = regionPieces.reduce((total, piece) => total + polygonArea(piece), 0); calculatedAreas.push(currentTotalArea); if (!regionPieces.length || currentTotalArea < 1e-12) return; const generatorPoint = points[i]; let targetArea = 1e-9; if (targetAreaFunc) targetArea = targetAreaFunc(generatorPoint); else if (useWeights) targetArea = targetTotalArea * pointWeights[i] / sumWeights; else if (numGenerators > 0) targetArea = targetTotalArea / numGenerators; if (targetArea <= 0) targetArea = 1e-9; energyComponents.area += lambdaArea * Math.pow(currentTotalArea - targetArea, 2); if (lambdaCentroid > 1e-12) { let overallCentroidX = 0, overallCentroidY = 0, totalWeight = 0; regionPieces.forEach(piece => { const pieceArea = polygonArea(piece); const pieceCentroid = polygonCentroid(piece); if (pieceArea > 1e-12 && pieceCentroid) { overallCentroidX += pieceCentroid[0] * pieceArea; overallCentroidY += pieceCentroid[1] * pieceArea; totalWeight += pieceArea; } }); if (totalWeight > 1e-12) { const regionCentroid = [overallCentroidX / totalWeight, overallCentroidY / totalWeight]; energyComponents.centroid += lambdaCentroid * toroidalDistanceSq(generatorPoint, regionCentroid, width, height); } } else energyComponents.centroid = 0.0; if (lambdaAngle > 1e-12) { let anglePenalty = 0; const smallAngleThresholdRad = Math.PI / 9; regionPieces.forEach(verts => { const nVerts = verts.length; if (nVerts < 3) return; for (let j = 0; j < nVerts; j++) { const pPrev = verts[(j - 1 + nVerts) % nVerts]; const pCurr = verts[j]; const pNext = verts[(j + 1) % nVerts]; const v1 = [pPrev[0] - pCurr[0], pPrev[1] - pCurr[1]]; const v2 = [pNext[0] - pCurr[0], pNext[1] - pCurr[1]]; const norm1 = Math.sqrt(v1[0] * v1[0] + v1[1] * v1[1]); const norm2 = Math.sqrt(v2[0] * v2[0] + v2[1] * v2[1]); if (norm1 > 1e-12 && norm2 > 1e-12) { const cosTheta = Math.min(Math.max((v1[0] * v2[0] + v1[1] * v2[1]) / (norm1 * norm2), -1.0), 1.0); const angle = Math.acos(cosTheta); if (0 < angle && angle < smallAngleThresholdRad) { anglePenalty += Math.pow(smallAngleThresholdRad - angle, 2); } } } }); energyComponents.angle += lambdaAngle * anglePenalty; } else energyComponents.angle = 0.0; }); if (lambdaMinArea > 0 && minAreaThreshold > 0) { calculatedAreas.forEach(area => { if (0 < area && area < minAreaThreshold) { energyComponents.minArea += lambdaMinArea * Math.pow(minAreaThreshold - area, 2); } }); } else energyComponents.minArea = 0.0; totalEnergy = Object.values(energyComponents).reduce((a, b) => a + b, 0); return { totalEnergy, components: energyComponents }; };
export const calculateGradient2D = (points, params, delta = 1e-6) => { const { width, height } = params; const gradient = Array(points.length).fill().map(() => [0, 0]); const pointsForGrad = points.map(p => [...p]); const regionsBase = generateVoronoiRegionsToroidal(pointsForGrad, width, height); if (!regionsBase) { console.warn("Grad calc failed: No base regions"); return gradient; } const { totalEnergy: energyBase } = calculateEnergy2D(regionsBase, pointsForGrad, params); if (!isFinite(energyBase)) { console.warn("Grad calc failed: Base energy NaN"); return gradient; } for (let i = 0; i < points.length; i++) { for (let j = 0; j < 2; j++) { const pointsPerturbed = pointsForGrad.map(p => [...p]); pointsPerturbed[i][j] += delta; const regionsPerturbed = generateVoronoiRegionsToroidal(pointsPerturbed, width, height); if (!regionsPerturbed) { /* console.warn(`Grad calc failed for perturb ${i},${j}: No regions`); */ gradient[i][j] = 0; continue; } const { totalEnergy: energyPerturbed } = calculateEnergy2D(regionsPerturbed, pointsPerturbed, params); if (!isFinite(energyPerturbed)) { /* console.warn(`Grad calc failed for perturb ${i},${j}: Energy NaN`); */ gradient[i][j] = 0; continue; } gradient[i][j] = (energyPerturbed - energyBase) / delta; } } return gradient; };

// optimizeTessellation2D removed as logic moved to worker/main thread loop

/**
 * Draws a single tile with a solid color fill and thicker border.
 * Includes optional dynamic scaling for visual effect.
 *
 * @param {CanvasRenderingContext2D} ctx - The canvas context (scaled/translated for domain).
 * @param {object} tile - Tile object with `points`, `x`, `y`, `color`.
 * @param {number} [dynamicScaleFactor=1.0] - Optional scaling for pulsing.
 */
export const drawTile = (ctx, tile, dynamicScaleFactor = 1.0) => {
  const hasValidPoints = tile && tile.points && tile.points.length >= 3;
  if (!hasValidPoints) return;

  const currentTransform = ctx.getTransform();
  const avgScaleForStroke = (Math.sqrt(currentTransform.a**2 + currentTransform.c**2) + Math.sqrt(currentTransform.b**2 + currentTransform.d**2)) / 2 || 1;

  ctx.save();

  // Apply dynamic scaling centered on the tile's centroid
  const useDynamicScale = Math.abs(dynamicScaleFactor - 1.0) > 1e-6;
  if (useDynamicScale) {
      const centroidX = tile.x ?? 0; const centroidY = tile.y ?? 0;
      ctx.translate(centroidX, centroidY);
      ctx.scale(dynamicScaleFactor, dynamicScaleFactor);
      ctx.translate(-centroidX, -centroidY);
  }

  // Create Path
  ctx.beginPath();
  ctx.moveTo(tile.points[0][0], tile.points[0][1]);
  for (let i = 1; i < tile.points.length; i++) { ctx.lineTo(tile.points[i][0], tile.points[i][1]); }
  ctx.closePath();

  // Fill with tile color
  ctx.fillStyle = tile.color || '#333';
  ctx.fill();

  ctx.restore(); // Restore BEFORE drawing border

  // --- Draw Tile Border (Thicker Roman Style) ---
  ctx.beginPath(); // Re-define path for stroke
  ctx.moveTo(tile.points[0][0], tile.points[0][1]);
  for (let i = 1; i < tile.points.length; i++) { ctx.lineTo(tile.points[i][0], tile.points[i][1]); }
  ctx.closePath();

  // ** REQUIREMENT 3: Thicker Border **
  const baseLineWidth = 1.5; // Increased base width for Roman style (adjust)
  // Ensure a minimum physical pixel width (e.g., 0.5px) but scale up
  ctx.lineWidth = Math.max(0.5 / avgScaleForStroke, baseLineWidth / avgScaleForStroke);
  ctx.strokeStyle = 'rgba(50, 50, 50, 0.8)'; // Darker, less transparent grout
  ctx.stroke();
};
