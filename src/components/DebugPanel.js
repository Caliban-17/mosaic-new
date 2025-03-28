import React, { useState, useEffect } from 'react';
import './DebugPanel.css';

const DebugPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [imageInfo, setImageInfo] = useState({
    paths: [],
    loaded: false,
    currentPath: '',
    error: null
  });

  // Override console.log to capture background image debug info
  useEffect(() => {
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    
    // Override console.log
    console.log = (...args) => {
      // Check if this is a background image log
      const message = args.join(' ');
      if (message.includes('image') || 
          message.includes('Image') || 
          message.includes('path') || 
          message.includes('Path')) {
        
        // Add to logs
        setLogs(prevLogs => [
          ...prevLogs, 
          { type: 'log', message, time: new Date().toLocaleTimeString() }
        ]);
        
        // Extract image path information
        if (message.includes('Trying path:')) {
          const path = message.split('Trying path:')[1].trim();
          setImageInfo(prev => ({
            ...prev,
            paths: [...prev.paths, path]
          }));
        } else if (message.includes('SUCCESS:')) {
          const path = message.includes('SUCCESS: Image loaded from') ? 
            message.split('SUCCESS: Image loaded from')[1].trim() : '';
          setImageInfo(prev => ({
            ...prev,
            loaded: true,
            currentPath: path
          }));
        } else if (message.includes('Background image loaded successfully')) {
          setImageInfo(prev => ({
            ...prev,
            loaded: true
          }));
        }
      }
      
      // Call original console.log
      originalConsoleLog.apply(console, args);
    };
    
    // Override console.error
    console.error = (...args) => {
      // Check if this is a background image error
      const message = args.join(' ');
      if (message.includes('image') || 
          message.includes('Image') || 
          message.includes('path') || 
          message.includes('Path')) {
        
        // Add to logs
        setLogs(prevLogs => [
          ...prevLogs, 
          { type: 'error', message, time: new Date().toLocaleTimeString() }
        ]);
        
        // Extract error information
        if (message.includes('All image paths failed')) {
          setImageInfo(prev => ({
            ...prev,
            error: 'Failed to load image from any path'
          }));
        } else if (message.includes('Primary background image failed')) {
          setImageInfo(prev => ({
            ...prev,
            error: 'Primary image failed, using fallback'
          }));
        }
      }
      
      // Call original console.error
      originalConsoleError.apply(console, args);
    };
    
    // Restore original console methods on cleanup
    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
    };
  }, []);
  
  // Handle toggle
  const togglePanel = () => {
    setIsOpen(!isOpen);
  };
  
  // Handle clear logs
  const clearLogs = () => {
    setLogs([]);
  };
  
  // Create a function to test loading an image directly
  const testImageLoad = async (url) => {
    try {
      const img = new Image();
      img.onload = () => {
        setLogs(prevLogs => [
          ...prevLogs,
          { 
            type: 'success', 
            message: `Test: Successfully loaded image from ${url}`,
            time: new Date().toLocaleTimeString()
          }
        ]);
      };
      img.onerror = () => {
        setLogs(prevLogs => [
          ...prevLogs,
          { 
            type: 'error', 
            message: `Test: Failed to load image from ${url}`,
            time: new Date().toLocaleTimeString()
          }
        ]);
      };
      img.src = url;
    } catch (error) {
      setLogs(prevLogs => [
        ...prevLogs,
        { 
          type: 'error', 
          message: `Test: Error loading ${url}: ${error.message}`,
          time: new Date().toLocaleTimeString()
        }
      ]);
    }
  };

  return (
    <div className={`debug-panel ${isOpen ? 'open' : 'closed'}`}>
      <button 
        className="debug-toggle"
        onClick={togglePanel}
        aria-label={isOpen ? "Close debug panel" : "Open debug panel"}
      >
        {isOpen ? "✕" : "🐞"}
      </button>
      
      {isOpen && (
        <div className="debug-content">
          <div className="debug-header">
            <h3>Background Image Debug Panel</h3>
            <button className="clear-button" onClick={clearLogs}>Clear Logs</button>
          </div>
          
          <div className="debug-section">
            <h4>Image Status</h4>
            <div className="status-info">
              <p><strong>Loaded:</strong> {imageInfo.loaded ? '✅ Yes' : '❌ No'}</p>
              {imageInfo.currentPath && (
                <p><strong>Path:</strong> {imageInfo.currentPath}</p>
              )}
              {imageInfo.error && (
                <p className="error-message"><strong>Error:</strong> {imageInfo.error}</p>
              )}
            </div>
          </div>
          
          <div className="debug-section">
            <h4>Test Image Loading</h4>
            <div className="test-actions">
              <button 
                className="test-button"
                onClick={() => testImageLoad('https://upload.wikimedia.org/wikipedia/commons/a/a7/Eug%C3%A8ne_Delacroix_-_La_libert%C3%A9_guidant_le_peuple.jpg')}
              >
                Test Direct Delacroix URL
              </button>
              <button 
                className="test-button"
                onClick={() => testImageLoad('https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1920px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg')}
              >
                Test Direct Van Gogh URL
              </button>
              <button 
                className="test-button"
                onClick={() => window.location.reload()}
              >
                Reload Page
              </button>
            </div>
          </div>
          
          <div className="debug-section logs-section">
            <h4>Background Image Logs</h4>
            <div className="logs-container">
              {logs.length === 0 ? (
                <p className="no-logs">No image-related logs yet.</p>
              ) : (
                logs.map((log, index) => (
                  <div 
                    key={index} 
                    className={`log-entry ${log.type}`}
                  >
                    <span className="log-time">[{log.time}]</span>
                    <span className="log-message">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;