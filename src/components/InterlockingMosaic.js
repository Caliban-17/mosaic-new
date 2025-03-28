import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './InterlockingMosaic.css';
import SoundUtils from '../utils/SoundUtils';
import { throttle } from 'lodash';

// Main component
const InterlockingMosaic = ({ 
  onTileClick,
  depth = 0, 
  viewType = 'main'
}) => {
  const [tiles, setTiles] = useState([]);
  const [selectedTile, setSelectedTile] = useState(null);
  const [isShattered, setIsShattered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageData, setImageData] = useState(null);
  const [focusMode, setFocusMode] = useState(false);
  const [focusArea, setFocusArea] = useState(null);
  
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const isInitialized = useRef(false);
  const animFrameRef = useRef(null);
  
  // Load the source image for the mosaic
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Enable CORS for the image
    img.onload = () => {
      console.log("Source image loaded successfully");
      setImageLoaded(true);
      imageRef.current = img;
      
      // Get image data
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      
      // Set canvas to image dimensions
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      
      // Draw the image to the canvas
      tempCtx.drawImage(img, 0, 0);
      
      // Get the image data
      setImageData(tempCtx.getImageData(0, 0, img.width, img.height));
    };
    
    img.onerror = (err) => {
      console.error("Failed to load source image:", err);
    };
    
    // Set source to the image in the public folder
    img.src = '/images/lady-liberty.jpeg';
  }, []);
  
  // Enhanced color sampling with improved fidelity and balance
  const sampleColor = useCallback((x, y, width, height) => {
    if (!imageData) return "rgb(100, 100, 100)"; // Default gray if no image data
    
    // Map canvas coordinates to image coordinates
    const imgX = Math.floor((x / width) * imageData.width);
    const imgY = Math.floor((y / height) * imageData.height);
    
    // Use a larger area sampling for better color representation
    const sampleSize = 7; // Sample a 7x7 pixel area for smoother transitions
    const halfSample = Math.floor(sampleSize / 2);
    
    let r = 0, g = 0, b = 0;
    let totalWeight = 0;
    
    // Sample the area with weighted average
    for (let offsetY = -halfSample; offsetY <= halfSample; offsetY++) {
      for (let offsetX = -halfSample; offsetX <= halfSample; offsetX++) {
        const sampleX = imgX + offsetX;
        const sampleY = imgY + offsetY;
        
        // Ensure we're within image bounds
        if (sampleX >= 0 && sampleX < imageData.width && 
            sampleY >= 0 && sampleY < imageData.height) {
          
          const pos = (sampleY * imageData.width + sampleX) * 4;
          
          // Apply weighted sampling (center pixels count more)
          const distance = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
          const weight = 1 - (distance / (halfSample + 1));
          
          r += imageData.data[pos] * weight;
          g += imageData.data[pos + 1] * weight;
          b += imageData.data[pos + 2] * weight;
          totalWeight += weight;
        }
      }
    }
    
    // Calculate the weighted average color
    if (totalWeight > 0) {
      r = Math.round(r / totalWeight);
      g = Math.round(g / totalWeight);
      b = Math.round(b / totalWeight);
    }
    
    // Apply a classical painting enhancement
    const enhanceColor = (value) => {
      // Enhance contrast slightly
      const contrast = 1.15; 
      const enhanced = ((value / 255 - 0.5) * contrast + 0.5) * 255;
      return Math.min(255, Math.max(0, enhanced));
    };
    
    r = enhanceColor(r);
    g = enhanceColor(g);
    b = enhanceColor(b);
    
    // Return color as CSS color string
    return `rgb(${r}, ${g}, ${b})`;
  }, [imageData]);
  
  // Generate a regular grid-based mosaic with guaranteed no overlaps
  const generateMosaic = useCallback((width, height, desiredTileCount) => {
    // Basic rectangular grid approach with irregular distortions
    // This guarantees no overlaps mathematically

    // For our approach, we'll first create a regular grid and then apply controlled distortions
    // while maintaining the topological structure
    
    // Calculate appropriate grid dimensions
    const aspectRatio = width / height;
    const gridRows = Math.round(Math.sqrt(desiredTileCount / aspectRatio));
    const gridCols = Math.round(gridRows * aspectRatio);
    
    // Calculate cell dimensions
    const cellWidth = width / gridCols;
    const cellHeight = height / gridRows;
    
    // Create the initial grid of quads
    const quads = [];
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        // Base positions for the corners of this grid cell
        const x0 = col * cellWidth;
        const y0 = row * cellHeight;
        const x1 = (col + 1) * cellWidth;
        const y1 = (row + 1) * cellHeight;
        
        // Determine if we want this to be irregular (most cells will be)
        const makeIrregular = Math.random() < 0.85;
        
        if (makeIrregular) {
          // Subdivide into a varied number of irregular polygons
          const subdivisions = 1 + Math.floor(Math.random() * 3); // 1-3 subdivisions
          
          // Create subdivision within this cell
          for (let s = 0; s < subdivisions; s++) {
            // Controlled jitter - keeping within the cell
            const jitterLimit = 0.3; // Limit to 30% of cell size
            const jitterX0 = Math.random() * jitterLimit * cellWidth;
            const jitterY0 = Math.random() * jitterLimit * cellHeight;
            const jitterX1 = Math.random() * jitterLimit * cellWidth;
            const jitterY1 = Math.random() * jitterLimit * cellHeight;
            
            // Random position within the cell for subdivision
            const fracX = s / subdivisions + (1 / subdivisions) * Math.random();
            const fracY = s / subdivisions + (1 / subdivisions) * Math.random();
            
            // Create a polygon with irregular but controlled shape
            // The exact shape depends on the subdivision
            let points;
            
            if (subdivisions === 1) {
              // For single subdivision, create an irregular quad
              points = [
                { x: x0 + jitterX0, y: y0 + jitterY0 },
                { x: x1 - jitterX1, y: y0 + jitterY1 },
                { x: x1 - jitterX0, y: y1 - jitterY0 },
                { x: x0 + jitterX1, y: y1 - jitterY1 }
              ];
            } else {
              // For multiple subdivisions, create varied shapes
              if (s === 0) {
                // First subdivision - top section
                points = [
                  { x: x0 + jitterX0, y: y0 + jitterY0 },
                  { x: x1 - jitterX1, y: y0 + jitterY1 },
                  { x: x0 + cellWidth * fracX, y: y0 + cellHeight * fracY },
                ];
              } else if (s === subdivisions - 1) {
                // Last subdivision - bottom section
                points = [
                  { x: x0 + cellWidth * fracX, y: y0 + cellHeight * fracY },
                  { x: x1 - jitterX0, y: y1 - jitterY0 },
                  { x: x0 + jitterX1, y: y1 - jitterY1 }
                ];
              } else {
                // Middle subdivisions - create varied polygons
                const prevX = x0 + cellWidth * (s / subdivisions);
                const prevY = y0 + cellHeight * (s / subdivisions);
                const nextX = x0 + cellWidth * ((s + 1) / subdivisions);
                const nextY = y0 + cellHeight * ((s + 1) / subdivisions);
                
                points = [
                  { x: prevX, y: prevY },
                  { x: nextX + jitterX0, y: prevY + jitterY0 },
                  { x: nextX - jitterX1, y: nextY - jitterY1 },
                  { x: prevX + jitterX1, y: nextY + jitterY0 }
                ];
              }
            }
            
            // Add more vertices randomly for variety
            if (Math.random() < 0.7 && points.length > 3) {
              const randomSideIndex = Math.floor(Math.random() * points.length);
              const p1 = points[randomSideIndex];
              const p2 = points[(randomSideIndex + 1) % points.length];
              
              // Add a point along this edge
              const t = 0.3 + Math.random() * 0.4; // Position along edge (30-70%)
              const newPoint = {
                x: p1.x + t * (p2.x - p1.x),
                y: p1.y + t * (p2.y - p1.y)
              };
              
              // Add jitter perpendicular to the edge
              const edgeLength = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
              const perpScale = 0.1 * edgeLength; // 10% of edge length
              
              // Calculate perpendicular vector
              const edgeX = p2.x - p1.x;
              const edgeY = p2.y - p1.y;
              const perpX = -edgeY;
              const perpY = edgeX;
              
              // Normalize and scale perpendicular vector
              const perpLength = Math.sqrt(perpX * perpX + perpY * perpY);
              if (perpLength > 0) {
                const jitterPerpAmount = (Math.random() - 0.5) * perpScale;
                newPoint.x += (perpX / perpLength) * jitterPerpAmount;
                newPoint.y += (perpY / perpLength) * jitterPerpAmount;
              }
              
              // Insert the new point
              points.splice(randomSideIndex + 1, 0, newPoint);
            }
            
            // Calculate centroid for proper color sampling
            const centroid = calculateCentroid(points);
            
            // Make sure the centroid is valid
            if (!isNaN(centroid.x) && !isNaN(centroid.y)) {
              // Create the polygon/tile
              quads.push({
                points: points,
                x: centroid.x,
                y: centroid.y,
                row, 
                col,
                subdivision: s
              });
            }
          }
        } else {
          // Regular cell - just a simple quadrilateral
          const points = [
            { x: x0, y: y0 },
            { x: x1, y: y0 },
            { x: x1, y: y1 },
            { x: x0, y: y1 }
          ];
          
          quads.push({
            points: points,
            x: (x0 + x1) / 2,
            y: (y0 + y1) / 2,
            row,
            col,
            subdivision: 0
          });
        }
      }
    }
    
    // Calculate centroid of a polygon
    function calculateCentroid(points) {
      if (!points || points.length < 3) {
        return { x: 0, y: 0 }; // Default for invalid polygons
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
    
    // Create final tiles with colors
    const tiles = quads.map((quad, index) => {
      // Only sample color if the centroid is within canvas bounds
      const x = Math.min(Math.max(0, quad.x), width);
      const y = Math.min(Math.max(0, quad.y), height);
      
      // Get color from the image
      const color = sampleColor(x, y, width, height);
      
      // Create tile with all necessary properties
      return {
        id: `${viewType}-${index}`,
        x: quad.x,
        y: quad.y,
        points: quad.points,
        color: color,
        hasChildren: Math.random() < 0.4 && (viewType !== 'fragments' || Math.random() < 0.3)
      };
    });
    
    return tiles;
  }, [viewType, sampleColor]);
  
  // Initialize and render the mosaic
  useEffect(() => {
    // Only proceed once the image is loaded
    if (!imageLoaded) return;
    
    const renderMosaic = () => {
      if (!containerRef.current || !canvasRef.current) return;
      
      const container = containerRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Set canvas size with device pixel ratio for sharper rendering
      const devicePixelRatio = window.devicePixelRatio || 1;
      canvas.width = container.clientWidth * devicePixelRatio;
      canvas.height = container.clientHeight * devicePixelRatio;
      
      // Set proper CSS dimensions
      canvas.style.width = `${container.clientWidth}px`;
      canvas.style.height = `${container.clientHeight}px`;
      
      // Scale canvas context for high DPI displays
      ctx.scale(devicePixelRatio, devicePixelRatio);
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width / devicePixelRatio, canvas.height / devicePixelRatio);
      
      // Set background color
      ctx.fillStyle = '#13192a';
      ctx.fillRect(0, 0, canvas.width / devicePixelRatio, canvas.height / devicePixelRatio);
      
      setIsLoading(true);
      
      // Generate tiles based on view type - adjust count as needed
      const baseTileCount = viewType === 'main' ? 1000 : 
                           viewType === 'splinters' ? 2000 : 
                           3000;
      
      // Generate the mosaic
      const generatedTiles = generateMosaic(
        canvas.width / devicePixelRatio, 
        canvas.height / devicePixelRatio,
        baseTileCount
      );
      
      // Draw each tile
      generatedTiles.forEach(tile => {
        drawTile(ctx, tile);
      });
      
      // Store tiles for interaction
      setTiles(generatedTiles);
      setIsLoading(false);
    };
    
    // Draw a single tile
    const drawTile = (ctx, tile) => {
      const { points, color } = tile;
      
      if (!points || points.length < 3) return; // Skip invalid tiles
      
      // Enable anti-aliasing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw polygon
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      
      ctx.closePath();
      
      // Fill with sampled color
      ctx.fillStyle = color;
      ctx.fill();
      
      // Add very thin border for definition
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    };
    
    // Only initialize once the image is loaded
    if (imageLoaded && !isInitialized.current) {
      renderMosaic();
      isInitialized.current = true;
    }
    
    // Handle window resize
    const handleResize = throttle(() => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      
      animFrameRef.current = requestAnimationFrame(() => {
        isInitialized.current = false; // Force re-initialization
        renderMosaic();
      });
    }, 200);
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [imageLoaded, viewType, generateMosaic]);
  
  // Point-in-polygon check for tile click detection
  const isPointInPolygon = (x, y, points) => {
    if (!points || points.length < 3) return false;
    
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x;
      const yi = points[i].y;
      const xj = points[j].x;
      const yj = points[j].y;
      
      const intersect = ((yi > y) !== (yj > y)) &&
        (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        
      if (intersect) inside = !inside;
    }
    
    return inside;
  };
  
  // Focus mode implementation
  const toggleFocusMode = useCallback((area = null) => {
    if (!area) {
      setFocusMode(false);
      setFocusArea(null);
      return;
    }
    
    setFocusMode(true);
    setFocusArea(area);
  }, []);
  
  // Handle clicks on the mosaic
  const handleCanvasClick = useCallback(
    throttle((event) => {
      if (!canvasRef.current || tiles.length === 0 || isShattered) return;
      
      // Get click coordinates
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left);
      const y = (event.clientY - rect.top);
      
      // Find clicked tile
      const clickedTile = tiles.find(tile => isPointInPolygon(x, y, tile.points));
      
      if (clickedTile) {
        setSelectedTile(clickedTile);
        
        // Check for double-click to toggle focus mode
        if (selectedTile && selectedTile.id === clickedTile.id && event.detail === 2) {
          toggleFocusMode(focusMode ? null : {
            x: clickedTile.x,
            y: clickedTile.y,
            radius: 200
          });
          return;
        }
        
        if (clickedTile.hasChildren) {
          setIsShattered(true);
          SoundUtils.play(viewType === 'main' ? 'shatter' : 'click');
          
          // Animate shatter effect
          const ctx = canvas.getContext('2d');
          animateShatter(ctx, clickedTile);
          
          // After animation, call the parent handler
          setTimeout(() => {
            setIsShattered(false);
            if (onTileClick) {
              onTileClick(clickedTile);
            }
          }, 1000);
        } else {
          // Show details for tiles without children
          SoundUtils.play('click');
          if (onTileClick) {
            onTileClick(clickedTile);
          }
        }
      }
    }, 300),
    [tiles, onTileClick, isShattered, viewType, selectedTile, focusMode, toggleFocusMode]
  );
  
  // Animate tile shattering
  const animateShatter = (ctx, tile) => {
    const { points, color, x: centerX, y: centerY } = tile;
    const shatterPieces = [];
    
    // Create shatter pieces using triangulation
    if (points && points.length >= 3) {
      // Create triangular pieces radiating from center
      for (let i = 0; i < points.length; i++) {
        const p1 = points[i];
        const p2 = points[(i + 1) % points.length];
        
        // Create triangle from center to edge
        const piece = [
          { x: centerX, y: centerY },
          { x: p1.x, y: p1.y },
          { x: p2.x, y: p2.y }
        ];
        
        // Random translation for animation
        const translateX = (Math.random() - 0.5) * 200;
        const translateY = (Math.random() - 0.5) * 200;
        const rotation = Math.random() * Math.PI * 2;
        
        shatterPieces.push({
          points: piece,
          color,
          translateX,
          translateY,
          rotation,
          opacity: 1
        });
      }
    }
    
    // Animate the shatter pieces
    let startTime = null;
    const duration = 1000; // 1 second
    
    const animateFrame = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Clear the original tile area
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      
      if (points && points.length > 0) {
        ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
      }
      
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      
      // Draw each shatter piece with animation
      shatterPieces.forEach(piece => {
        ctx.save();
        
        // Apply transformations
        ctx.translate(
          centerX + piece.translateX * progress,
          centerY + piece.translateY * progress
        );
        ctx.rotate(piece.rotation * progress);
        ctx.translate(-centerX, -centerY);
        
        // Set opacity
        ctx.globalAlpha = 1 - progress;
        
        // Draw piece
        ctx.beginPath();
        
        if (piece.points && piece.points.length > 0) {
          ctx.moveTo(piece.points[0].x, piece.points[0].y);
          
          for (let i = 1; i < piece.points.length; i++) {
            ctx.lineTo(piece.points[i].x, piece.points[i].y);
          }
        }
        
        ctx.closePath();
        ctx.fillStyle = piece.color;
        ctx.fill();
        
        // Add thin inner stroke
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
        
        ctx.restore();
      });
      
      // Continue animation if not complete
      if (progress < 1) {
        requestAnimationFrame(animateFrame);
      }
    };
    
    requestAnimationFrame(animateFrame);
  };
  
  // Handle hover effects
  const handleCanvasHover = useCallback(
    throttle((event) => {
      if (!canvasRef.current || tiles.length === 0 || isShattered) return;
      
      // Get coordinates relative to canvas
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left);
      const y = (event.clientY - rect.top);
      
      // Find hovered tile
      const hoveredTile = tiles.find(tile => isPointInPolygon(x, y, tile.points));
      
      if (hoveredTile) {
        canvas.style.cursor = 'pointer';
      } else {
        canvas.style.cursor = 'default';
      }
    }, 50),
    [tiles, isShattered]
  );

  // Focus mode toggle button
  const focusButton = useMemo(() => (
    viewType === 'main' && (
      <button 
        className={`focus-toggle ${focusMode ? 'active' : ''}`}
        onClick={() => toggleFocusMode(focusMode ? null : { x: window.innerWidth/2, y: window.innerHeight/2, radius: 300 })}
        aria-label={focusMode ? "Exit focus mode" : "Enter focus mode"}
        title={focusMode ? "Exit Focus Mode" : "Focus Mode"}
      >
        🔍
      </button>
    )
  ), [viewType, focusMode, toggleFocusMode]);

  return (
    <div 
      className={`interlocking-mosaic ${isShattered ? 'shattered' : ''} ${viewType} ${focusMode ? 'focus-mode' : ''}`}
      ref={containerRef}
      aria-label={`${viewType} visualization`}
    >
      {isLoading && (
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
          <p>{imageLoaded ? 'Generating mosaic...' : 'Loading image...'}</p>
        </div>
      )}
      
      <canvas 
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasHover}
        className="mosaic-canvas"
        aria-label="Interactive mosaic canvas"
      />
      
      {/* Status indicator */}
      <div className="mosaic-status" aria-live="polite">
        <div className="status-label">
          {viewType === 'main' ? 'Main Mosaic' : 
          viewType === 'splinters' ? 'Splinters' : 'Fragments'}
        </div>
        <div className="tile-count">{tiles.length} tiles</div>
      </div>
      
      {/* Focus mode toggle button */}
      {focusButton}
      
      {/* Focus mode instructions */}
      {focusMode && (
        <div className="focus-instructions">
          <p>Double-click on a tile to zoom in. Click the focus button to exit.</p>
        </div>
      )}
    </div>
  );
};

export default InterlockingMosaic;