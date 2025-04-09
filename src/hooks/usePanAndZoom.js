// src/hooks/usePanAndZoom.js

import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Helper function for toroidal modulo. Returns 0 for invalid inputs.
 * @param {number} value The value to wrap.
 * @param {number} max The maximum value (exclusive).
 * @returns {number} The value wrapped within [0, max).
 */
const toroidalModulo = (value, max) => {
    // Add safety checks for non-finite values or non-positive max
    if (max <= 0 || !Number.isFinite(value) || !Number.isFinite(max)) {
        // console.warn(`Invalid toroidalModulo input: value=${value}, max=${max}`);
        return 0;
    }
    const result = value % max;
    return result < 0 ? result + max : result;
};

/**
 * Enhanced pan and zoom hook with toroidal (wrap-around) state management for panning.
 *
 * @param {React.RefObject<HTMLElement>} containerRef - Ref to the container element.
 * @param {object} options - Configuration.
 * @param {number} options.domainWidth - The logical width of the content being panned.
 * @param {number} options.domainHeight - The logical height of the content being panned.
 * @param {number} [options.minScale=0.5] - Minimum zoom scale.
 * @param {number} [options.maxScale=4] - Maximum zoom scale (Adjusted default).
 * @param {number} [options.initialScale=1] - Initial zoom scale.
 * @param {boolean} [options.initialPanEnabled=true] - Initial pan state.
 * @param {number} [options.zoomSensitivity=0.01] - Mouse wheel zoom speed.
 */
