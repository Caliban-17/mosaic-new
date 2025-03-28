import React from 'react';
import PropTypes from 'prop-types';

const MosaicStatus = ({ viewType, tileCount, debugMode, validationResult }) => (
  <div className="mosaic-status" aria-live="polite">
    <div className="status-label">
      {viewType === 'main' ? 'Main Mosaic' : 
       viewType === 'splinters' ? 'Splinters' : 'Fragments'}
    </div>
    <div className="tile-count">{tileCount} tiles</div>
    
    {debugMode && validationResult && (
      <div className="debug-stats">
        <span className={validationResult.valid ? 'valid-status' : 'invalid-status'}>
          {validationResult.valid ? '✓' : '✗'}
        </span>
      </div>
    )}
  </div>
);

// Add prop types
MosaicStatus.propTypes = {
  viewType: PropTypes.string,
  tileCount: PropTypes.number,
  debugMode: PropTypes.bool,
  validationResult: PropTypes.shape({
    valid: PropTypes.bool
  })
};

export default MosaicStatus;