/**
 * MosaicLoader.js
 * Loading indicator component for the tessellation mosaic
 */

import React from 'react';
import PropTypes from 'prop-types';

const MosaicLoader = ({ progress = 0, imageLoaded = true }) => (
  <div className="loading-spinner-container">
    <div className="loading-spinner"></div>
    <p>{imageLoaded ? 'Generating mosaic...' : 'Loading image...'}</p>
    
    {progress > 0 && (
      <div className="optimization-progress">
        <div className="progress-bar" style={{ width: `${progress * 100}%` }}></div>
      </div>
    )}
  </div>
);

MosaicLoader.propTypes = {
  progress: PropTypes.number,
  imageLoaded: PropTypes.bool
};

export default MosaicLoader;