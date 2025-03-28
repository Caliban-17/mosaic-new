import { useState } from 'react';

export const useFocusMode = () => {
  const [focusMode, setFocusMode] = useState(false);
  const [focusScale, setFocusScale] = useState(1);
  const [focusCenter, setFocusCenter] = useState({ x: 0, y: 0 });
  const [transitionActive, setTransitionActive] = useState(false);
  const [interactionEnabled, setInteractionEnabled] = useState(true);
  
  // Easing functions for smoother animations
  const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3);
  const easeInOutQuad = (x) => x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
  
  // Initialize focus mode
  const initializeFocus = (center, scale = 1.5) => {
    setFocusMode(true);
    setTransitionActive(true);
    setInteractionEnabled(false);
    
    // Animate the transition
    setFocusCenter(center);
    
    // Gradually zoom in
    const startScale = 1;
    const endScale = scale;
    const duration = 800; // ms
    const startTime = Date.now();
    
    const animateZoom = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Use easing function for smoother transition
      const easedProgress = easeOutCubic(progress);
      const newScale = startScale + (endScale - startScale) * easedProgress;
      
      setFocusScale(newScale);
      
      if (progress < 1) {
        requestAnimationFrame(animateZoom);
      } else {
        setTransitionActive(false);
        setInteractionEnabled(true);
      }
    };
    
    requestAnimationFrame(animateZoom);
  };
  
  // Exit focus mode with smooth transition
  const exitFocus = () => {
    setTransitionActive(true);
    setInteractionEnabled(false);
    
    // Animate transition back
    const startScale = focusScale;
    const endScale = 1;
    const duration = 600; // ms
    const startTime = Date.now();
    
    const animateZoomOut = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Use easing function for smoother transition
      const easedProgress = easeInOutQuad(progress);
      const newScale = startScale + (endScale - startScale) * easedProgress;
      
      setFocusScale(newScale);
      
      if (progress < 1) {
        requestAnimationFrame(animateZoomOut);
      } else {
        setFocusMode(false);
        setTransitionActive(false);
        setInteractionEnabled(true);
        setFocusScale(1);
      }
    };
    
    requestAnimationFrame(animateZoomOut);
  };
  
  // Return the functions and state for use in the component
  return {
    focusMode,
    focusScale,
    focusCenter,
    transitionActive,
    interactionEnabled,
    initializeFocus,
    exitFocus
  };
};