// Create enhanced animations for the mosaic
export const createEnhancedAnimations = () => {
    // Shatter animation with physics
    const enhancedShatterAnimation = (ctx, tile) => {
      const { points, color, x: centerX, y: centerY } = tile;
      const shatterPieces = [];
      
      // Create more realistic shatter pieces
      if (points && points.length >= 3) {
        // Use Voronoi diagram to create more natural-looking fragments
        const fragmentCount = 6 + Math.floor(Math.random() * 6); // 6-12 fragments
        
        // Create fragment points around the center and on the perimeter
        const fragmentPoints = [];
        
        // Add the center point
        fragmentPoints.push({ x: centerX, y: centerY });
        
        // Add random points inside the polygon
        for (let i = 0; i < fragmentCount - 1; i++) {
          // Random position using barycentric coordinates
          let x = 0, y = 0;
          
          // Generate random barycentric coordinates
          const weights = Array(points.length).fill(0).map(() => Math.random());
          const weightSum = weights.reduce((sum, w) => sum + w, 0);
          
          // Normalize weights
          for (let j = 0; j < weights.length; j++) {
            weights[j] /= weightSum;
          }
          
          // Calculate point using barycentric coordinates
          for (let j = 0; j < points.length; j++) {
            x += points[j].x * weights[j];
            y += points[j].y * weights[j];
          }
          
          fragmentPoints.push({ x, y });
        }
        
        // Create Voronoi diagram to generate fragments
        // Simplified version - in a real implementation, use a library
        for (let i = 0; i < fragmentPoints.length; i++) {
          const fragment = [];
          
          // Create a fragment based on the Voronoi cell
          // This is a simplified approximation
          for (let j = 0; j < points.length; j++) {
            const p1 = points[j];
            const p2 = points[(j+1) % points.length];
            
            // Check if this edge should be part of this fragment
            // based on proximity to the fragment point
            const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
            
            // If this midpoint is closest to our fragment point among all fragment points
            let isClosest = true;
            for (let k = 0; k < fragmentPoints.length; k++) {
              if (k !== i) {
                const dist1 = Math.hypot(mid.x - fragmentPoints[i].x, mid.y - fragmentPoints[i].y);
                const dist2 = Math.hypot(mid.x - fragmentPoints[k].x, mid.y - fragmentPoints[k].y);
                
                if (dist2 < dist1) {
                  isClosest = false;
                  break;
                }
              }
            }
            
            if (isClosest) {
              fragment.push({ x: p1.x, y: p1.y });
              fragment.push({ x: p2.x, y: p2.y });
            }
          }
          
          // Add fragment center
          fragment.push({ x: fragmentPoints[i].x, y: fragmentPoints[i].y });
          
          // Create the shatter piece with physics properties
          const baseSpeed = 1 + Math.random() * 2;
          const angle = Math.random() * Math.PI * 2;
          
          shatterPieces.push({
            points: fragment,
            color,
            // Physics properties
            x: fragmentPoints[i].x,
            y: fragmentPoints[i].y,
            vx: Math.cos(angle) * baseSpeed,
            vy: Math.sin(angle) * baseSpeed,
            rotation: 0,
            rotationSpeed: (Math.random() - 0.5) * 0.1,
            opacity: 1,
            gravity: 0.05 + Math.random() * 0.05
          });
        }
      }
      
      // Animate the shatter pieces with physics
      let startTime = null;
      const duration = 1200; // 1.2 seconds
      
      const animateFrame = (timestamp) => {
        if (!startTime) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Clear the original tile area
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        
        if (points && points.length > 0) {
          ctx.moveTo(points[0].x, points[0].y);
          
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
          }
        }
        
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        
        // Update and draw each shatter piece with physics
        shatterPieces.forEach(piece => {
          // Update position with velocity
          piece.x += piece.vx;
          piece.y += piece.vy;
          
          // Apply gravity
          piece.vy += piece.gravity;
          
          // Update rotation
          piece.rotation += piece.rotationSpeed;
          
          // Fade out over time
          piece.opacity = 1 - progress;
          
          // Draw the piece
          ctx.save();
          
          // Set opacity
          ctx.globalAlpha = piece.opacity;
          
          // Apply rotation around the piece's center
          ctx.translate(piece.x, piece.y);
          ctx.rotate(piece.rotation);
          ctx.translate(-piece.x, -piece.y);
          
          // Draw piece
          ctx.beginPath();
          
          if (piece.points && piece.points.length > 0) {
            ctx.moveTo(piece.points[0].x, piece.points[0].y);
            
            for (let i = 1; i < piece.points.length; i++) {
              ctx.lineTo(piece.points[i].x, piece.points[i].y);
            }
          }
          
          ctx.closePath();
          ctx.fillStyle = piece.color;
          ctx.fill();
          
          // Add thin inner stroke
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
          
          ctx.restore();
        });
        
        // Continue animation if not complete
        if (progress < 1) {
          requestAnimationFrame(animateFrame);
        }
      };
      
      requestAnimationFrame(animateFrame);
    };
    
    return {
      enhancedShatterAnimation
    };
  };