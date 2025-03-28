// src/components/SoundControls.js
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './SoundControls.css';

const SoundControls = ({ soundEnabled, onToggleSound }) => {
  const [volumeOpen, setVolumeOpen] = useState(false);
  const [volume, setVolume] = useState(SoundUtils.volume);
  const controlsRef = useRef(null);
  
  // Handle clicking outside to close volume panel
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (controlsRef.current && !controlsRef.current.contains(event.target)) {
        setVolumeOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Handle volume change
  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    SoundUtils.setVolume(newVolume);
    
    // Play a sample sound at the new volume
    if (soundEnabled && newVolume > 0) {
      SoundUtils.play('click', { volume: 0.5 });
    }
  };
  
  // Toggle sound on/off
  const handleToggleSound = () => {
    onToggleSound();
    
    // Play a sound effect when enabling (if not already playing)
    if (!soundEnabled) {
      setTimeout(() => SoundUtils.play('click'), 100);
    }
  };
  
  // Play test sound for each sound effect
  const playTestSound = (soundName) => {
    if (!soundEnabled) return;
    SoundUtils.play(soundName);
  };
  
  return (
    <div className="sound-controls" ref={controlsRef}>
      {/* Main toggle button */}
      <button 
        className={`sound-toggle ${soundEnabled ? 'sound-on' : 'sound-off'}`}
        onClick={handleToggleSound}
        aria-label={soundEnabled ? "Mute sounds" : "Enable sounds"}
        title={soundEnabled ? "Sound On" : "Sound Off"}
      >
        {soundEnabled ? "🔊" : "🔇"}
      </button>
      
      {/* Settings button */}
      {soundEnabled && (
        <button 
          className={`sound-settings-toggle ${volumeOpen ? 'active' : ''}`}
          onClick={() => setVolumeOpen(!volumeOpen)}
          aria-label="Sound settings"
          title="Sound Settings"
        >
          ⚙️
        </button>
      )}
      
      {/* Volume panel */}
      {volumeOpen && soundEnabled && (
        <div className="volume-panel">
          <div className="volume-header">
            <span>Sound Settings</span>
            <button 
              className="close-panel"
              onClick={() => setVolumeOpen(false)}
              aria-label="Close sound settings"
            >
              ×
            </button>
          </div>
          
          <div className="volume-control">
            <span className="volume-label">Volume</span>
            <input 
              type="range" 
              min="0" 
              max="1" 
              step="0.05" 
              value={volume}
              onChange={handleVolumeChange}
              className="volume-slider"
              aria-label="Volume control"
            />
            <span className="volume-value">{Math.round(volume * 100)}%</span>
          </div>
          
          <div className="sound-test-section">
            <p className="test-header">Test Sounds</p>
            <div className="sound-test-buttons">
              <button 
                className="test-button"
                onClick={() => playTestSound('click')}
                disabled={!soundEnabled}
              >
                Click
              </button>
              <button 
                className="test-button"
                onClick={() => playTestSound('modal')}
                disabled={!soundEnabled}
              >
                Modal
              </button>
              <button 
                className="test-button"
                onClick={() => playTestSound('shatter')}
                disabled={!soundEnabled}
              >
                Shatter
              </button>
              <button 
                className="test-button"
                onClick={() => playTestSound('reset')}
                disabled={!soundEnabled}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Add PropTypes validation
SoundControls.propTypes = {
  soundEnabled: PropTypes.bool,
  onToggleSound: PropTypes.func
};

export default SoundControls;