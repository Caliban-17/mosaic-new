// Script to set up sound files for the application
// Run this with: node setupSounds.js

const fs = require('fs');
const path = require('path');
const https = require('https');

// Define sound URLs - using free sound effects from various sources
// Replace these with your preferred sounds
const SOUND_SOURCES = {
  'shatter.mp3': 'https://freesound.org/data/previews/277/277021_5324376-lq.mp3',
  'click.mp3': 'https://freesound.org/data/previews/18/18397_92921-lq.mp3',
  'modal.mp3': 'https://freesound.org/data/previews/536/536782_7574474-lq.mp3',
  'reset.mp3': 'https://freesound.org/data/previews/265/265115_4798567-lq.mp3'
};

// Create sounds directory in public folder
const soundsDir = path.join(__dirname, 'public', 'sounds');

// Create the directory if it doesn't exist
if (!fs.existsSync(soundsDir)) {
  console.log('Creating sounds directory...');
  fs.mkdirSync(soundsDir, { recursive: true });
}

// Download each sound file
Object.entries(SOUND_SOURCES).forEach(([filename, url]) => {
  const filePath = path.join(soundsDir, filename);
  
  // Skip if file already exists
  if (fs.existsSync(filePath)) {
    console.log(`Sound file ${filename} already exists, skipping...`);
    return;
  }
  
  console.log(`Downloading ${filename} from ${url}...`);
  
  // Create a write stream for the file
  const file = fs.createWriteStream(filePath);
  
  // Download the file
  https.get(url, (response) => {
    if (response.statusCode !== 200) {
      console.error(`Failed to download ${filename}: ${response.statusCode}`);
      file.close();
      fs.unlinkSync(filePath); // Delete the file
      return;
    }
    
    // Pipe the response to the file
    response.pipe(file);
    
    // When the file is done downloading
    file.on('finish', () => {
      file.close();
      console.log(`Downloaded ${filename}`);
    });
  }).on('error', (err) => {
    fs.unlinkSync(filePath); // Delete the file on error
    console.error(`Error downloading ${filename}: ${err.message}`);
  });
});

// Create placeholder sound files if downloading fails
const createPlaceholderSound = (filename) => {
  const filePath = path.join(soundsDir, filename);
  if (!fs.existsSync(filePath)) {
    console.log(`Creating placeholder for ${filename}...`);
    
    // Check if ffmpeg is available (optional)
    try {
      const { execSync } = require('child_process');
      const ffmpegCheck = execSync('ffmpeg -version', { stdio: 'pipe' });
      
      // If ffmpeg is available, create a short silent mp3
      const outputPath = path.join(soundsDir, filename);
      execSync(`ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 0.5 -q:a 9 -acodec libmp3lame ${outputPath}`);
      console.log(`Created placeholder sound ${filename} using ffmpeg`);
      return;
    } catch (error) {
      // FFmpeg not available, create an empty file
      console.log('FFmpeg not available, creating empty file');
    }
    
    // Create an empty file as fallback
    fs.writeFileSync(filePath, '');
    console.log(`Created empty placeholder for ${filename}`);
  }
};

// Check results after downloads and create placeholders if needed
setTimeout(() => {
  console.log('\nVerifying sound files...');
  Object.keys(SOUND_SOURCES).forEach(filename => {
    const filePath = path.join(soundsDir, filename);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).size === 0) {
      createPlaceholderSound(filename);
    } else {
      console.log(`✓ ${filename} is ready`);
    }
  });
  
  console.log('\nSound setup complete!');
  console.log('You can start the application with: npm start');
}, 5000);

console.log('Sound setup script running. This will download required sound effects for the Mosaic application.');
console.log('Once complete, the sounds will be available in the public/sounds directory.');