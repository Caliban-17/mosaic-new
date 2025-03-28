import React, { useState, useEffect, useRef, useCallback } from 'react';
import './InterlockingMosaic.css';
import BackgroundImage from './BackgroundImage';
import SoundUtils from '../utils/SoundUtils';
import { throttle } from 'lodash';

// Function to generate polygon vertices - more varied than just hexagons
const generatePolygonVertices = (centerX, centerY, size, sides = 6, rotation = 0, irregularity = 0.3) => {
  return Array.from({ length: sides }, (_, i) => {
    const radiusVariation = 1 - (irregularity * Math.random());
    const angle = i * (2 * Math.PI / sides) + rotation;
    return {
      x: centerX + size * radiusVariation * Math.cos(angle),
      y: centerY + size * radiusVariation * Math.sin(angle)
    };
  });
};

// Function to generate a dense grid of positions for irregular polygons
const generateDenseGrid = (width, height, targetCount = 1000) => {
  const positions = [];
  
  // Calculate a base size to achieve approximately the target number
  const divisions = Math.sqrt(targetCount * 0.65); // Adjusted factor for better density
  const baseSize = Math.min(width, height) / (divisions * 0.85);
  
  // Create initial grid with specified density
  const cols = Math.ceil(width / (baseSize * 0.65)); // Tighter spacing for more tiles
  const rows = Math.ceil(height / (baseSize * 0.65));
  
  // Preset colors for better color harmony - using the colors from the screenshot
  const colors = [
    '#ff5252', '#ff9800', '#ffeb3b', '#4caf50', '#2196f3', // Red, Orange, Yellow, Green, Blue
    '#9c27b0', '#673ab7', '#3f51b5', '#03a9f4', '#00bcd4', // Purple, Indigo, More blues
    '#009688', '#8bc34a', '#cddc39', '#ffc107', '#ff5722', // Teal, Light green, Lime, Amber, Deep Orange
    '#f44336', '#e91e63', '#9e9e9e', '#607d8b', '#795548'  // More Red, Pink, Grey, Blue Grey, Brown
  ];
  
  // Generate initial positions
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      // Calculate base position with slight offset for odd rows
      const x = col * baseSize * 0.65 + ((row % 2) * baseSize * 0.3);
      const y = row * baseSize * 0.65;
      
      // Add randomness to position and size
      const jitterX = (Math.random() - 0.5) * baseSize * 0.3;
      const jitterY = (Math.random() - 0.5) * baseSize * 0.3;
      
      // More natural size variation with Gaussian-like distribution
      const gaussian = () => ((Math.random() + Math.random() + Math.random()) / 3);
      const sizeVariation = 0.4 + gaussian() * 0.6; // 40% to 100% of base size
      const adjustedSize = baseSize * sizeVariation;
      
      // Randomly select number of sides with weighted distribution
      const sidesProbability = Math.random();
      const sides = sidesProbability < 0.6 ? 6 : // 60% hexagons
                 sidesProbability < 0.8 ? 5 : // 20% pentagons
                 sidesProbability < 0.9 ? 4 : // 10% squares
                 Math.floor(Math.random() * 3) + 7; // 10% 7-9 sides
      
      // Randomize rotation
      const rotation = Math.random() * Math.PI;
      
      // Create color clusters for a more aesthetic layout (tiles near each other have similar colors)
      const colorIndex = Math.floor(
        (Math.sin(x * 0.05) + Math.cos(y * 0.05) + 2) / 4 * colors.length
      );
      
      positions.push({
        x: x + jitterX,
        y: y + jitterY,
        size: adjustedSize,
        sides,
        rotation,
        // Make some tiles have children (white dots) - about 40%
        hasChildren: Math.random() < 0.4,
        color: colors[colorIndex % colors.length]
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
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const isInitialized = useRef(false);
  const animFrameRef = useRef(null);
  
  // Initialize and render the mosaic
  useEffect(() => {
    const renderMosaic = () => {
      if (!containerRef.current || !canvasRef.current) return;
      
      const container = containerRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Set canvas size with device pixel ratio for sharper rendering
      const dpr = window.devicePixelRatio || 1;
      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;
      
      // Set proper CSS dimensions
      canvas.style.width = `${container.clientWidth}px`;
      canvas.style.height = `${container.clientHeight}px`;
      
      // Scale canvas context for high DPI displays
      ctx.scale(dpr, dpr);
      
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      
      // Set background color
      ctx.fillStyle = '#13192a';
      ctx.fillRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      
      setIsLoading(true);
      
      // Generate tiles directly without waiting for background image
      generateAndDrawTiles(ctx, canvas.width / dpr, canvas.height / dpr);
    };
    
    // Function to generate and draw tiles
    const generateAndDrawTiles = (ctx, width, height) => {
      // Generate a large number of varied, colorful tiles that completely fill the canvas
      const positions = generateDenseGrid(
        width,
        height,
        viewType === 'main' ? 2380 : // Match screenshot tile count
        viewType === 'splinters' ? 1200 : // Fewer in splinters
        700 // Even fewer in fragments
      );
      
      // Create tiles data
      const tileData = positions.map((pos, index) => {
        return {
          id: `${viewType}-${index}`,
          x: pos.x,
          y: pos.y,
          size: pos.size,
          sides: pos.sides,
          rotation: pos.rotation,
          color: pos.color,
          hasChildren: pos.hasChildren && (
            // Fewer clickable items in deeper levels
            viewType === 'fragments' ? Math.random() < 0.3 : true
          ),
          points: generatePolygonVertices(
            pos.x, pos.y, pos.size, 
            pos.sides, pos.rotation, 
            0.2 + Math.random() * 0.3 // Irregularity for varied shapes
          )
        };
      });
      
      // Draw each tile - FULLY OPAQUE to match screenshot
      tileData.forEach(tile => {
        drawPolygonTile(ctx, tile);
      });
      
      // Store tile data for interaction
      setTiles(tileData);
      setIsLoading(false);
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
      
      // Add white dot in center for tiles with children - match screenshot style
      if (tile.hasChildren) {
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(tile.x, tile.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    
    // Only initialize once
    if (!isInitialized.current) {
      renderMosaic();
      isInitialized.current = true;
    }
    
    // Handle window resize with debounce
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
  }, [viewType]);
  
  // Handle clicks on the mosaic with throttling
  const handleCanvasClick = useCallback(
    throttle((event) => {
      if (!canvasRef.current || tiles.length === 0 || isShattered) return;
      
      // Get click coordinates relative to canvas
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      // Adjust coordinates for high DPI displays
      const x = (event.clientX - rect.left);
      const y = (event.clientY - rect.top);
      
      // Find which tile was clicked using efficient collision detection
      const clickedTile = tiles.find(tile => {
        return isPointInPolygon(x, y, tile.points);
      });
      
      if (clickedTile) {
        setSelectedTile(clickedTile);
        
        if (clickedTile.hasChildren) {
          // Play sound and trigger shatter animation
          SoundUtils.play(viewType === 'main' ? 'shatter' : 'click');
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
          SoundUtils.play('click');
          if (onTileClick) {
            onTileClick(clickedTile);
          }
        }
      }
    }, 300, { leading: true, trailing: false }),
    [tiles, onTileClick, isShattered, viewType]
  );
  
  // Optimized point-in-polygon check using ray casting algorithm
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
    const dpr = window.devicePixelRatio || 1;
    
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
      
      // Clear the original tile area with padding
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
      aria-label={`${viewType} visualization`}
    >
      {/* Background Image Component */}
      <BackgroundImage />
      
      {isLoading && (
        <div className="loading-spinner-container">
          <div className="loading-spinner"></div>
          <p>Generating mosaic...</p>
        </div>
      )}
      
      <canvas 
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="mosaic-canvas"
        aria-label="Interactive mosaic canvas"
      />
      
      {/* Status indicator matching the screenshot */}
      <div className="mosaic-status" aria-live="polite">
        <div className="status-label">
          {viewType === 'main' ? 'Main Mosaic' : 
          viewType === 'splinters' ? 'Splinters' : 'Fragments'}
        </div>
        <div className="tile-count">{tiles.length} tiles</div>
      </div>
    </div>
  );
};

export default InterlockingMosaic;