// This is a regular utility function to handle interactions
export const createInteractionFeedback = (SoundUtils) => {
    return (tile, interaction) => {
      switch(interaction) {
        case 'hover':
          // Subtle hover effect
          SoundUtils.play('hover', { 
            volume: 0.2,
            pitch: 1.0 + (tile.id.charCodeAt(0) % 10) * 0.02 // Slight pitch variation per tile
          });
          
          // Trigger subtle haptic feedback if available
          if (navigator.vibrate && window.matchMedia('(hover: hover)').matches === false) {
            navigator.vibrate(5); // Very subtle vibration on mobile
          }
          break;
          
        case 'click':
          // More pronounced click feedback
          SoundUtils.play('click', {
            volume: 0.6,
            pitch: 1.0,
            position: { x: tile.x, y: tile.y } // Spatial audio
          });
          
          // Stronger haptic feedback for click
          if (navigator.vibrate) {
            navigator.vibrate([15, 10, 15]); // Pattern vibration for click
          }
          break;
          
        case 'shatter':
          // Powerful shatter effect
          SoundUtils.play('shatter', {
            volume: 0.8,
            pitch: 0.9 + Math.random() * 0.2, // Random pitch variation
            position: { x: tile.x, y: tile.y } // Spatial audio
          });
          
          // Strong haptic feedback for significant interaction
          if (navigator.vibrate) {
            navigator.vibrate([10, 15, 20, 15, 10]); // Complex pattern for shatter
          }
          break;
          
        default:
          break;
      }
    };
  };
  
  // Check if a point is inside a polygon
  export const isPointInPolygon = (x, y, points) => {
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