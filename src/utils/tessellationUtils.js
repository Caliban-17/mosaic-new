/**
 * Generates a mosaic that guarantees perfect tessellation with no gaps.
 * Satisfies the mathematical constraints:
 * - ∪F_i = C (complete coverage)
 * - ∀i≠j: int(F_i) ∩ int(F_j) = ∅ (no overlaps)
 * - F_i ⊂ C ∀i (canvas containment)
 */
export const generateTessellatedMosaic = (width, height, desiredTileCount, viewType, sampleColor) => {
    // Calculate appropriate grid dimensions based on desired tile count
    const aspectRatio = width / height;
    const gridRows = Math.round(Math.sqrt(desiredTileCount / aspectRatio));
    const gridCols = Math.round(gridRows * aspectRatio);
    
    // Calculate cell dimensions
    const cellWidth = width / gridCols;
    const cellHeight = height / gridRows;
    
    // Step 1: Create a grid of shared vertices
    // This is the key to perfect tessellation - adjacent tiles share exact vertex coordinates
    const gridVertices = [];
    
    // Initialize grid vertices
    for (let row = 0; row <= gridRows; row++) {
      const vertexRow = [];
      for (let col = 0; col <= gridCols; col++) {
        // Base position of this vertex (exact grid position)
        vertexRow.push({
          x: col * cellWidth,
          y: row * cellHeight,
          // Track if jitter has been applied
          jitterApplied: false
        });
      }
      gridVertices.push(vertexRow);
    }
    
    // Step 2: Apply jitter to internal vertices for visual interest
    // Skip vertices at canvas boundary to ensure perfect containment (F_i ⊂ C ∀i)
    for (let row = 1; row < gridRows; row++) {
      for (let col = 1; col < gridCols; col++) {
        // Internal vertices get jittered for variation (80% chance)
        if (Math.random() < 0.8) {
          // Apply controlled, limited jitter as a percentage of cell size
          const jitterX = (Math.random() * 2 - 1) * (cellWidth * 0.25);
          const jitterY = (Math.random() * 2 - 1) * (cellHeight * 0.25);
          
          // Apply jitter to this shared vertex
          gridVertices[row][col].x += jitterX;
          gridVertices[row][col].y += jitterY;
          gridVertices[row][col].jitterApplied = true;
        }
      }
    }
    
    // Step 3: Create tiles based on the grid vertices
    const allTiles = [];
    
    // For each cell in the grid
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        // Get the four corners of this cell - these are shared with adjacent cells
        // which guarantees perfect tessellation
        const topLeft = gridVertices[row][col];
        const topRight = gridVertices[row][col + 1];
        const bottomRight = gridVertices[row + 1][col + 1];
        const bottomLeft = gridVertices[row + 1][col];
        
        // Decide if we want to subdivide this cell for visual variety
        const shouldSubdivide = Math.random() < 0.3;
        
        if (shouldSubdivide) {
          // For subdivision, create multiple polygons within the cell
          // All subdivided polygons together must exactly equal the cell area
          // This ensures no gaps (∪F_i = C) and no overlaps (∀i≠j: int(F_i) ∩ int(F_j) = ∅)
          
          // Create a subdivision point - this will be shared by all sub-polygons
          // to ensure they fit together perfectly
          const centerX = (topLeft.x + topRight.x + bottomRight.x + bottomLeft.x) / 4;
          const centerY = (topLeft.y + topRight.y + bottomRight.y + bottomLeft.y) / 4;
          
          // Add subtle randomness to center position
          const centerJitterX = (Math.random() * 2 - 1) * (cellWidth * 0.15);
          const centerJitterY = (Math.random() * 2 - 1) * (cellHeight * 0.15);
          const center = {
            x: centerX + centerJitterX,
            y: centerY + centerJitterY
          };
          
          // Choose subdivision type (creates visual variety while maintaining perfect tessellation)
          const subdivisionType = Math.floor(Math.random() * 3); // 0, 1, or 2
          
          if (subdivisionType === 0) {
            // Simple 4-way division into triangles
            // This guarantees complete coverage with no gaps/overlaps
            const subdivisions = [
              [topLeft, topRight, center],
              [topRight, bottomRight, center],
              [bottomRight, bottomLeft, center],
              [bottomLeft, topLeft, center]
            ];
            
            // Add each subdivision as a separate tile
            subdivisions.forEach(points => {
              const polygonPoints = points.map(p => ({ x: p.x, y: p.y }));
              const centroid = calculateCentroid(polygonPoints);
              
              allTiles.push({
                points: polygonPoints,
                x: centroid.x,
                y: centroid.y,
                row,
                col
              });
            });
          } else if (subdivisionType === 1) {
            // Diagonal division into two quads
            // Still guarantees complete coverage with no gaps/overlaps
            const subdivisions = [
              [topLeft, topRight, center, bottomLeft],
              [topRight, bottomRight, bottomLeft, center]
            ];
            
            // Add each subdivision as a separate tile
            subdivisions.forEach(points => {
              const polygonPoints = points.map(p => ({ x: p.x, y: p.y }));
              const centroid = calculateCentroid(polygonPoints);
              
              allTiles.push({
                points: polygonPoints,
                x: centroid.x,
                y: centroid.y,
                row,
                col
              });
            });
          } else {
            // Three-part division for more variety
            // Still maintains perfect tessellation
            const midTop = { 
              x: (topLeft.x + topRight.x) / 2, 
              y: (topLeft.y + topRight.y) / 2 
            };
            
            const subdivisions = [
              [topLeft, midTop, center],
              [midTop, topRight, bottomRight, center],
              [center, bottomRight, bottomLeft, topLeft]
            ];
            
            // Add each subdivision as a separate tile
            subdivisions.forEach(points => {
              const polygonPoints = points.map(p => ({ x: p.x, y: p.y }));
              const centroid = calculateCentroid(polygonPoints);
              
              allTiles.push({
                points: polygonPoints,
                x: centroid.x,
                y: centroid.y,
                row,
                col
              });
            });
          }
        } else {
          // For non-subdivided cells, create a single tile with the four corners
          // Add extra vertices along edges for visual interest
          
          let points = [
            { x: topLeft.x, y: topLeft.y },
            { x: topRight.x, y: topRight.y },
            { x: bottomRight.x, y: bottomRight.y },
            { x: bottomLeft.x, y: bottomLeft.y }
          ];
          
          // Sometimes add extra vertices to create more complex shapes
          if (Math.random() < 0.6) {
            // Add 1-2 extra vertices on random edges
            const numExtraVertices = 1 + Math.floor(Math.random() * 2);
            
            for (let i = 0; i < numExtraVertices; i++) {
              // Pick a random edge
              const edgeIndex = Math.floor(Math.random() * points.length);
              const nextIndex = (edgeIndex + 1) % points.length;
              
              // Create a point along this edge
              const t = 0.3 + Math.random() * 0.4; // Position along edge (30-70%)
              const newPoint = {
                x: points[edgeIndex].x + t * (points[nextIndex].x - points[edgeIndex].x),
                y: points[edgeIndex].y + t * (points[nextIndex].y - points[edgeIndex].y)
              };
              
              // Insert the new point between the edge points
              // This maintains the exact edge boundary, ensuring perfect tessellation
              points.splice(edgeIndex + 1, 0, newPoint);
            }
          }
          
          // Calculate centroid for this tile
          const centroid = calculateCentroid(points);
          
          // Add tile
          allTiles.push({
            points,
            x: centroid.x,
            y: centroid.y,
            row,
            col
          });
        }
      }
    }
    
    // Create the final tiles with all properties
    return allTiles.map((tile, index) => {
      // Sample color from the image at the centroid position
      const color = sampleColor(tile.x, tile.y, width, height);
      
      // Determine if this tile has children (for nested exploration)
      // Adjust probabilities based on view type
      const hasChildrenProbability = viewType === 'main' ? 0.4 :
                                    viewType === 'splinters' ? 0.3 : 0.2;
      
      return {
        id: `${viewType}-${index}`,
        x: tile.x,
        y: tile.y,
        points: tile.points,
        color: color,
        hasChildren: Math.random() < hasChildrenProbability,
        sides: tile.points.length
      };
    });
  };
  
  /**
   * Helper function to calculate centroid of a polygon
   */
  function calculateCentroid(points) {
    if (!points || points.length < 3) {
      return { x: 0, y: 0 };
    }
    
    let sumX = 0, sumY = 0;
    for (const point of points) {
      sumX += point.x;
      sumY += point.y;
    }
    
    return {
      x: sumX / points.length,
      y: sumY / points.length
    };
  }
  
  /**
   * Validates that a tessellation properly satisfies the mathematical constraints.
   * This function can be used for testing and debugging.
   */
  export const validateTessellation = (tiles, width, height) => {
    // Validation variables
    let issues = {
      gaps: [],
      overlaps: [],
      outsideBounds: []
    };
    
    // Helper function to check if a point is inside a polygon
    const isPointInPolygon = (point, polygon) => {
      if (!polygon || polygon.length < 3) return false;
      
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x;
        const yi = polygon[i].y;
        const xj = polygon[j].x;
        const yj = polygon[j].y;
        
        const intersect = ((yi > point.y) !== (yj > point.y)) &&
          (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
          
        if (intersect) inside = !inside;
      }
      
      return inside;
    };
    
    // Check for tiles outside canvas bounds
    tiles.forEach((tile, index) => {
      if (!tile.points) return;
      
      // Check if any point is outside canvas bounds
      const outsidePoints = tile.points.filter(p => 
        p.x < 0 || p.x > width || p.y < 0 || p.y > height
      );
      
      if (outsidePoints.length > 0) {
        issues.outsideBounds.push({
          tileIndex: index,
          points: outsidePoints
        });
      }
    });
    
    // Create a grid of test points to check for gaps and overlaps
    const gridSize = 20; // Number of points to test per dimension
    const gridStepX = width / gridSize;
    const gridStepY = height / gridSize;
    
    for (let x = 0; x <= width; x += gridStepX) {
      for (let y = 0; y <= height; y += gridStepY) {
        const testPoint = { x, y };
        
        // Count how many tiles contain this test point
        let containingTiles = 0;
        tiles.forEach(tile => {
          if (isPointInPolygon(testPoint, tile.points)) {
            containingTiles++;
          }
        });
        
        // If no tiles contain the point, it's a gap
        if (containingTiles === 0) {
          issues.gaps.push(testPoint);
        }
        
        // If multiple tiles contain the point, it's an overlap
        if (containingTiles > 1) {
          issues.overlaps.push({
            point: testPoint,
            count: containingTiles
          });
        }
      }
    }
    
    // Return validation results
    return {
      valid: issues.gaps.length === 0 && issues.overlaps.length === 0 && issues.outsideBounds.length === 0,
      issues
    };
  };
  
  /**
   * Draws debug visualization for tessellation validation
   */
  export const drawTessellationDebug = (ctx, tiles, validationResult) => {
    // First draw all tiles normally
    tiles.forEach(tile => {
      drawTile(ctx, tile);
    });
    
    // Draw validation issues
    const { issues } = validationResult;
    
    // Draw gaps
    issues.gaps.forEach(point => {
      ctx.beginPath();
      ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'red';
      ctx.fill();
    });
    
    // Draw overlaps
    issues.overlaps.forEach(overlap => {
      ctx.beginPath();
      ctx.arc(overlap.point.x, overlap.point.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'orange';
      ctx.fill();
    });
    
    // Draw tiles with outside bounds issues
    issues.outsideBounds.forEach(issue => {
      const tile = tiles[issue.tileIndex];
      
      ctx.beginPath();
      
      if (tile.points && tile.points.length > 0) {
        ctx.moveTo(tile.points[0].x, tile.points[0].y);
        
        for (let i = 1; i < tile.points.length; i++) {
          ctx.lineTo(tile.points[i].x, tile.points[i].y);
        }
        
        ctx.closePath();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
    
    // Draw all vertices
    tiles.forEach(tile => {
      if (!tile.points) return;
      
      tile.points.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
      });
    });
    
    // Display validation statistics
    ctx.fillStyle = 'white';
    ctx.font = '12px sans-serif';
    ctx.fillText(`Gaps: ${issues.gaps.length}`, 20, 30);
    ctx.fillText(`Overlaps: ${issues.overlaps.length}`, 20, 50);
    ctx.fillText(`Bounds issues: ${issues.outsideBounds.length}`, 20, 70);
    ctx.fillText(`Valid: ${validationResult.valid ? 'Yes' : 'No'}`, 20, 90);
  };
  
  // Basic tile rendering function
  function drawTile(ctx, tile) {
    const { points, color } = tile;
    
    if (!points || points.length < 3) return;
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.lineWidth = 0.5;
    ctx.stroke();
  }