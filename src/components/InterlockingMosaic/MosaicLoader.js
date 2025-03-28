import React from 'react';
import PropTypes from 'prop-types';

const MosaicLoader = ({ imageLoaded }) => (
  <div className="loading-spinner-container">
    <div className="loading-spinner"></div>
    <p>{imageLoaded ? 'Generating mosaic...' : 'Loading image...'}</p>
  </div>
);

// Add prop types
MosaicLoader.propTypes = {
  imageLoaded: PropTypes.bool
};

export default MosaicLoader;