const usePanAndZoom = (containerRef, options = {}) => {
  // Destructure options with defaults
  const {
    domainWidth = 10.0,
    domainHeight = 8.0,
    minScale = 0.5,
    maxScale = 4, // Using 4 based on test setup
    initialScale = 1,
    initialPanEnabled = true,
    zoomSensitivity = 0.01
  } = options;

  // Hook state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: initialScale });
  const [panEnabled, setPanEnabledInternal] = useState(initialPanEnabled);
  const [isDragging, setIsDragging] = useState(false);

  // Refs for drag calculations
  const dragStart = useRef({ x: 0, y: 0 });
  const transformStart = useRef({ x: 0, y: 0 }); // Store transform state at drag start

  // --- Effect for Managing Cursor Style ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return; // Only run if container exists

    // Set cursor based on current state
    if (isDragging) {
        container.style.cursor = 'grabbing';
    } else {
        container.style.cursor = panEnabled ? 'grab' : 'default';
    }
    // Dependencies: Only needs to re-run if these specific states change
  }, [containerRef, isDragging, panEnabled]);

  // --- Effect for Attaching and Cleaning Up Event Listeners ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return; // Don't attach listeners if the container isn't ready

    // --- Event Handler Definitions ---
    // Define handlers inside useEffect so they close over the necessary state/props/options
    // Wrapping with useCallback *inside* useEffect doesn't give stable refs for cleanup,
    // but defining them here makes the dependency logic simpler.
    // For stable refs for cleanup, define outside with useCallback and add to deps.

    const handleWheel = (e) => {
      e.preventDefault(); // Prevent page scroll
      const rect = container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      setTransform(currentTransform => {
          if (!Number.isFinite(currentTransform.scale) || currentTransform.scale <= 0) {
              console.warn("usePanAndZoom: Skipping zoom due to invalid current scale:", currentTransform.scale);
              return currentTransform;
          }
          const delta = -e.deltaY * zoomSensitivity;
          const newScaleRaw = currentTransform.scale * (1 + delta);
          const newScale = Math.max(minScale, Math.min(maxScale, newScaleRaw));
          const scaleRatio = (newScale !== currentTransform.scale && currentTransform.scale !== 0) ? newScale / currentTransform.scale : 1;
          const newX = mouseX - (mouseX - currentTransform.x) * scaleRatio;
          const newY = mouseY - (mouseY - currentTransform.y) * scaleRatio;
          return {
              scale: newScale,
              x: Number.isFinite(newX) ? newX : currentTransform.x,
              y: Number.isFinite(newY) ? newY : currentTransform.y,
           };
      });
    };

    const handlePanStart = (clientX, clientY) => {
        if (!panEnabled) return;
        // Capture the transform state *at the moment* the drag starts
        transformStart.current = { x: transform.x, y: transform.y };
        dragStart.current = { x: clientX, y: clientY };
        setIsDragging(true); // Trigger state update (cursor useEffect will handle style)
    };

    const handlePanMove = (clientX, clientY) => {
        if (!isDragging || !panEnabled) return; // Use state directly
        const dx = clientX - dragStart.current.x;
        const dy = clientY - dragStart.current.y;

        setTransform(currentTransform => {
             if (!Number.isFinite(transformStart.current.x) ||
                 !Number.isFinite(transformStart.current.y) ||
                 !Number.isFinite(currentTransform.scale) ||
                 currentTransform.scale <= 0)
             {
                 console.warn("usePanAndZoom: Skipping pan move due to invalid state.");
                 return currentTransform;
            }
            const rawNewX = transformStart.current.x + dx;
            const rawNewY = transformStart.current.y + dy;
            const scaledWidth = domainWidth * currentTransform.scale;
            const scaledHeight = domainHeight * currentTransform.scale;
            const wrappedX = toroidalModulo(rawNewX, scaledWidth);
            const wrappedY = toroidalModulo(rawNewY, scaledHeight);
            return {
                ...currentTransform,
                x: Number.isFinite(wrappedX) ? wrappedX : currentTransform.x,
                y: Number.isFinite(wrappedY) ? wrappedY : currentTransform.y
            };
        });
    };

    const handlePanEnd = () => {
        if (!isDragging) return;
        setIsDragging(false); // Trigger state update (cursor useEffect will handle style)
    };

    // Assign intermediate handlers
    const handleMouseDown = (e) => handlePanStart(e.clientX, e.clientY);
    const handleMouseMove = (e) => handlePanMove(e.clientX, e.clientY);
    const handleMouseUp = () => handlePanEnd();
    const handleMouseLeave = () => handlePanEnd();
    const handleTouchStart = (e) => { if (e.touches.length === 1) { e.preventDefault(); handlePanStart(e.touches[0].clientX, e.touches[0].clientY); }};
    const handleTouchMove = (e) => { if (e.touches.length === 1) { e.preventDefault(); handlePanMove(e.touches[0].clientX, e.touches[0].clientY); }};
    const handleTouchEnd = () => handlePanEnd();
    const handleTouchCancel = () => handlePanEnd();

    // Attach listeners
    container.addEventListener('wheel', handleWheel, { passive: false });
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseleave', handleMouseLeave);
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchCancel);

    // Cleanup Function
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
    // Dependencies: Include everything read *directly* by the effect or its inner handlers
    // transform.x/y needed by handlePanStart capture
  }, [ containerRef, panEnabled, isDragging,
       domainWidth, domainHeight, minScale, maxScale, zoomSensitivity,
       transform.x, transform.y // Include specific transform parts read
     ]);


  // Function to manually enable/disable panning (memoized)
  const setPanning = useCallback((isEnabled) => {
      setPanEnabledInternal(isEnabled);
      if (!isEnabled && isDragging) { // Stop drag if panning is disabled mid-drag
          setIsDragging(false);
      }
  }, [isDragging]); // Depends on isDragging state

  // Function to reset transform (memoized)
  const resetTransform = useCallback(() => {
      // Reset to the initialScale value captured from options
      setTransform({ x: 0, y: 0, scale: initialScale });
  }, [initialScale]); // Depends on initialScale from options


  // Return the state and control functions
  return {
    transform,
    // setTransform, // Expose raw setter only if absolutely necessary externally
    panEnabled,
    setPanEnabled: setPanning, // Expose the controlled setter
    isDragging,
    resetTransform,
  };
};

// Single default export for the hook
export default usePanAndZoom;