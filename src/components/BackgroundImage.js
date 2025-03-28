import React, { useState, useEffect, useRef } from 'react';
import './BackgroundImage.css';

// This component specifically handles the background image loading
const BackgroundImage = () => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef(null);

  // List of possible image paths to try - using both .jpg and .jpeg extensions
  const imagePaths = [
    // JPG extensions (matching your actual file)
    '/lady-liberty.jpg',
    './lady-liberty.jpg',
    'lady-liberty.jpg',
    `${process.env.PUBLIC_URL}/lady-liberty.jpg`,
    '/images/lady-liberty.jpg',
    '/public/lady-liberty.jpg',
    
    // JPEG extensions (in case of future changes)
    '/lady-liberty.jpeg',
    './lady-liberty.jpeg',
    'lady-liberty.jpeg',
    `${process.env.PUBLIC_URL}/lady-liberty.jpeg`,
    '/images/lady-liberty.jpeg',
    '/public/lady-liberty.jpeg'
  ];

  // Try to load the image from each path
  useEffect(() => {
    let currentPathIndex = 0;
    let mounted = true;

    const tryLoadImage = () => {
      if (!mounted || currentPathIndex >= imagePaths.length) {
        if (mounted && !imageLoaded) {
          console.error("Failed to load background image from any path");
          setImageError(true);
        }
        return;
      }

      const img = new Image();
      img.onload = () => {
        if (mounted) {
          console.log(`Successfully loaded image from: ${imagePaths[currentPathIndex]}`);
          setImageLoaded(true);
          if (imgRef.current) {
            imgRef.current.src = imagePaths[currentPathIndex];
          }
        }
      };
      
      img.onerror = () => {
        if (mounted) {
          console.warn(`Failed to load image from: ${imagePaths[currentPathIndex]}`);
          currentPathIndex++;
          tryLoadImage();
        }
      };

      img.src = imagePaths[currentPathIndex];
    };

    tryLoadImage();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="background-image-container">
      {!imageLoaded && !imageError && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading background image...</p>
        </div>
      )}
      
      <img 
        ref={imgRef}
        className={`background-image ${imageLoaded ? 'loaded' : ''}`}
        src={imageError ? '' : ''}
        alt="Liberty Leading the People background"
      />
      
      {imageError && (
        <div className="error-message">
          <p>Could not load background image. Please check your image paths.</p>
        </div>
      )}
    </div>
  );
};

export default BackgroundImage;