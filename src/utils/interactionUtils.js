

// This is a regular utility function to handle interactions
export const createInteractionFeedback = (SoundUtils) => {
    // tile expected to have { id: string, x: number, y: number } for position
    return (tile, interaction) => {
      // Ensure tile and position exist for spatial sounds
      const hasPosition = tile && typeof tile.x === 'number' && typeof tile.y === 'number';
      let positionOption = null;

      if (hasPosition) {
          // **Important Note:** SoundUtils.createPanner now expects *normalized* coordinates (0-1).
          // We need the domain WIDTH/HEIGHT here to normalize.
          // This utility doesn't know them. For now, pass domain coords,
          // OR update createInteractionFeedback to receive dimensions,
          // OR update play/createPanner to accept domain coords + dimensions.
          // Passing domain coords and letting playSpatial handle it might be complex.
          // Let's omit spatial position for now until normalization is handled properly.
          // positionOption = { x: tile.x, y: tile.y }; // Pass domain coords for now
          positionOption = null; // Omit spatialization until coords are handled correctly
      }


      switch(interaction) {
        case 'hover':
          // Subtle hover effect - removed for less noise, enable if desired
          /*
          SoundUtils.play('hover', {
            volume: 0.2,
            pitch: 1.0 + (tile?.id?.charCodeAt(0) % 10) * 0.02 // Slight pitch variation per tile
          });
          */

          // Trigger subtle haptic feedback if available
          if (navigator.vibrate && window.matchMedia('(hover: hover)').matches === false) {
            // navigator.vibrate(5); // Very subtle vibration on mobile - potentially annoying
          }
          break;

        case 'click':
          // More pronounced click feedback
          SoundUtils.play('click', {
            volume: 0.6,
            pitch: 1.0,
            position: positionOption // Pass position if available and handled
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
            position: positionOption // Pass position if available and handled
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

  // Check if a point is inside a polygon using Ray Casting Algorithm
  // Corrected to handle points as arrays: [[x1, y1], [x2, y2], ...]
  export const isPointInPolygon = (x, y, points) => {
    if (!points || !Array.isArray(points) || points.length < 3) {
         // console.warn("isPointInPolygon called with invalid points:", points);
         return false;
     }

    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      // Ensure points[i] and points[j] are valid arrays with 2 numbers
       if (!Array.isArray(points[i]) || points[i].length !== 2 || !Array.isArray(points[j]) || points[j].length !== 2) {
            // console.warn(`Invalid vertex data at index ${i} or ${j}`, points[i], points[j]);
            continue; // Skip invalid vertex data
       }

      // ** FIX: Access coordinates using array indices **
      const xi = points[i][0]; // Use index 0 for x
      const yi = points[i][1]; // Use index 1 for y
      const xj = points[j][0]; // Use index 0 for x
      const yj = points[j][1]; // Use index 1 for y

      // Check if the horizontal ray from (x, y) intersects the edge (i, j)
      const intersect = ((yi > y) !== (yj > y)) && // Point y is between edge's y range
                        (x < (xj - xi) * (y - yi) / (yj - yi) + xi); // Point x is to the left of intersection

      if (intersect) {
        inside = !inside; // Flip the inside state on each valid intersection
      }
    }

    return inside;
  };

