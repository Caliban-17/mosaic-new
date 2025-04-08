
/**
 * Utility for handling sound effects across the application
 * Simplified loading strategy to potentially avoid Range Request issues.
 */
const SoundUtils = {
    // Sound enabled status
    enabled: true,

    // Volume level (0-1)
    volume: 0.5,

    // Sound cache - Stores *instances* ready to be cloned
    audioCache: {},

    // Sound definitions with paths corrected using PUBLIC_URL
    sounds: {
      shatter: {
        // eslint-disable-next-line no-undef
        path: process.env.PUBLIC_URL + '/sounds/shatter.mp3',
        volume: 1.0
      },
      click: {
        // eslint-disable-next-line no-undef
        path: process.env.PUBLIC_URL + '/sounds/click.mp3',
        volume: 0.8
      },
      modal: {
        // eslint-disable-next-line no-undef
        path: process.env.PUBLIC_URL + '/sounds/modal.mp3',
        volume: 0.7
      },
      reset: {
        // eslint-disable-next-line no-undef
        path: process.env.PUBLIC_URL + '/sounds/reset.mp3',
        volume: 0.9
      }
    },

    // Context for spatial audio
    audioContext: null,

    // Initialize - create audio context and load preferences
    init() {
      if (typeof localStorage !== 'undefined') {
        const storedEnabled = localStorage.getItem('mosaicSoundEnabled');
        if (storedEnabled !== null) this.enabled = storedEnabled === 'true';
        const storedVolume = localStorage.getItem('mosaicSoundVolume');
        if (storedVolume !== null) {
            const parsedVolume = parseFloat(storedVolume);
            this.volume = (!isNaN(parsedVolume) && parsedVolume >= 0 && parsedVolume <= 1) ? parsedVolume : 0.5;
        }
      }
      try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        if (window.AudioContext) {
           this.audioContext = new AudioContext();
           if (this.audioContext.state === 'suspended') {
               const resumeContext = () => { this.audioContext?.resume().catch(e => console.error('Error resuming AC:', e)); document.removeEventListener('click', resumeContext); document.removeEventListener('keydown', resumeContext); };
               document.addEventListener('click', resumeContext, { once: true }); document.addEventListener('keydown', resumeContext, { once: true });
           }
        }
      } catch (e) { console.warn('Web Audio API not supported:', e); }
      // No explicit preloading here anymore
      return this;
    },

    // Preload function - now does nothing or minimal setup if needed later
    preloadSounds() {
      // console.log("Preloading skipped/no longer necessary with this strategy.");
      return this; // Keep chainable
    },

    // Play a sound - Creates/Clones on demand
    play(name, options = {}) {
      if (!this.enabled) return false;
      const defaults = { volume: 1.0, pitch: 1.0, position: null, loop: false, stopOthers: false };
      const settings = { ...defaults, ...options };

      try {
        const soundConfig = this.sounds[name];
        if (!soundConfig || !soundConfig.path) { console.warn(`Sound not defined: ${name}`); return false; }

        let soundToPlay;
        let isCloned = false;

        // Check if a base instance exists in cache to clone
        if (this.audioCache[name]) {
            if (settings.stopOthers) {
                this.stop(name); // Stop the original cached instance if needed
            }
            soundToPlay = this.audioCache[name].cloneNode(); // Clone for playback
            isCloned = true;
            // console.log(`Cloning sound ${name}`);
        } else {
            // Create first instance AND cache it
            // console.log(`Creating first instance for ${name}`);
            soundToPlay = new Audio(soundConfig.path);
            // Add error handler immediately
            soundToPlay.addEventListener('error', (e) => { console.error(`Error loading sound ${name} at ${soundToPlay.src}:`, e); });
            // Store the *first* created instance in the cache for future cloning
            this.audioCache[name] = soundToPlay;
        }

        // Configure the instance we are about to play (clone or first)
        soundToPlay.volume = this.volume * (soundConfig.volume ?? 1.0) * settings.volume;
        soundToPlay.loop = settings.loop;

        if (settings.pitch !== 1.0) {
            try { soundToPlay.preservesPitch = false; soundToPlay.playbackRate = settings.pitch; }
            catch (e) { console.warn(`Pitch change failed for ${name}:`, e); }
        } else {
            soundToPlay.preservesPitch = true; soundToPlay.playbackRate = 1.0;
        }

        // Handle Web Audio API features (like spatialization) for the specific instance
        if (this.audioContext && settings.position && settings.pitch === 1.0) {
            // Spatialization likely requires connecting the specific soundToPlay instance
            // This might need adjustment if playSpatial expected the *cached* element before
            return this.playSpatial(soundToPlay, settings.position);
        }

        // Standard playback
        // If it's a clone, it needs its own error handler? Maybe not, inherits state? Add one to be safe.
        if(isCloned) {
             soundToPlay.addEventListener('error', (e) => { console.error(`Error playing cloned sound ${name} at ${soundToPlay.src}:`, e); });
        }

        // Reset currentTime only if not looping? Usually good practice before play.
        if (!soundToPlay.loop) {
            soundToPlay.currentTime = 0;
        }


        soundToPlay.play().then(() => {
            // Play started successfully
            // console.log(`Playing ${name}`);
        }).catch(e => {
            console.warn(`Error playing ${name}:`, e.name, e.message);
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume().catch(err => console.error('Error resuming context on play fail:', err));
            }
        });

        return true; // Indicate play was attempted

      } catch (e) { console.warn(`Generic play error for ${name}:`, e); }
      return false;
    },

    // Spatial audio playback - Expects the specific Audio element to connect
    playSpatial(audioElement, position) {
      if (!this.audioContext) { audioElement.play().catch(e => console.warn('Error playing fallback:', e)); return true; }
       if (this.audioContext.state === 'suspended') {
           return this.audioContext.resume().then(() => this._doPlaySpatial(audioElement, position))
             .catch(e => { console.error('Error resuming context for spatial:', e); audioElement.play().catch(err => console.warn('Error playing fallback after resume fail:', err)); return false; });
       } else { return this._doPlaySpatial(audioElement, position); }
    },

    // Internal function for spatial play
    _doPlaySpatial(audioElement, position) {
       try {
         // Source must be created *once* per element. This might error if element is reused/cloned improperly.
         // Let's try catching specific error if source already exists? Or ensure playSpatial gets a fresh element.
         // Assuming `audioElement` passed here is always a fresh clone or first instance.
         const source = this.audioContext.createMediaElementSource(audioElement);
         const panner = this.createPanner(position);
         if (!panner) throw new Error("Panner creation failed");
         source.connect(panner); panner.connect(this.audioContext.destination);
         audioElement.play().catch(e => console.warn('Error playing spatial:', e)); return true;
       } catch (e) {
           // Catch common "InvalidStateNode" error if source already exists for this element
           if (e.name === 'InvalidStateError') {
               console.warn(`MediaElementSource already exists for this audio element (${audioElement.src}). Reusing may not work as expected. Playing non-spatially.`);
           } else {
                console.warn('Error setting up spatial graph:', e);
            }
           // Fallback to normal play if graph fails
           audioElement.play().catch(err => console.warn('Error playing fallback:', err));
           return false;
       }
     },

    // Helper to create a panner node - Simplified version
    createPanner(position) {
      if (!this.audioContext) return null;
      const panner = this.audioContext.createPanner();
      panner.panningModel = 'HRTF'; panner.distanceModel = 'inverse';
      panner.refDistance = 1; panner.maxDistance = 10000; panner.rolloffFactor = 1;
      panner.coneInnerAngle = 360; panner.coneOuterAngle = 360; panner.coneOuterGain = 0;
       if (this.audioContext.listener.positionX) {
           this.audioContext.listener.positionX.value = 0; this.audioContext.listener.positionY.value = 0; this.audioContext.listener.positionZ.value = 0;
           this.audioContext.listener.forwardX.value = 0; this.audioContext.listener.forwardY.value = 0; this.audioContext.listener.forwardZ.value = -1;
           this.audioContext.listener.upX.value = 0; this.audioContext.listener.upY.value = 1; this.audioContext.listener.upZ.value = 0;
       } else { this.audioContext.listener.setPosition(0, 0, 0); this.audioContext.listener.setOrientation(0, 0, -1, 0, 1, 0); }
      const audioSpaceScale = 5;
      const normX = position?.x ?? 0.5; const normY = position?.y ?? 0.5;
      const x = (normX - 0.5) * 2 * audioSpaceScale; const y = (0.5 - normY) * 2 * audioSpaceScale; const z = -0.5;
       if (panner.positionX) {
           panner.positionX.setValueAtTime(x, this.audioContext.currentTime); panner.positionY.setValueAtTime(y, this.audioContext.currentTime); panner.positionZ.setValueAtTime(z, this.audioContext.currentTime);
       } else { panner.setPosition(x, y, z); }
      return panner;
    },

    // Stop sound playback (stops the *cached* instance)
    stop(name) {
      if (this.audioCache[name]) {
         try { if (!this.audioCache[name].paused) this.audioCache[name].pause(); this.audioCache[name].currentTime = 0; }
         catch(e) { /* Intentional: Ignore errors during stop */ }
      }
    },

    // Stop all sounds (stops all *cached* instances)
    stopAll() {
      Object.values(this.audioCache).forEach(audio => {
         try { if (!audio.paused) audio.pause(); audio.currentTime = 0; }
         catch (e) { /* Intentional: Ignore errors during stopAll */ }
      });
    },

    // Toggle sounds on/off
    toggleSounds(enabled) {
      this.enabled = enabled !== undefined ? enabled : !this.enabled;
      if (!this.enabled) this.stopAll();
      if (typeof localStorage !== 'undefined') localStorage.setItem('mosaicSoundEnabled', this.enabled.toString());
      if (this.enabled && this.audioContext && this.audioContext.state === 'suspended') { this.audioContext.resume().catch(e => console.error('Error resuming context on toggle:', e)); }
      return this.enabled;
    },

    // Set volume (updates cached instance volumes)
    setVolume(volume) {
      this.volume = Math.max(0, Math.min(1, volume));
      Object.entries(this.sounds).forEach(([name, config]) => {
         if (this.audioCache[name]) this.audioCache[name].volume = this.volume * (config.volume ?? 1.0);
      });
      if (typeof localStorage !== 'undefined') localStorage.setItem('mosaicSoundVolume', this.volume.toString());
      return this.volume;
    },

    // Get current audio status
    getStatus() {
      return {
        enabled: this.enabled, volume: this.volume,
        webAudioSupported: !!this.audioContext, audioContextState: this.audioContext ? this.audioContext.state : 'unavailable',
        loadedSounds: Object.keys(this.audioCache) // Sounds attempted to cache
      };
    }
  };

  // Initialize on load
  SoundUtils.init();

  export default SoundUtils;
