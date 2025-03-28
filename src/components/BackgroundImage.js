import React, { useState } from 'react';
import './BackgroundImage.css';

// This version directly embeds an image URL rather than testing local paths
const BackgroundImage = () => {
  const [imageLoaded, setImageLoaded] = useState(false);

  // Direct links to public domain artwork
  const imageUrl = "https://upload.wikimedia.org/wikipedia/commons/a/a7/Eug%C3%A8ne_Delacroix_-_La_libert%C3%A9_guidant_le_peuple.jpg";
  
  // Fallback URL in case the first one fails
  const fallbackUrl = "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/1920px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg";

  // Handle image load success
  const handleImageLoad = () => {
    console.log('Background image loaded successfully');
    setImageLoaded(true);
  };

  // Handle image load error
  const handleImageError = (e) => {
    console.error('Failed to load primary background image, trying fallback');
    // Try the fallback image
    e.target.src = fallbackUrl;
    e.target.onerror = () => {
      console.error('Fallback image also failed to load');
      // If fallback also fails, we still want to show something
      setImageLoaded(true); // Let the UI show something
    };
  };

  return (
    <div className="background-image-container">
      {!imageLoaded && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading background image...</p>
        </div>
      )}
      
      <img 
        className={`background-image ${imageLoaded ? 'loaded' : ''}`}
        src={imageUrl}
        alt="Liberty Leading the People by Eugène Delacroix"
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
    </div>
  );
};

export default BackgroundImage;