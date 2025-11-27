/**
 * FeedbackMessage Component
 * 
 * Displays feedback messages to users during and after capture process.
 * Supports success and error message types with appropriate styling.
 * Auto-dismisses success messages after 3 seconds.
 * Allows manual dismissal of error messages.
 * Shows loading indicator during capture.
 * Displays attempts remaining when available.
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5
 */

'use client';

import React, { useEffect } from 'react';

export type FeedbackType = 'success' | 'error' | 'loading';

export interface FeedbackMessageProps {
  /** Type of feedback message */
  type: FeedbackType;
  
  /** Message text to display */
  message: string;
  
  /** Number of attempts remaining (optional) */
  attemptsRemaining?: number;
  
  /** Callback when message is dismissed */
  onDismiss?: () => void;
  
  /** Whether to show the message */
  visible: boolean;
}

export default function FeedbackMessage({
  type,
  message,
  attemptsRemaining,
  onDismiss,
  visible
}: FeedbackMessageProps) {
  // Auto-dismiss messages after 10 seconds (success after 3 seconds)
  useEffect(() => {
    if (visible && onDismiss) {
      const timeout = type === 'success' ? 3000 : 10000;
      const timer = setTimeout(() => {
        onDismiss();
      }, timeout);
      
      return () => clearTimeout(timer);
    }
  }, [visible, type, onDismiss]);

  if (!visible) {
    return null;
  }

  // Requirement 6.1: Display loading indicator during capture
  // Requirement 3.1, 3.2, 3.3: Responsive layout with max-width constraints
  if (type === 'loading') {
    return (
      <div
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center p-4 bg-blue-500 text-white shadow-lg"
        data-testid="feedback-loading"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center space-x-3 w-full md:max-w-[600px] px-4">
          <div 
            className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"
            data-testid="loading-spinner"
          />
          <span className="text-base md:text-lg font-medium">{message}</span>
        </div>
      </div>
    );
  }

  // Requirement 6.2: Display success message
  if (type === 'success') {
    return (
      <div
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center p-4 bg-green-500 text-white shadow-lg animate-slide-down"
        data-testid="feedback-success"
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-center space-x-3 w-full md:max-w-[600px] px-4">
          <svg
            className="w-6 h-6 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            data-testid="success-icon"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="text-base md:text-lg font-medium flex-grow">{message}</span>
        </div>
      </div>
    );
  }

  // Requirement 6.3: Display error message with details
  // Requirement 6.5: Allow manual dismissal of error messages
  if (type === 'error') {
    return (
      <div
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center p-4 bg-red-500 text-white shadow-lg animate-slide-down"
        data-testid="feedback-error"
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-center space-x-3 w-full md:max-w-[600px] px-4">
          <svg
            className="w-6 h-6 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            data-testid="error-icon"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-grow">
            <p className="text-base md:text-lg font-medium">{message}</p>
            {attemptsRemaining !== undefined && attemptsRemaining >= 0 && attemptsRemaining !== 99 && (
              <p 
                className="text-sm mt-1 opacity-90"
                data-testid="attempts-remaining"
              >
                Attempts remaining: {attemptsRemaining}
              </p>
            )}
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="flex-shrink-0 p-1 hover:bg-red-600 rounded transition-colors min-w-[44px] min-h-[44px]"
              aria-label="Dismiss message"
              data-testid="dismiss-button"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
