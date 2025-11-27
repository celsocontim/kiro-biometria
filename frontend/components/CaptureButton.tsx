/**
 * CaptureButton Component
 * 
 * Button component with loading state for triggering photo capture.
 * Handles disabled state during capture and applies responsive sizing.
 * 
 * Requirements: 2.1, 2.4, 2.5
 */

'use client';

import React from 'react';

interface CaptureButtonProps {
  onClick: () => void;
  disabled: boolean;
  isLoading: boolean;
}

export default function CaptureButton({
  onClick,
  disabled,
  isLoading
}: CaptureButtonProps) {
  // Requirement 2.1: Render Capture Button in lower half of viewport
  // Requirement 2.4: Disable button until capture process completes
  // Requirement 2.5: Re-enable button when capture process completes
  // Requirement 3.1, 3.2, 3.3, 3.4: Responsive sizing across breakpoints
  
  return (
    <div 
      className="absolute bottom-10 md:bottom-[60px] lg:bottom-[80px] left-1/2 transform -translate-x-1/2 z-10"
      data-testid="capture-button-container"
    >
      <button
        onClick={onClick}
        disabled={disabled || isLoading}
        className={`
          px-8 py-4 md:px-12 md:py-5 lg:px-16 lg:py-6
          rounded-full
          bg-green-700 text-white
          font-semibold text-lg md:text-xl lg:text-2xl
          shadow-lg
          transition-all duration-200
          ${disabled || isLoading 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:bg-green-800 active:scale-95 cursor-pointer'
          }
          ${isLoading ? 'animate-pulse' : ''}
          min-w-[160px] md:min-w-[200px] lg:min-w-[240px]
        `}
        data-testid="capture-button"
        aria-label={isLoading ? 'Capturando foto...' : 'Capturar foto'}
      >
        {isLoading ? 'Processando...' : 'Capturar'}
      </button>
    </div>
  );
}
