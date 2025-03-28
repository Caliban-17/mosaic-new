import React from 'react';
import PropTypes from 'prop-types';

const MosaicCanvas = React.forwardRef(({
  onClick,
  onMouseMove,
  focusScale = 1,
  transform = { x: 0, y: 0, scale: 1 }
}, ref) => {
  return (
    <canvas 
      ref={ref}
      onClick={onClick}
      onMouseMove={onMouseMove}
      className="mosaic-canvas"
      aria-label="Interactive mosaic canvas"
      style={{
        transform: `scale(${focusScale}) translate(${transform.x}px, ${transform.y}px)`
      }}
    />
  );
});

// Fix for display-name ESLint warning
MosaicCanvas.displayName = 'MosaicCanvas';

// Add prop types
MosaicCanvas.propTypes = {
  onClick: PropTypes.func,
  onMouseMove: PropTypes.func,
  focusScale: PropTypes.number,
  transform: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number,
    scale: PropTypes.number
  })
};

export default MosaicCanvas;