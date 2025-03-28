import { useState, useEffect } from 'react';
import { throttle } from 'lodash'; // Make sure lodash is installed

export const useResponsiveLayout = () => {
  const [screenSize, setScreenSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
    type: getScreenType()
  });
  
  // Determine screen type
  function getScreenType() {
    const width = window.innerWidth;
    if (width < 576) return 'mobile';
    if (width < 992) return 'tablet';
    if (width < 1440) return 'desktop';
    return 'large';
  }
  
  // Calculate appropriate tile counts for different screen sizes
  const getTileCount = (viewType) => {
    const { type } = screenSize;
    const baseMultiplier = viewType === 'main' ? 1 : 
                          viewType === 'splinters' ? 1.5 : 2;
    
    // Base counts adjusted by screen type
    const baseCounts = {
      mobile: 350,
      tablet: 800,
      desktop: 1400,
      large: 2000
    };
    
    // Adjust based on device performance capability (estimate)
    const performanceAdjustment = window.devicePixelRatio > 2 ? 0.7 : 1;
    
    return Math.floor(baseCounts[type] * baseMultiplier * performanceAdjustment);
  };
  
  // Calculate optimal cell dimensions
  const getOptimalCellDimensions = () => {
    const { type } = screenSize;
    
    // Base size in pixels that looks good on different devices
    const baseSizes = {
      mobile: 24,
      tablet: 32,
      desktop: 40,
      large: 50
    };
    
    return baseSizes[type];
  };
  
  // Update on resize
  useEffect(() => {
    const handleResize = throttle(() => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight,
        type: getScreenType()
      });
    }, 200);
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  return {
    screenSize,
    getTileCount,
    getOptimalCellDimensions
  };
};