import { useState, useRef, useEffect } from 'react';

// Helper for toroidal modulo
const toroidalModulo = (value, max) => {
    // Ensure max is positive
    if (max <= 0) return 0;
    const result = value % max;
    // Handle negative results of modulo
    return result < 0 ? result + max : result;
};

/**
 * Enhanced pan and zoom hook with toroidal (wrap-around) state management.
 *
 * @param {React.RefObject<HTMLElement>} containerRef - Ref to the container element.
 * @param {object} options - Configuration.
 * @param {number} options.domainWidth - The logical width of the content being panned.
 * @param {number} options.domainHeight - The logical height of the content being panned.
 * @param {number} [options.minScale=0.5] - Minimum zoom scale.
 * @param {number} [options.maxScale=3] - Maximum zoom scale.
 * @param {number} [options.initialScale=1] - Initial zoom scale.
 * @param {boolean} [options.initialPanEnabled=true] - Initial pan state.
 * @param {number} [options.zoomSensitivity=0.01] - Mouse wheel zoom speed.
 */
const usePanAndZoom = (containerRef, options = {}) => {
  const {
    domainWidth = 10.0, // Default logical width
    domainHeight = 8.0,  // Default logical height
    minScale = 0.5,
    maxScale = 3,
    initialScale = 1,
    initialPanEnabled = true, // Renamed from enablePan for clarity
    zoomSensitivity = 0.01
  } = options;

  // State for transform
  const [transform, setTransform] = useState({
    x: 0, // Represents top-left offset in pixels
    y: 0,
    scale: initialScale
  });

  // State for dragging and enabling/disabling pan
  const [panEnabled, setPanEnabled] = useState(initialPanEnabled);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const transformStart = useRef({ x: 0, y: 0 }); // Store transform state at drag start


  // --- Event Handlers ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Update initial cursor based on panEnabled state
    container.style.cursor = panEnabled ? 'grab' : 'default';

    // --- Wheel Zoom ---
    const handleWheel = (e) => {
      // Allow zoom even if pan is disabled? Separate control needed if so.
      // if (!panEnabled) return;
      e.preventDefault();

      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left; // Mouse pos relative to container
      const mouseY = e.clientY - rect.top;

      // Calculate new scale
      const delta = -e.deltaY * zoomSensitivity;
      // Apply delta relative to current scale for more intuitive zooming
      const newScaleRaw = transform.scale * (1 + delta);
      const newScale = Math.max(minScale, Math.min(maxScale, newScaleRaw));

      // Calculate new position to zoom towards the mouse point
      const scaleRatio = newScale / transform.scale;
      const newX = mouseX - (mouseX - transform.x) * scaleRatio;
      const newY = mouseY - (mouseY - transform.y) * scaleRatio;

      // Update state - Zoom translation doesn't wrap toroidally
      setTransform({
        scale: newScale,
        x: newX,
        y: newY,
      });
    };

    // --- Mouse/Touch Panning ---
    const handlePanStart = (clientX, clientY) => {
        if (!panEnabled) return;
        setIsDragging(true);
        dragStart.current = { x: clientX, y: clientY };
        transformStart.current = { x: transform.x, y: transform.y };
        container.style.cursor = 'grabbing'; // Indicate dragging
    };

    const handlePanMove = (clientX, clientY) => {
        if (!isDragging || !panEnabled) return;

        const dx = clientX - dragStart.current.x;
        const dy = clientY - dragStart.current.y;

        // Calculate the new raw position based on where drag started
        const rawNewX = transformStart.current.x + dx;
        const rawNewY = transformStart.current.y + dy;

        // Calculate the size of the scaled domain in pixels
        const scaledWidth = domainWidth * transform.scale;
        const scaledHeight = domainHeight * transform.scale;

        // Apply toroidal modulo based on the scaled domain size
        const wrappedX = toroidalModulo(rawNewX, scaledWidth);
        const wrappedY = toroidalModulo(rawNewY, scaledHeight);

        setTransform(prev => ({
            ...prev, // Keep current scale
            x: wrappedX,
            y: wrappedY
        }));
    };

    const handlePanEnd = () => {
        if (!isDragging) return;
        setIsDragging(false);
        container.style.cursor = panEnabled ? 'grab' : 'default';
    };

    // Mouse events
    const handleMouseDown = (e) => handlePanStart(e.clientX, e.clientY);
    const handleMouseMove = (e) => handlePanMove(e.clientX, e.clientY);
    const handleMouseUp = () => handlePanEnd();
    const handleMouseLeave = () => handlePanEnd();

    // Touch events
    const handleTouchStart = (e) => { if (e.touches.length === 1) { e.preventDefault(); handlePanStart(e.touches[0].clientX, e.touches[0].clientY); }}; // Prevent default scroll on touch start
    const handleTouchMove = (e) => { if (e.touches.length === 1) { e.preventDefault(); handlePanMove(e.touches[0].clientX, e.touches[0].clientY); }}; // Prevent default scroll on touch move
    const handleTouchEnd = () => handlePanEnd();
    const handleTouchCancel = () => handlePanEnd();


    // Add event listeners
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove); // Listen on window
    window.addEventListener('mouseup', handleMouseUp);     // Listen on window
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false }); // Listen on window
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchCancel);

    // Cleanup
    return () => {
      container.removeEventListener('wheel', handleWheel);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [
      containerRef, transform, isDragging, panEnabled,
      domainWidth, domainHeight, minScale, maxScale, zoomSensitivity
  ]);

  // Function to manually enable/disable panning
  const setPanning = (isEnabled) => {
      setPanEnabled(isEnabled);
      if (containerRef.current) {
          containerRef.current.style.cursor = isEnabled ? 'grab' : 'default';
      }
      if (!isEnabled && isDragging) { // Stop drag if panning is disabled mid-drag
          setIsDragging(false);
      }
  };

  // Reset transform
  const resetTransform = () => {
    setTransform({ x: 0, y: 0, scale: initialScale });
  };

  return {
    transform,
    setTransform, // Expose setter if needed externally
    panEnabled,
    setPanEnabled: setPanning, // Expose controlled setter
    isDragging,
    resetTransform,
  };
};

export default usePanAndZoom;
