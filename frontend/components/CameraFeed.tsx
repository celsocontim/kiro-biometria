/**
 * CameraFeed Component
 * 
 * Displays live camera feed with MediaStream rendering.
 * Handles camera permission requests, error messages, and stream lifecycle.
 * 
 * Requirements: 1.1, 1.4, 1.5, 7.2, 7.3
 */

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cameraService } from '@/services/CameraService';
import type { FacingMode } from '@/types/camera.types';

interface CameraFeedProps {
  stream: MediaStream | null;
  onStreamReady: (stream: MediaStream) => void;
  onError: (error: Error) => void;
  facingMode: FacingMode;
}

export default function CameraFeed({
  stream,
  onStreamReady,
  onError,
  facingMode
}: CameraFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 1; // Allow one retry for transient errors

  // Request camera access when component mounts or facingMode changes
  useEffect(() => {
    let mounted = true;
    let currentStream: MediaStream | null = null;
    let loadingTimeout: NodeJS.Timeout | null = null;

    const initializeCamera = async (attempt: number = 0) => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        // Request camera access with specified facing mode
        // Requirement 1.1: Display live camera feed
        // Requirement 1.4: Request camera permissions
        // Requirement 7.2: Toggle between front and back cameras
        const newStream = await cameraService.requestCameraAccess(facingMode);
        
        if (!mounted) {
          // Component unmounted during async operation, cleanup
          cameraService.stopStream(newStream);
          return;
        }

        currentStream = newStream;

        // Attach stream to video element
        if (videoRef.current) {
          videoRef.current.srcObject = newStream;
          console.log('[CameraFeed] Stream attached to video element');
        }

        // Notify parent component that stream is ready
        onStreamReady(newStream);
        
        // Hide loading after a short delay to ensure video starts
        loadingTimeout = setTimeout(() => {
          console.log('[CameraFeed] Hiding loading indicator');
          if (mounted) {
            setIsLoading(false);
          }
        }, 500);
        
        setRetryCount(0); // Reset retry count on success
      } catch (error) {
        if (!mounted) return;

        const err = error instanceof Error ? error : new Error('Unknown error accessing camera');
        
        // Retry for transient errors (AbortError, NotReadableError)
        const isTransientError = err.message.includes('interrupted') || 
                                 err.message.includes('already in use');
        
        if (isTransientError && attempt < maxRetries) {
          console.log(`[CameraFeed] Retrying camera access (attempt ${attempt + 1}/${maxRetries})`);
          setRetryCount(attempt + 1);
          
          // Wait a bit before retrying
          setTimeout(() => {
            if (mounted) {
              initializeCamera(attempt + 1);
            }
          }, 1000);
          return;
        }
        
        // Requirement 1.5: Display error message for permission denial or camera unavailable
        setErrorMessage(err.message);
        setIsLoading(false);
        setRetryCount(0);
        onError(err);
      }
    };

    initializeCamera();

    // Cleanup function to stop stream when component unmounts or facingMode changes
    // Requirement 7.3: Maintain camera feed without requiring page reload
    return () => {
      mounted = false;
      if (loadingTimeout) clearTimeout(loadingTimeout);
      if (currentStream) {
        cameraService.stopStream(currentStream);
      }
    };
  }, [facingMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update video element when stream prop changes
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      // Ensure video plays
      videoRef.current.play().catch(err => {
        console.error('[CameraFeed] Failed to play video:', err);
      });
    }
  }, [stream]);

  return (
    <div className="relative w-full h-full bg-black">
      {/* Video element for camera feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{ display: isLoading || errorMessage ? 'none' : 'block' }}
        data-testid="camera-video"
      />

      {/* Loading indicator */}
      {isLoading && !errorMessage && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gray-900"
          data-testid="camera-loading"
        >
          <div className="text-center">
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-white border-r-transparent mb-4"></div>
            <p className="text-white text-lg">Requesting camera access...</p>
            <p className="text-gray-400 text-sm mt-2">Please allow camera permissions when prompted</p>
            <button 
              onClick={() => {
                console.log('[CameraFeed] Debug - isLoading:', isLoading, 'errorMessage:', errorMessage, 'videoRef:', videoRef.current, 'srcObject:', videoRef.current?.srcObject);
                setIsLoading(false);
              }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
            >
              Force Show Video (Debug)
            </button>
          </div>
        </div>
      )}

      {/* Error message display */}
      {/* Requirement 1.5: Display error messages for permission denial or camera unavailable */}
      {errorMessage && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gray-900 p-6"
          data-testid="camera-error"
        >
          <div className="text-center max-w-md">
            <div className="mb-4">
              <svg 
                className="mx-auto h-16 w-16 text-red-500" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Camera Access Error</h3>
            <p className="text-gray-300 mb-4">{errorMessage}</p>
            <div className="text-sm text-gray-400 mb-4">
              <p className="mb-2">To use this feature, please:</p>
              <ul className="list-disc list-inside text-left">
                <li>Grant camera permissions in your browser settings</li>
                <li>Ensure no other application is using the camera</li>
                <li>Check that your device has a working camera</li>
              </ul>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              data-testid="retry-button"
            >
              Reload Page
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
