import React, { useState, useEffect, useRef, useCallback } from 'react';
import { throttle } from 'lodash';
import PropTypes from 'prop-types';
import './InterlockingMosaic.css';

// Import custom hooks
import { useFocusMode } from '../../hooks/useFocusMode';
import { useResponsiveLayout } from '../../hooks/useResponsiveLayout';
import usePanAndZoom from '../../hooks/usePanAndZoom';

// Import utilities
import { createInteractionFeedback, isPointInPolygon } from '../../utils/interactionUtils';
import { createEnhancedAnimations } from '../../utils/animationUtils';
import { 
  generateTessellatedMosaic, 
  validateTessellation, 
  drawTessellationDebug 
} from '../../utils/tessellationUtils';
import SoundUtils from '../../utils/SoundUtils';

// Import sub-components
import MosaicLoader from './MosaicLoader';
import MosaicStatus from './MosaicStatus';
import MosaicControls from './MosaicControls';

// eslint-disable-next-line no-unused-vars
const InterlockingMosaic = ({ 
  onTileClick,
  depth = 0, // eslint-disable-line no-unused-vars
  viewType = 'main',
  parentColor = null // eslint-disable-line no-unused-vars
}) => {
  // State for tiles and interaction
  const [tiles, setTiles] = useState([]);
  const [selectedTile, setSelectedTile] = useState(null);
  const [isShattered, setIsShattered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageData, setImageData] = useState(null);
  const [debugMode, setDebugMode] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  
  // Refs
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const imageRef = useRef(null);
  const isInitialized = useRef(false);
  const animFrameRef = useRef(null);
  
  // Use our custom hooks - removed unused variables
  const {
    focusMode,
    focusScale,
    interactionEnabled,
    initializeFocus,
    exitFocus
  } = useFocusMode();
  
  const { 
    getTileCount
  } = useResponsiveLayout();
  
  const {
    transform
  } = usePanAndZoom(containerRef);
  
  // Create utility functions
  const interactionFeedback = createInteractionFeedback(SoundUtils);
  const { enhancedShatterAnimation } = createEnhancedAnimations();
  
  // Load the source image for the mosaic
  // Load the source image for the mosaic
// Load the source image for the mosaic with fetch verification
// Load the source image for the mosaic - using only external URLs
// Direct replacement for the image loading effect in InterlockingMosaic/index.js
// This uses a completely different approach that should work reliably

// Replace the entire image loading useEffect in InterlockingMosaic/index.js
// This skips trying to load any image and goes straight to using a gradient

// This is a minimal fix that directly creates a simple data array
// Replace the entire useEffect for image loading with this

useEffect(() => {
    console.log("Using direct array data for mosaic colors");
    
    // Create a minimal 10x10 pixel array
    const width = 10;
    const height = 10;
    
    // Create a simple array for image data (RGBA values)
    const array = new Uint8ClampedArray(width * height * 4);
    
    // Fill with a simple pattern
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        
        // Simple color pattern (dark blues and purples)
        array[i] = 20 + x * 5;           // R
        array[i + 1] = 25 + y * 3;       // G
        array[i + 2] = 40 + (x + y) * 2; // B
        array[i + 3] = 255;              // A (fully opaque)
      }
    }
    
    // Create image data from the array
    const imageData = new ImageData(array, width, height);
    
    // Update component state
    setImageLoaded(true);
    setImageData(imageData);
    
    // No need for an image reference anymore
    console.log("Created direct color data for mosaic");
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
    
    // Apply artistic enhancements to make the mosaic more vibrant
    const enhanceColor = (value) => {
      // Enhance contrast slightly
      const contrast = 1.15; 
      const enhanced = ((value / 255 - 0.5) * contrast + 0.5) * 255;
      return Math.min(255, Math.max(0, Math.round(enhanced)));
    };
    
    // Apply enhancements
    r = enhanceColor(r);
    g = enhanceColor(g);
    b = enhanceColor(b);
    
    // Return color as CSS color string
    return `rgb(${r}, ${g}, ${b})`;
  }, [imageData]);
  
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
      
      // Calculate appropriate tile count based on screen size and view type
      const responsiveTileCount = getTileCount(viewType);
      
      // Generate the mosaic using our mathematically validated algorithm
      const generatedTiles = generateTessellatedMosaic(
        canvas.width / devicePixelRatio, 
        canvas.height / devicePixelRatio,
        responsiveTileCount,
        viewType,
        sampleColor
      );
      
      // Validate the tessellation (in debug mode)
      if (debugMode) {
        const result = validateTessellation(
          generatedTiles, 
          canvas.width / devicePixelRatio, 
          canvas.height / devicePixelRatio
        );
        setValidationResult(result);
        
        // Draw debug visualization
        drawTessellationDebug(ctx, generatedTiles, result);
      } else {
        // Normal drawing
        generatedTiles.forEach(tile => {
          drawTile(ctx, tile);
        });
      }
      
      // Store tiles for interaction
      setTiles(generatedTiles);
      setIsLoading(false);
    };
    
    // Draw a single tile
    const drawTile = (ctx, tile) => {
      const { points, color, hasChildren } = tile;
      
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
      
      // Add subtle highlight for interactive tiles (no white dot)
      if (hasChildren) {
        const centerX = tile.x;
        const centerY = tile.y;
        
        // Find approximate radius
        const radius = Math.min(
          Math.max(...points.map(p => Math.abs(p.x - centerX))),
          Math.max(...points.map(p => Math.abs(p.y - centerY)))
        ) * 0.2;
        
        // Subtle glow instead of dot
        const glowGradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, radius
        );
        
        glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
        glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        
        ctx.fillStyle = glowGradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    
    // Only initialize once the image is loaded
    if (imageLoaded && !isInitialized.current) {
      renderMosaic();
      isInitialized.current = true;
      
      // Add keyboard event listener for debug mode toggle
      const handleKeyDown = (e) => {
        if (e.key === 'd' || e.key === 'D') {
          setDebugMode(prev => !prev);
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
    
    // Re-render when debug mode changes
    if (imageLoaded && isInitialized.current && debugMode !== undefined) {
      renderMosaic();
    }
    
    // Handle window resize with an extremely long delay to make it almost static
    const handleResize = throttle(() => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      
      // Only update if resize has completely stopped for a very long time
      animFrameRef.current = requestAnimationFrame(() => {
        isInitialized.current = false; // Force re-initialization
        renderMosaic();
      });
    }, 30000); // Changed to 30000ms (30 seconds) to make it almost static
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [imageLoaded, viewType, sampleColor, debugMode, getTileCount]);
  
  // Handle clicks on the mosaic
  const handleCanvasClick = useCallback(
    throttle((event) => {
      if (!canvasRef.current || tiles.length === 0 || isShattered || !interactionEnabled) return;
      
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
          if (focusMode) {
            exitFocus();
          } else {
            initializeFocus({ x: clickedTile.x, y: clickedTile.y });
          }
          return;
        }
        
        if (clickedTile.hasChildren) {
          setIsShattered(true);
          interactionFeedback(clickedTile, 'shatter');
          
          // Animate shatter effect
          const ctx = canvas.getContext('2d');
          enhancedShatterAnimation(ctx, clickedTile);
          
          // After animation, call the parent handler
          setTimeout(() => {
            setIsShattered(false);
            if (onTileClick) {
              onTileClick(clickedTile);
            }
          }, 1000);
        } else {
          // Show details for tiles without children
          interactionFeedback(clickedTile, 'click');
          if (onTileClick) {
            onTileClick(clickedTile);
          }
        }
      }
    }, 300),
    [tiles, onTileClick, isShattered, interactionEnabled, selectedTile, focusMode, exitFocus, initializeFocus, enhancedShatterAnimation, interactionFeedback]
  );
  
  // Handle hover effects
  const handleCanvasHover = useCallback(
    throttle((event) => {
      if (!canvasRef.current || tiles.length === 0 || isShattered || !interactionEnabled) return;
      
      // Get coordinates relative to canvas
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left);
      const y = (event.clientY - rect.top);
      
      // Find hovered tile
      const hoveredTile = tiles.find(tile => isPointInPolygon(x, y, tile.points));
      
      // Change cursor and provide feedback
      if (hoveredTile) {
        canvas.style.cursor = 'pointer';
        
        // Only trigger sound feedback if this is a new hover
        if (!selectedTile || selectedTile.id !== hoveredTile.id) {
          interactionFeedback(hoveredTile, 'hover');
          setSelectedTile(hoveredTile);
        }
      } else {
        canvas.style.cursor = 'default';
        setSelectedTile(null);
      }
    }, 50),
    [tiles, isShattered, interactionEnabled, selectedTile, interactionFeedback]
  );
  
  return (
    <div 
      className={`interlocking-mosaic ${isShattered ? 'shattered' : ''} ${viewType} ${focusMode ? 'focus-mode' : ''}`}
      ref={containerRef}
      aria-label={`${viewType} visualization`}
    >
      {isLoading && <MosaicLoader imageLoaded={imageLoaded} />}
      
      <canvas 
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasHover}
        className="mosaic-canvas"
        aria-label="Interactive mosaic canvas"
        style={{
          transform: `scale(${focusScale}) translate(${transform.x}px, ${transform.y}px)`
        }}
      />
      
      <MosaicStatus
        viewType={viewType}
        tileCount={tiles.length}
        debugMode={debugMode}
        validationResult={validationResult}
      />
      
      <MosaicControls
        viewType={viewType}
        focusMode={focusMode}
        onToggleFocus={() => focusMode ? exitFocus() : initializeFocus({ 
          x: containerRef.current?.clientWidth / 2 || window.innerWidth / 2, 
          y: containerRef.current?.clientHeight / 2 || window.innerHeight / 2 
        })}
        onToggleDebug={() => setDebugMode(!debugMode)}
        debugMode={debugMode}
      />
      
      {debugMode && validationResult && (
        <div className="debug-status">
          <h4>Tessellation Validation</h4>
          <p>Gaps: {validationResult.issues.gaps.length}</p>
          <p>Overlaps: {validationResult.issues.overlaps.length}</p>
          <p>Boundary Issues: {validationResult.issues.outsideBounds.length}</p>
          <p>Overall: {validationResult.valid ? '✅ Valid' : '❌ Invalid'}</p>
        </div>
      )}
    </div>
  );
};

// Add prop types validation
InterlockingMosaic.propTypes = {
    onTileClick: PropTypes.func,
    depth: PropTypes.number,
    viewType: PropTypes.string,
    parentColor: PropTypes.string
  };

export default InterlockingMosaic;