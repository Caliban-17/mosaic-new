import { useState, useRef, useEffect } from 'react';

const usePanAndZoom = (containerRef) => {
  const [transform, setTransform] = useState({
    x: 0,
    y: 0,
    scale: 1
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const transformStart = useRef({ x: 0, y: 0 });
  
  // Initialize event handlers
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    
    // Mouse wheel zoom
    const handleWheel = (e) => {
      e.preventDefault();
      
      // Get mouse position relative to container
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      // Calculate new scale
      const delta = -e.deltaY * 0.01;
      const newScale = Math.max(0.5, Math.min(3, transform.scale + delta));
      
      // Calculate new position to zoom into mouse point
      const scaleRatio = newScale / transform.scale;
      const newX = mouseX - (mouseX - transform.x) * scaleRatio;
      const newY = mouseY - (mouseY - transform.y) * scaleRatio;
      
      setTransform({
        x: newX,
        y: newY,
        scale: newScale
      });
    };
    
    // Mouse drag
    const handleMouseDown = (e) => {
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY };
      transformStart.current = { x: transform.x, y: transform.y };
    };
    
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      
      setTransform({
        ...transform,
        x: transformStart.current.x + dx,
        y: transformStart.current.y + dy
      });
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
    };
    
    // Touch handling for mobile
    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        // Single touch - pan
        setIsDragging(true);
        dragStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        transformStart.current = { x: transform.x, y: transform.y };
      }
    };
    
    const handleTouchMove = (e) => {
      if (e.touches.length === 1 && isDragging) {
        // Single touch - pan
        const dx = e.touches[0].clientX - dragStart.current.x;
        const dy = e.touches[0].clientY - dragStart.current.y;
        
        setTransform({
          ...transform,
          x: transformStart.current.x + dx,
          y: transformStart.current.y + dy
        });
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
  }, [containerRef, transform, isDragging]);
  
  // Reset transform
  const resetTransform = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
  };
  
  return {
    transform,
    resetTransform,
    isDragging
  };
};

export default usePanAndZoom;