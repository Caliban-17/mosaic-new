/* eslint-env node */

// backgroundSetup.js
// A simple node script to generate a placeholder background image
// Run with: node backgroundSetup.js

const fs = require('fs');
const https = require('https');
const path = require('path');

// Define potential image URLs (free-to-use paintings)
const IMAGE_SOURCES = [
  // Liberty Leading the People by Eugène Delacroix (public domain)
  'https://upload.wikimedia.org/wikipedia/commons/a/a7/Eug%C3%A8ne_Delacroix_-_La_libert%C3%A9_guidant_le_peuple.jpg',
  // The Great Wave off Kanagawa (public domain)
  'https://upload.wikimedia.org/wikipedia/commons/0/0d/Great_Wave_off_Kanagawa2.jpg',
  // Starry Night by Vincent van Gogh (public domain)
  'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1920px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg',
  // Relativity by M.C. Escher (as a fallback)
  'https://upload.wikimedia.org/wikipedia/en/a/a3/Escher%27s_Relativity.jpg'
];

// Public directory path
const publicDir = path.join(__dirname, '..', '..', 'public');

// File paths to try
const filePaths = [
  path.join(publicDir, 'lady-liberty.jpg'),
  path.join(publicDir, 'lady-liberty.jpeg')
];

// Function to download image
const downloadImage = (url, filePath) => {
  return new Promise((resolve, reject) => {
    console.log(`Attempting to download image from ${url} to ${filePath}`);
    
    const file = fs.createWriteStream(filePath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download image: ${response.statusCode}`));
        file.close();
        fs.unlink(filePath, () => {}); // Delete the file
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`Successfully downloaded ${filePath}`);
        resolve(true);
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {}); // Delete the file
      reject(err);
    });
  });
};

// Check if image already exists
const existingImageCheck = filePaths.some(filePath => {
  if (fs.existsSync(filePath)) {
    console.log(`Found existing image at ${filePath}`);
    return true;
  }
  return false;
});

if (existingImageCheck) {
  console.log('Background image already exists. No need to download.');
  // eslint-disable-next-line no-undef
  process.exit(0);
}

// If image doesn't exist, download it
console.log('No existing background image found. Attempting to download...');

// Try each source URL until one works
const tryDownloadFromSources = async () => {
  for (let i = 0; i < IMAGE_SOURCES.length; i++) {
    const url = IMAGE_SOURCES[i];
    try {
      // Try to download to lady-liberty.jpg
      await downloadImage(url, filePaths[0]);
      console.log('SUCCESS: Image downloaded successfully!');
      return true;
    } catch (error) {
      console.log(`Error downloading from source ${i+1}:`, error.message);
    }
  }
  return false;
};

// Execute download attempt
tryDownloadFromSources()
  .then(success => {
    if (success) {
      console.log('Background image setup complete!');
    } else {
      console.log('Failed to download background image from any source.');
      console.log('Please manually place a background image at public/lady-liberty.jpg');
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
  });