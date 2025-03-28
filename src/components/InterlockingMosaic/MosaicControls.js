import React from 'react';
import PropTypes from 'prop-types';

const MosaicControls = ({ viewType, focusMode, onToggleFocus, onToggleDebug, debugMode }) => {
  if (viewType !== 'main') return null;
  
  return (
    <>
      <button 
        className={`focus-toggle ${focusMode ? 'active' : ''}`}
        onClick={onToggleFocus}
        aria-label={focusMode ? "Exit focus mode" : "Enter focus mode"}
        title={focusMode ? "Exit Focus Mode" : "Focus Mode"}
      >
        🔍
      </button>
      
      <button
        className={`debug-toggle ${debugMode ? 'active' : ''}`}
        onClick={onToggleDebug}
        aria-label={debugMode ? "Exit debug mode" : "Enter debug mode"}
        title={debugMode ? "Exit Debug Mode" : "Debug Mode"}
      >
        🐞
      </button>
      
      {focusMode && (
        <div className="focus-instructions">
          <p>Double-click on a tile to zoom in. Click the focus button to exit.</p>
        </div>
      )}
      
      {debugMode && (
        <div className="debug-instructions">
          <p>Debug mode active. Tessellation validation enabled.</p>
        </div>
      )}
    </>
  );
};

// Add prop types
MosaicControls.propTypes = {
  viewType: PropTypes.string,
  focusMode: PropTypes.bool,
  onToggleFocus: PropTypes.func,
  onToggleDebug: PropTypes.func,
  debugMode: PropTypes.bool
};

export default MosaicControls;