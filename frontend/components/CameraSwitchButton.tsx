/**
 * CameraSwitchButton Component
 * 
 * Button for switching between front and back cameras on mobile devices.
 * Positioned in upper right section, visible only on mobile with multiple cameras.
 * 
 * Requirements: 7.1, 7.4, 7.5
 */

'use client';

import React from 'react';

interface CameraSwitchButtonProps {
  onClick: () => void;
  visible: boolean;
}

export default function CameraSwitchButton({
  onClick,
  visible
}: CameraSwitchButtonProps) {
  // Requirement 7.4: Hide when only one camera available
  // Requirement 7.5: Show only on mobile devices
  // Requirement 3.1, 3.2, 3.3: Responsive positioning and sizing
  if (!visible) {
    return null;
  }

  // Requirement 7.1: Display camera switch button in upper right section
  return (
    <div 
      className="absolute top-4 right-4 z-10"
      data-testid="camera-switch-button-container"
    >
      <button
        onClick={onClick}
        className="
          w-12 h-12 
          min-w-[44px] min-h-[44px]
          rounded-full 
          bg-white/90 
          backdrop-blur-sm
          border-2 border-gray-300
          flex items-center justify-center
          transition-all duration-200
          hover:bg-white 
          hover:scale-105
          active:scale-95
          shadow-lg
          cursor-pointer
        "
        data-testid="camera-switch-button"
        aria-label="Switch camera"
      >
        {/* Camera switch icon */}
        <svg
          className="w-6 h-6 text-gray-700"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          data-testid="camera-switch-icon"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
          />
        </svg>
      </button>
    </div>
  );
}
