import React, { useState, useEffect, useRef, useCallback } from 'react';
import './InterlockingMosaic.css';
import SoundUtils from '../utils/SoundUtils';
import { throttle } from 'lodash';

// Function to generate polygon vertices - more varied than just hexagons
const generatePolygonVertices = (centerX, centerY, size, sides = 6, rotation = 0, irregularity = 0.3) => {
  const vertices = [];
  const angleStep = (2 * Math.PI) / sides;
  
  for (let i = 0; i < sides; i++) {
    // Add irregularity to the radius for each vertex
    const radiusVariation = 1 - (irregularity * Math.random());
    const angle = i * angleStep + rotation;
    
    vertices.push({
      x: centerX + size * radiusVariation * Math.cos(angle),
      y: centerY + size * radiusVariation * Math.sin(angle)
    });
  }
  
  return vertices;
};

// Function to generate a dense grid of positions for irregular polygons
const generateDenseGrid = (width, height, targetCount = 1000) => {
  const positions = [];
  
  // Calculate a base size to achieve approximately the target number
  // Adjusted formula to generate closer to 1000 tiles
  const divisions = Math.sqrt(targetCount * 0.6); // Factor adjusted for higher density
  const baseSize = Math.min(width, height) / (divisions * 0.85);
  
  // Create initial grid with specified density
  const cols = Math.ceil(width / (baseSize * 0.7)); // Reduced spacing for more tiles
  const rows = Math.ceil(height / (baseSize * 0.7)); // Reduced spacing for more tiles
  
  // Generate initial positions
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Calculate base position with slight offset for odd rows
      const x = col * baseSize * 0.7 + ((row % 2) * baseSize * 0.3);
      const y = row * baseSize * 0.7;
      
      // Add randomness to position and size
      const jitterX = (Math.random() - 0.5) * baseSize * 0.3;
      const jitterY = (Math.random() - 0.5) * baseSize * 0.3;
      
      // Vary the tile size more dramatically but make them smaller overall
      const sizeVariation = 0.4 + Math.random() * 0.7; // 40% to 110% of base size
      const adjustedSize = baseSize * sizeVariation;
      
      // Randomly select number of sides (4-8) with higher probability for hexagons
      const sidesProbability = Math.random();
      const sides = sidesProbability < 0.6 ? 6 : // 60% hexagons
                 sidesProbability < 0.8 ? 5 : // 20% pentagons
                 sidesProbability < 0.9 ? 4 : // 10% squares
                 Math.floor(Math.random() * 3) + 7; // 10% 7-9 sides
      
      // Randomize rotation
      const rotation = Math.random() * Math.PI;
      
      positions.push({
        x: x + jitterX,
        y: y + jitterY,
        size: adjustedSize,
        sides,
        rotation,
        // Make some tiles have children (white dots) - about 40%
        hasChildren: Math.random() < 0.4
      });
    }
  }
  
  return positions;
};

