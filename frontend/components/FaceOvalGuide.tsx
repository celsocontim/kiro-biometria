/**
 * FaceOvalGuide Component
 * 
 * SVG-based vertical oval overlay indicating optimal face positioning.
 * Responsive to viewport dimensions with centered and proportional sizing.
 * 
 * Requirements: 1.2, 1.3
 */

'use client';

import React, { useEffect, useState } from 'react';

interface FaceOvalGuideProps {
  width: number;
  height: number;
}

export default function FaceOvalGuide({ width, height }: FaceOvalGuideProps) {
  // Calculate oval dimensions based on viewport
  // Requirement 1.2: Overlay vertical oval Face Oval Guide in center of viewport
  // Requirement 1.3: Maintain Face Oval Guide centered and proportionally sized
  
  // Oval should be proportional to viewport
  // Use 60% of viewport height for mobile, 50% for larger screens
  const isMobile = width < 768;
  const heightPercentage = isMobile ? 0.6 : 0.5;
  
  // Calculate oval dimensions (vertical oval: height > width)
  const ovalHeight = height * heightPercentage;
  const ovalWidth = ovalHeight * 0.7; // Width is 70% of height for vertical oval
  
  // Center the oval in the viewport
  const centerX = width / 2;
  const centerY = height / 2;
  
  return (
    <div 
      className="absolute inset-0 pointer-events-none"
      data-testid="face-oval-guide"
      style={{
        width: `${width}px`,
        height: `${height}px`
      }}
    >
      <svg
        width={width}
        height={height}
        className="absolute top-0 left-0"
        data-testid="face-oval-svg"
      >
        {/* Semi-transparent overlay with oval cutout */}
        <defs>
          <mask id="oval-mask">
            {/* White background */}
            <rect x="0" y="0" width={width} height={height} fill="white" />
            {/* Black oval (cutout) */}
            <ellipse
              cx={centerX}
              cy={centerY}
              rx={ovalWidth / 2}
              ry={ovalHeight / 2}
              fill="black"
            />
          </mask>
        </defs>
        
        {/* Dark overlay with oval cutout */}
        <rect
          x="0"
          y="0"
          width={width}
          height={height}
          fill="rgba(0, 0, 0, 0.5)"
          mask="url(#oval-mask)"
        />
        
        {/* Oval border/guide */}
        <ellipse
          cx={centerX}
          cy={centerY}
          rx={ovalWidth / 2}
          ry={ovalHeight / 2}
          fill="none"
          stroke="white"
          strokeWidth="3"
          strokeDasharray="10 5"
          data-testid="oval-border"
        />
      </svg>
    </div>
  );
}

/**
 * Hook to get current viewport dimensions
 * Used by parent components to pass width/height to FaceOvalGuide
 */
export function useViewportDimensions() {
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    // Set initial dimensions
    handleResize();

    // Add event listener with debouncing
    let timeoutId: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(handleResize, 250);
    };

    window.addEventListener('resize', debouncedResize);

    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(timeoutId);
    };
  }, []);

  return dimensions;
}
