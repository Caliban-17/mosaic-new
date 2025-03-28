// src/components/BreadcrumbNavigation.js
import React from 'react';
import './BreadcrumbNavigation.css';
import SoundUtils from '../utils/SoundUtils';

const BreadcrumbNavigation = ({ 
  parentStack, 
  currentView, 
  onNavigate, 
  onReset 
}) => {
  // Only render if we have a parent stack
  if (parentStack.length === 0) return null;
  
  // Handle navigation to specific level
  const handleNavigation = (index) => {
    // If clicking the active level, don't do anything
    if (index === parentStack.length - 1) return;
    
    // Play sound for navigation
    SoundUtils.play('click');
    
    // Call the navigation handler with the target index
    onNavigate(index);
  };
  
  // Handle reset to home/main view
  const handleReset = () => {
    SoundUtils.play('reset');
    onReset();
  };
  
  return (
    <div className="breadcrumb-navigation" aria-label="Navigation breadcrumb">
      <div className="breadcrumb-container">
        {/* Home button */}
        <button 
          className="breadcrumb-home" 
          onClick={handleReset}
          aria-label="Return to main mosaic"
        >
          <span className="breadcrumb-icon">🏠</span>
          <span className="breadcrumb-text">Main</span>
        </button>
        
        {/* Path divider */}
        <div className="breadcrumb-divider">/</div>
        
        {/* Navigational items based on parent stack */}
        {parentStack.map((parent, index) => (
          <React.Fragment key={index}>
            <button 
              className={`breadcrumb-item ${index === parentStack.length - 1 ? 'active' : ''}`}
              style={{ 
                backgroundColor: parent.color,
                opacity: index === parentStack.length - 1 ? 1 : 0.8,
                transform: index === parentStack.length - 1 ? 'scale(1.05)' : 'scale(1)'
              }}
              onClick={() => handleNavigation(index)}
              aria-label={`Navigate to ${index === 0 ? 'Splinters' : `Fragment ${index}`}`}
              aria-current={index === parentStack.length - 1 ? 'page' : undefined}
            >
              <span className="breadcrumb-text">
                {index === 0 ? 'Splinters' : `Fragment ${index}`}
              </span>
              {index === parentStack.length - 1 && (
                <span className="current-marker" aria-hidden="true">•</span>
              )}
            </button>
            
            {/* Add divider between items, but not after the last one */}
            {index < parentStack.length - 1 && (
              <div className="breadcrumb-divider">/</div>
            )}
          </React.Fragment>
        ))}
      </div>
      
      {/* Current view descriptor */}
      <div className="breadcrumb-descriptor">
        {currentView === 'splinters' && 'Exploring variations of the original project'}
        {currentView === 'fragments' && 'Viewing reinterpretations that preserve the core idea'}
      </div>
    </div>
  );
};

export default BreadcrumbNavigation;