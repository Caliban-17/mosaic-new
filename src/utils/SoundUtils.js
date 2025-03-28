/**
 * Utility for handling sound effects across the application
 * Enhanced with spatial audio and more advanced features
 */
const SoundUtils = {
    // Sound enabled status
    enabled: true,
    
    // Volume level (0-1)
    volume: 0.5,
    
    // Sound cache
    audioCache: {},
    
    // Sound definitions with enhanced variety
    sounds: {
      shatter: {
        path: '/sounds/shatter.mp3',
        volume: 1.0,
        variations: 1  // Number of variations (future expansion)
      },
      click: {
        path: '/sounds/click.mp3',
        volume: 0.8,
        variations: 1
      },
      modal: {
        path: '/sounds/modal.mp3',
        volume: 0.7,
        variations: 1
      },
      reset: {
        path: '/sounds/reset.mp3',
        volume: 0.9,
        variations: 1
      }
    },
    
    // Context for spatial audio
    audioContext: null,
    
    // Initialize - create audio context and load preferences
    init() {
      // Try to load preference from localStorage
      if (typeof localStorage !== 'undefined') {
        const storedEnabled = localStorage.getItem('mosaicSoundEnabled');
        if (storedEnabled !== null) {
          this.enabled = storedEnabled === 'true';
        }
        
        const storedVolume = localStorage.getItem('mosaicSoundVolume');
        if (storedVolume !== null) {
          this.volume = parseFloat(storedVolume);
        }
      }
      
      // Initialize Web Audio API if supported
      try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        if (window.AudioContext) {
          this.audioContext = new AudioContext();
        }
      } catch (e) {
        console.warn('Web Audio API not supported in this browser');
      }
      
      return this;
    },
    
    // Preload sounds with enhanced error handling
    preloadSounds() {
      // Only preload if sounds are enabled
      if (!this.enabled) return this;
      
      Object.entries(this.sounds).forEach(([name, config]) => {
        try {
          // Create and configure audio element
          const audio = new Audio();
          audio.src = config.path;
          audio.preload = 'auto';
          
          // Set volume based on individual sound settings and master volume
          audio.volume = config.volume * this.volume;
          
          // Store in cache
          this.audioCache[name] = audio;
          
          // Add event listeners for better error handling
          audio.addEventListener('error', (e) => {
            console.warn(`Error loading sound ${name}:`, e);
          });
        } catch (e) {
          console.warn(`Error preloading sound ${name}:`, e);
        }
      });
      
      return this;
    },
    
    // Play a sound with enhanced features
    play(name, options = {}) {
      if (!this.enabled) return false;
      
      // Default options
      const defaults = {
        volume: 1.0,        // Individual sound volume multiplier
        pitch: 1.0,         // Pitch variation (1.0 is normal)
        position: null,     // Optional position {x, y} for spatial audio
        loop: false,        // Whether to loop the sound
        stopOthers: false   // Whether to stop other sounds of same type
      };
      
      // Merge defaults with provided options
      const settings = { ...defaults, ...options };
      
      try {
        // Config for this sound
        const soundConfig = this.sounds[name] || { volume: 1.0 };
        
        // Check if sound exists in cache
        if (this.audioCache[name]) {
          // Stop if it's already playing and stopOthers is true
          if (settings.stopOthers) {
            this.stop(name);
          }
          
          // Clone the audio node for overlapping sounds
          const sound = this.audioCache[name].cloneNode();
          
          // Apply volume settings - combine master, sound-specific, and instance volumes
          sound.volume = this.volume * soundConfig.volume * settings.volume;
          
          // Apply pitch with Web Audio API if available
          if (this.audioContext && settings.pitch !== 1.0) {
            this.playWithPitch(sound, settings.pitch, settings.position);
            return true;
          }
          
          // Apply spatial audio if position provided and Web Audio API available
          if (this.audioContext && settings.position) {
            this.playSpatial(sound, settings.position);
            return true;
          }
          
          // Standard playback
          sound.loop = settings.loop;
          sound.play().catch(e => console.warn(`Error playing sound ${name}:`, e));
          return true;
        } 
        
        // If not in cache but defined, create and play
        if (this.sounds[name]) {
          const audio = new Audio(this.sounds[name].path);
          audio.volume = this.volume * soundConfig.volume * settings.volume;
          audio.loop = settings.loop;
          audio.play().catch(e => console.warn(`Error playing sound ${name}:`, e));
          
          // Add to cache
          this.audioCache[name] = audio;
          return true;
        }
      } catch (e) {
        console.warn(`Error playing sound ${name}:`, e);
      }
      
      return false;
    },
    
    // Advanced playback with pitch control
    playWithPitch(audioElement, pitch, position = null) {
      try {
        // Create source from audio element
        const source = this.audioContext.createMediaElementSource(audioElement);
        
        // Create pitch shifter
        const pitchShifter = this.audioContext.createBiquadFilter();
        pitchShifter.type = 'allpass';
        
        // Connect the nodes
        source.connect(pitchShifter);
        
        // Apply position if provided
        if (position) {
          const panner = this.createPanner(position);
          pitchShifter.connect(panner);
          panner.connect(this.audioContext.destination);
        } else {
          pitchShifter.connect(this.audioContext.destination);
        }
        
        // Play with adjusted playback rate for pitch
        audioElement.preservesPitch = false;
        audioElement.playbackRate = pitch;
        audioElement.play().catch(e => console.warn('Error playing pitched audio:', e));
      } catch (e) {
        console.warn('Error applying pitch shift:', e);
        // Fallback to normal playback
        audioElement.play().catch(e => console.warn('Error playing audio fallback:', e));
      }
    },
    
    // Spatial audio playback
    playSpatial(audioElement, position) {
      try {
        // Create source
        const source = this.audioContext.createMediaElementSource(audioElement);
        
        // Create and configure panner
        const panner = this.createPanner(position);
        
        // Connect nodes
        source.connect(panner);
        panner.connect(this.audioContext.destination);
        
        // Play the audio
        audioElement.play().catch(e => console.warn('Error playing spatial audio:', e));
      } catch (e) {
        console.warn('Error applying spatial audio:', e);
        // Fallback to normal playback
        audioElement.play().catch(e => console.warn('Error playing audio fallback:', e));
      }
    },
    
    // Helper to create a panner node
    createPanner(position) {
      // Create panner node
      const panner = this.audioContext.createPanner();
      
      // Set panner attributes
      panner.panningModel = 'HRTF';
      panner.distanceModel = 'inverse';
      panner.refDistance = 1;
      panner.maxDistance = 10000;
      panner.rolloffFactor = 1;
      
      // Normalize position to audio space
      // Assuming canvas is centered at (0,0,0) and position is relative to that
      const canvasWidth = window.innerWidth;
      const canvasHeight = window.innerHeight;
      
      // Map x from [0, canvasWidth] to [-5, 5]
      // Map y from [0, canvasHeight] to [5, -5] (reversed because y is inverted in browser)
      const x = ((position.x / canvasWidth) * 10) - 5;
      const y = 5 - ((position.y / canvasHeight) * 10);
      const z = -1; // Slightly in front of listener
      
      // Position the audio source
      panner.positionX.value = x;
      panner.positionY.value = y;
      panner.positionZ.value = z;
      
      return panner;
    },
    
    // Stop sound playback
    stop(name) {
      if (this.audioCache[name]) {
        this.audioCache[name].pause();
        this.audioCache[name].currentTime = 0;
      }
    },
    
    // Stop all sounds
    stopAll() {
      Object.values(this.audioCache).forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
    },
    
    // Toggle sounds on/off
    toggleSounds(enabled) {
      this.enabled = enabled !== undefined ? enabled : !this.enabled;
      
      // If disabling, stop all sounds
      if (!this.enabled) {
        this.stopAll();
      }
      
      // Save preference
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('mosaicSoundEnabled', this.enabled.toString());
      }
      
      return this.enabled;
    },
    
    // Set volume with enhanced control
    setVolume(volume) {
      this.volume = Math.max(0, Math.min(1, volume));
      
      // Update all cached audio elements
      Object.entries(this.audioCache).forEach(([name, audio]) => {
        const soundConfig = this.sounds[name] || { volume: 1.0 };
        audio.volume = this.volume * soundConfig.volume;
      });
      
      // Save preference
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('mosaicSoundVolume', this.volume.toString());
      }
      
      return this.volume;
    },
    
    // Get current audio status
    getStatus() {
      return {
        enabled: this.enabled,
        volume: this.volume,
        webAudioSupported: !!this.audioContext,
        loadedSounds: Object.keys(this.audioCache)
      };
    }
  };
  
  // Initialize on load
  SoundUtils.init();
  
  export default SoundUtils;