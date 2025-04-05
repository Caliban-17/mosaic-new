/**
 * useToroidalPanZoom.js
 * Enhanced pan and zoom hook with toroidal (wrap-around) support.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { throttle } from 'lodash';

/**
 * Hook for managing pan and zoom with toroidal (wrap-around) support
 * @param {Object} containerRef - React ref to the container element
 * @param {Object} options - Configuration options
 * @returns {Object} - Pan and zoom state and functions
 */
const useToroidalPanZoom = (containerRef, options = {}) => {
  const {
    width = 1000, // Logical width of the toroidal space
    height = 1000, // Logical height of the toroidal space
    minScale = 0.5,
    maxScale = 3,
    initialScale = 1,
    enablePan = true,
    enableZoom = true,
    zoomSensitivity = 0.01
  } = options;
  
  // State for transform
  const [transform, setTransform] = useState({
    x: 0,
    y: 0,
    scale: initialScale
  });
  
  // State for dragging
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const transformStart = useRef({ x: 0, y: 0 });
  
  // Wrapped positions for ghost tiles
  const [wrappedPositions, setWrappedPositions] = useState([
    { dx: 0, dy: 0 } // center
    // Additional positions will be calculated based on viewport
  ]);
  
  // Calculate wrapped positions based on viewport
  const calculateWrappedPositions = useCallback((currentTransform) => {
    const positions = [{ dx: 0, dy: 0 }]; // Center tile always visible
    
    // Get container dimensions
    const container = containerRef.current;
    if (!container) return positions;
    
    const { clientWidth, clientHeight } = container;
    
    // Calculate viewport boundaries in logical space
    const viewportLeft = -currentTransform.x / currentTransform.scale;
    const viewportRight = (clientWidth - currentTransform.x) / currentTransform.scale;
    const viewportTop = -currentTransform.y / currentTransform.scale;
    const viewportBottom = (clientHeight - currentTransform.y) / currentTransform.scale;
    
    // Check if viewport extends beyond logical boundaries
    if (viewportLeft < 0) positions.push({ dx: -width, dy: 0 });
    if (viewportRight > width) positions.push({ dx: width, dy: 0 });
    if (viewportTop < 0) positions.push({ dx: 0, dy: -height });
    if (viewportBottom > height) positions.push({ dx: 0, dy: height });
    
    // Check corners
    if (viewportLeft < 0 && viewportTop < 0) positions.push({ dx: -width, dy: -height });
    if (viewportRight > width && viewportTop < 0) positions.push({ dx: width, dy: -height });
    if (viewportLeft < 0 && viewportBottom > height) positions.push({ dx: -width, dy: height });
    if (viewportRight > width && viewportBottom > height) positions.push({ dx: width, dy: height });
    
    return positions;
  }, [width, height, containerRef]);
  
  // Throttled version of calculateWrappedPositions
  const updateWrappedPositions = useCallback(
    throttle((currentTransform) => {
      const newPositions = calculateWrappedPositions(currentTransform);
      setWrappedPositions(newPositions);
    }, 100),
    [calculateWrappedPositions]
  );
  
  // Initialize event handlers
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    
    // Mouse wheel zoom
    const handleWheel = (e) => {
      if (!enableZoom) return;
      
      e.preventDefault();
      
      // Get mouse position relative to container
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Calculate new scale
      const delta = -e.deltaY * zoomSensitivity;
      const newScale = Math.max(minScale, Math.min(maxScale, transform.scale + delta));
      
      // Calculate new position to zoom into mouse point
      const scaleRatio = newScale / transform.scale;
      const newX = mouseX - (mouseX - transform.x) * scaleRatio;
      const newY = mouseY - (mouseY - transform.y) * scaleRatio;
      
      const newTransform = {
        x: newX,
        y: newY,
        scale: newScale
      };
      
      setTransform(newTransform);
      updateWrappedPositions(newTransform);
    };
    
    // Mouse drag
    const handleMouseDown = (e) => {
      if (!enablePan) return;
      
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      transformStart.current = { x: transform.x, y: transform.y };
    };
    
    const handleMouseMove = (e) => {
      if (!isDragging || !enablePan) return;
      
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      
      // Apply toroidal wrapping to the transform
      const newX = transformStart.current.x + dx;
      const newY = transformStart.current.y + dy;
      
      // Wrap the transform within the logical width/height
      const newTransform = {
        ...transform,
        x: newX,
        y: newY
      };
      
      setTransform(newTransform);
      updateWrappedPositions(newTransform);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    // Touch handling for mobile
    const handleTouchStart = (e) => {
      if (!enablePan) return;
      
      if (e.touches.length === 1) {
        // Single touch - pan
        setIsDragging(true);
        dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        transformStart.current = { x: transform.x, y: transform.y };
      }
    };
    
    const handleTouchMove = (e) => {
      if (e.touches.length === 1 && isDragging && enablePan) {
        // Single touch - pan
        const dx = e.touches[0].clientX - dragStart.current.x;
        const dy = e.touches[0].clientY - dragStart.current.y;
        
        const newX = transformStart.current.x + dx;
        const newY = transformStart.current.y + dy;
        
        const newTransform = {
          ...transform,
          x: newX,
          y: newY
        };
        
        setTransform(newTransform);
        updateWrappedPositions(newTransform);
      }
    };
    
    const handleTouchEnd = () => {
      setIsDragging(false);
    };
    
    // Add event listeners
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
    
    // Update wrapped positions on initial render
    updateWrappedPositions(transform);
    
    // Clean up
    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [
    containerRef, transform, isDragging, enablePan, enableZoom, 
    minScale, maxScale, zoomSensitivity, width, height,
    updateWrappedPositions
  ]);
  
  // Reset transform
  const resetTransform = () => {
    const newTransform = { x: 0, y: 0, scale: initialScale };
    setTransform(newTransform);
    updateWrappedPositions(newTransform);
  };
  
  // Logical to screen coordinates
  const logicalToScreen = (logicalX, logicalY) => {
    return {
      x: logicalX * transform.scale + transform.x,
      y: logicalY * transform.scale + transform.y
    };
  };
  
  // Screen to logical coordinates
  const screenToLogical = (screenX, screenY) => {
    return {
      x: (screenX - transform.x) / transform.scale,
      y: (screenY - transform.y) / transform.scale
    };
  };
  
  // Center on a specific logical point
  const centerOn = (logicalX, logicalY, targetScale = transform.scale) => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const { clientWidth, clientHeight } = container;
    
    const newX = clientWidth / 2 - logicalX * targetScale;
    const newY = clientHeight / 2 - logicalY * targetScale;
    
    const newTransform = {
      x: newX,
      y: newY,
      scale: targetScale
    };
    
    setTransform(newTransform);
    updateWrappedPositions(newTransform);
  };
  
  return {
    transform,
    isDragging,
    wrappedPositions,
    resetTransform,
    logicalToScreen,
    screenToLogical,
    centerOn
  };
};

export default useToroidalPanZoom;