const InterlockingMosaic = ({ 
  onTileClick,
  depth = 0, 
  viewType = 'main'
}) => {
  const [tiles, setTiles] = useState([]);
  const [selectedTile, setSelectedTile] = useState(null);
  const [isShattered, setIsShattered] = useState(false);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const isInitialized = useRef(false);
  const animFrameRef = useRef(null);
  
  // Generate random colors for tiles
  const getRandomColor = () => {
    const colors = [
      '#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', // Bright
      '#1abc9c', '#d35400', '#c0392b', '#16a085', '#8e44ad', // Dark
      '#27ae60', '#2980b9', '#f1c40f', '#e67e22', '#34495e'  // Mixed
    ];
    
    return colors[Math.floor(Math.random() * colors.length)];
  };
  
  // Initialize and render the mosaic
  useEffect(() => {
    const renderMosaic = () => {
      if (!containerRef.current || !canvasRef.current) return;
      
      const container = containerRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Set canvas size
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Set background color
      ctx.fillStyle = '#13192a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      console.log("LOADING BACKGROUND IMAGE");
      
      // Load background image - try in public directory
      const backgroundImage = new Image();
      backgroundImage.crossOrigin = "Anonymous";
      backgroundImage.src = 'lady-liberty.jpeg'; // Direct path as in public dir
      
      // Function to generate and draw tiles
      const generateColorfulTiles = () => {
        // Generate a large number of varied, colorful tiles that completely fill the canvas
        const positions = generateDenseGrid(canvas.width, canvas.height, 1000); // Target 1000+ tiles
        
        // Bright, vibrant colors like in the screenshot
        const colors = [
          '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c', // Red, Orange, Yellow, Green, Teal
          '#3498db', '#2980b9', '#9b59b6', '#8e44ad', '#34495e', // Blue, Purple, Dark
          '#16a085', '#27ae60', '#f39c12', '#d35400', '#c0392b', // More variations
          '#7f8c8d', '#badc58', '#6ab04c', '#eb4d4b', '#f0932b'  // Additional colors
        ];
        
        // Create tiles data
        const tileData = positions.map((pos, index) => {
          return {
            id: `tile-${index}`,
            x: pos.x,
            y: pos.y,
            size: pos.size,
            sides: pos.sides,
            rotation: pos.rotation,
            color: colors[Math.floor(Math.random() * colors.length)],
            hasChildren: pos.hasChildren,
            points: generatePolygonVertices(
              pos.x, pos.y, pos.size, 
              pos.sides, pos.rotation, 
              0.2 + Math.random() * 0.3 // More irregularity for varied shapes
            )
          };
        });
        
        // Draw each tile - FULLY OPAQUE to match screenshot
        tileData.forEach(tile => {
          drawPolygonTile(ctx, tile);
        });
        
        // Store tile data for interaction
        setTiles(tileData);
      };
      
      const drawPolygonTile = (ctx, tile) => {
        const { points, color } = tile;
        
        // Draw polygon
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i].x, points[i].y);
        }
        
        ctx.closePath();
        
        // Fill with tile color - FULLY OPAQUE
        ctx.fillStyle = color;
        ctx.fill();
        
        // Add highlight dot in center for tiles with children (small white dot)
        if (tile.hasChildren) {
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(tile.x, tile.y, 3, 0, Math.PI * 2); // Smaller dot like in screenshot
          ctx.fill();
        }
      };
      
      // Try to draw background image, then tiles on top
      backgroundImage.onload = () => {
        console.log("Background image loaded successfully");
        // Draw image with subtle opacity
        ctx.globalAlpha = 0.15; // Very subtle background
        
        // Draw to fit canvas maintaining aspect ratio
        const imgRatio = backgroundImage.width / backgroundImage.height;
        const canvasRatio = canvas.width / canvas.height;
        
        let drawWidth, drawHeight, offsetX, offsetY;
        
        if (imgRatio > canvasRatio) {
          drawHeight = canvas.height;
          drawWidth = drawHeight * imgRatio;
          offsetX = (canvas.width - drawWidth) / 2;
          offsetY = 0;
        } else {
          drawWidth = canvas.width;
          drawHeight = drawWidth / imgRatio;
          offsetX = 0;
          offsetY = (canvas.height - drawHeight) / 2;
        }
        
        ctx.drawImage(backgroundImage, offsetX, offsetY, drawWidth, drawHeight);
        ctx.globalAlpha = 1;
        
        // Now draw tiles ON TOP of the background
        generateColorfulTiles();
      };
      
      // Even if image fails to load, still generate tiles
      backgroundImage.onerror = () => {
        console.warn('Background image failed to load, trying fallback element');
        generateColorfulTiles();
      };
    };
    
    // Only initialize once
    if (!isInitialized.current) {
      renderMosaic();
      isInitialized.current = true;
    }
    
    // Handle window resize
    const handleResize = () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      
      animFrameRef.current = requestAnimationFrame(() => {
        isInitialized.current = false; // Force re-initialization
        renderMosaic();
      });
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);
  
  // Handle clicks on the mosaic with throttling
  const handleCanvasClick = useCallback(
    throttle((event) => {
      if (!canvasRef.current || tiles.length === 0) return;
      
      // Get click coordinates relative to canvas
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      // Find which tile was clicked
      const clickedTile = tiles.find(tile => {
        return isPointInPolygon(x, y, tile.points);
      });
      
      if (clickedTile) {
        setSelectedTile(clickedTile);
        
        if (clickedTile.hasChildren) {
          // Play sound and trigger shatter animation
          SoundUtils.play('shatter');
          setIsShattered(true);
          
          // Animate shatter
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
          // Just show details for tiles without children
          if (onTileClick) {
            onTileClick(clickedTile);
          }
        }
      }
    }, 300, { leading: true, trailing: false }),
    [tiles, onTileClick]
  );
  
  // Check if a point is inside a polygon
  const isPointInPolygon = (x, y, points) => {
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
  
  // Animate the shattering of a tile
  const animateShatter = (ctx, tile) => {
    const { points, color } = tile;
    const shatterPieces = [];
    
    // Create shatter pieces
    for (let i = 0; i < 8; i++) {
      // Create a smaller polygon based on the original
      const scale = 0.3 + Math.random() * 0.4; // 30% to 70% of original size
      const centerX = tile.x;
      const centerY = tile.y;
      
      const scaledPoints = points.map(p => ({
        x: centerX + (p.x - centerX) * scale,
        y: centerY + (p.y - centerY) * scale
      }));
      
      // Random translation for animation
      const translateX = (Math.random() - 0.5) * 200;
      const translateY = (Math.random() - 0.5) * 200;
      const rotation = Math.random() * Math.PI * 2;
      
      shatterPieces.push({
        points: scaledPoints,
        color,
        translateX,
        translateY,
        rotation,
        opacity: 1
      });
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
      ctx.moveTo(points[0].x, points[0].y);
      
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      
      // Draw each shatter piece with animation
      shatterPieces.forEach(piece => {
        ctx.save();
        
        // Apply transformations
        ctx.translate(
          tile.x + piece.translateX * progress,
          tile.y + piece.translateY * progress
        );
        ctx.rotate(piece.rotation * progress);
        ctx.translate(-tile.x, -tile.y);
        
        // Set opacity
        ctx.globalAlpha = 1 - progress;
        
        // Draw piece
        ctx.beginPath();
        ctx.moveTo(piece.points[0].x, piece.points[0].y);
        
        for (let i = 1; i < piece.points.length; i++) {
          ctx.lineTo(piece.points[i].x, piece.points[i].y);
        }
        
        ctx.closePath();
        ctx.fillStyle = piece.color;
        ctx.fill();
        
        ctx.restore();
      });
      
      // Continue animation if not complete
      if (progress < 1) {
        requestAnimationFrame(animateFrame);
      }
    };
    
    requestAnimationFrame(animateFrame);
  };

  return (
    <div 
      className={`interlocking-mosaic ${isShattered ? 'shattered' : ''} ${viewType}`}
      ref={containerRef}
    >
      <canvas 
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="mosaic-canvas"
      />
      
      {/* Back button matching the screenshot */}
      {viewType !== 'main' && (
        <button className="mosaic-back-button">
          ← Back
        </button>
      )}
      
      {/* Status indicator matching the screenshot */}
      <div className="mosaic-status">
        <div className="status-label">
          {viewType === 'main' ? 'Main Mosaic' : 
          viewType === 'splinters' ? 'Splinters' : 'Fragments'}
        </div>
        <div className="tile-count">{tiles.length} tiles</div>
      </div>
      
      {/* Fallback image in case canvas rendering fails */}
      <div className="background-fallback">
        <img src="lady-liberty.jpeg" alt="Liberty Leading the People" />
      </div>
    </div>
  );
};

export default InterlockingMosaic;