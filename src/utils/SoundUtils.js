/**
 * Utility for handling sound effects across the application
 */
const SoundUtils = {
    // Sound enabled status
    enabled: true,
    
    // Volume level (0-1)
    volume: 0.5,
    
    // Sound cache
    audioCache: {},
    
    // Sound definitions
    sounds: {
      shatter: '/sounds/shatter.mp3',
      click: '/sounds/click.mp3',
      modal: '/sounds/modal.mp3',
      reset: '/sounds/reset.mp3',
    },
    
    // Initialize - create placeholder sounds if needed
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
      
      return this;
    },
    
    // Preload sounds
    preloadSounds() {
      // Only preload if sounds are enabled
      if (!this.enabled) return;
      
      Object.entries(this.sounds).forEach(([name, path]) => {
        try {
          const audio = new Audio();
          audio.src = path;
          audio.preload = 'auto';
          audio.volume = this.volume;
          this.audioCache[name] = audio;
        } catch (e) {
          console.warn(`Error preloading sound ${name}:`, e);
        }
      });
      
      return this;
    },
    
    // Play a sound
    play(name) {
      if (!this.enabled) return false;
      
      try {
        // Check if sound exists in cache
        if (this.audioCache[name]) {
          const sound = this.audioCache[name];
          sound.currentTime = 0;
          sound.volume = this.volume;
          sound.play().catch(e => console.warn(`Error playing sound ${name}:`, e));
          return true;
        } 
        
        // If not in cache but defined, create and play
        if (this.sounds[name]) {
          const audio = new Audio(this.sounds[name]);
          audio.volume = this.volume;
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
    
    // Toggle sounds on/off
    toggleSounds(enabled) {
      this.enabled = enabled !== undefined ? enabled : !this.enabled;
      
      // Save preference
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('mosaicSoundEnabled', this.enabled.toString());
      }
      
      return this.enabled;
    },
    
    // Set volume
    setVolume(volume) {
      this.volume = Math.max(0, Math.min(1, volume));
      
      // Update all cached audio elements
      Object.values(this.audioCache).forEach(audio => {
        audio.volume = this.volume;
      });
      
      // Save preference
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('mosaicSoundVolume', this.volume.toString());
      }
      
      return this.volume;
    }
  };
  
  // Initialize on load
  SoundUtils.init();
  
  export default SoundUtils;