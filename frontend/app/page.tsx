/**
 * CaptureScreen Page
 * 
 * Main page component that orchestrates the facial recognition capture flow.
 * Integrates all child components and manages application state.
 * 
 * Requirements: 2.2, 2.3, 4.1, 7.2, 7.3
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import CameraFeed from '@/components/CameraFeed';
import FaceOvalGuide from '@/components/FaceOvalGuide';
import CaptureButton from '@/components/CaptureButton';
import CameraSwitchButton from '@/components/CameraSwitchButton';
import SuccessScreen from '@/components/SuccessScreen';
import FeedbackMessage, { FeedbackType } from '@/components/FeedbackMessage';
import { cameraService } from '@/services/CameraService';
import { apiClient } from '@/services/APIClient';
import { iframeMessenger } from '@/services/IframeMessenger';
import type { FacingMode } from '@/types/camera.types';

export default function Home() {
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // Get userId from query params
  // Requirement 4.1: Generate or accept User Identifier
  const userId = searchParams.get('userId') || 'default-user';
  
  // Container ref for dimensions
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  
  // Application state
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>('user');
  const [isCapturing, setIsCapturing] = useState(false);
  const [recognitionSuccess, setRecognitionSuccess] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  
  // Feedback state
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('loading');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | undefined>(undefined);
  
  // Camera switching state
  const [showCameraSwitch, setShowCameraSwitch] = useState(false);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  
  // Check if device is mobile and has multiple cameras
  useEffect(() => {
    const checkCameraAvailability = async () => {
      const isMobile = cameraService.isMobileDevice();
      if (isMobile) {
        const cameras = await cameraService.getAvailableCameras();
        setShowCameraSwitch(cameras.length > 1);
      }
    };
    
    checkCameraAvailability();
  }, []);
  
  // Track container dimensions for FaceOvalGuide
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerDimensions({ width: rect.width, height: rect.height });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, [cameraStream]);
  
  // Store video element ref for capture
  useEffect(() => {
    if (cameraStream) {
      const videoElement = document.querySelector('video[data-testid="camera-video"]') as HTMLVideoElement;
      if (videoElement) {
        videoRef.current = videoElement;
      }
    }
  }, [cameraStream]);
  
  // Handle camera stream ready
  const handleStreamReady = (stream: MediaStream) => {
    setCameraStream(stream);
  };
  
  // Handle camera errors
  const handleCameraError = (error: Error) => {
    setFeedbackType('error');
    setFeedbackMessage(error.message);
    setFeedbackVisible(true);
  };
  
  // Handle camera switching
  // Requirement 7.2: Toggle between front and back cameras
  // Requirement 7.3: Maintain camera feed without page reload
  const handleCameraSwitch = async () => {
    if (isSwitchingCamera) return;
    
    setIsSwitchingCamera(true);
    
    // Toggle facing mode
    const newFacingMode: FacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    
    // Add small delay to allow camera to switch
    setTimeout(() => {
      setIsSwitchingCamera(false);
    }, 500);
  };
  
  // Handle capture button click
  // Requirement 2.2: Capture current camera frame as image
  // Requirement 2.3: Send image data to Backend Service
  // Requirements: 1.5, 4.4, 5.4 - Error handling throughout capture flow
  const handleCapture = async () => {
    if (!videoRef.current || !cameraStream || isCapturing || recognitionSuccess || isLocked) {
      return;
    }
    
    try {
      // Set capturing state
      setIsCapturing(true);
      setFeedbackType('loading');
      setFeedbackMessage('Processing your image...');
      setFeedbackVisible(true);
      
      // Capture frame from video element
      let imageData: string;
      try {
        imageData = cameraService.captureFrame(videoRef.current);
      } catch (captureError) {
        console.error('[CaptureScreen] Failed to capture frame:', captureError);
        throw new Error('Failed to capture image from camera. Please try again.');
      }
      
      // Send to backend
      const response = await apiClient.submitCapture(imageData, userId);
      
      // Handle response
      if (response.success && response.data?.recognized) {
        // Success - face recognized
        console.log('[CaptureScreen] Recognition successful:', {
          userId,
          confidence: response.data.confidence,
          timestamp: new Date().toISOString()
        });
        
        setRecognitionSuccess(true);
        setFeedbackType('success');
        setFeedbackMessage('Face recognized successfully!');
        setFeedbackVisible(true);
        
        // Send success message to parent window if embedded
        iframeMessenger.sendCompletionStatus(true);
      } else if (response.errorCode === 'MAX_ATTEMPTS_EXCEEDED') {
        // Requirement 8.2: Handle max attempts exceeded
        console.warn('[CaptureScreen] Max attempts exceeded:', {
          userId,
          timestamp: new Date().toISOString()
        });
        
        setIsLocked(true);
        setFeedbackType('error');
        setFeedbackMessage(response.error || 'Maximum attempts exceeded. Please contact support for assistance.');
        setAttemptsRemaining(0);
        setFeedbackVisible(true);
        
        // Send failure message to parent window if embedded
        iframeMessenger.sendCompletionStatus(false);
      } else if (response.errorCode === 'LIVENESS_CHECK_ERROR') {
        // Handle spoof detection
        console.log('Spoff');
        console.warn('[CaptureScreen] Spoof attempt detected:', {
          userId,
          error: response.error,
          errorCode: response.errorCode,
          timestamp: new Date().toISOString()
        });
        
        setFeedbackType('error');
        setFeedbackMessage(response.error || 'Spoof attempt! Make sure to use a real face!');
        setFeedbackVisible(true);
      } else if (response.error && response.error.toLowerCase().includes('spoof')) {
        // Handle spoof detection (fallback check)
        console.log('Spoff');
        console.warn('[CaptureScreen] Spoof attempt detected (via message):', {
          userId,
          error: response.error,
          timestamp: new Date().toISOString()
        });
        
        setFeedbackType('error');
        setFeedbackMessage(response.error);
        setFeedbackVisible(true);
      } else if (response.errorCode === 'INVALID_REQUEST') {
        // Requirement 4.4: Handle validation errors
        console.error('[CaptureScreen] Invalid request:', {
          userId,
          error: response.error,
          timestamp: new Date().toISOString()
        });
        
        setFeedbackType('error');
        setFeedbackMessage(response.error || 'Invalid request. Please refresh the page and try again.');
        setFeedbackVisible(true);
      } else if (response.errorCode === 'SERVER_ERROR') {
        // Requirement 5.4: Handle server errors
        console.error('[CaptureScreen] Server error:', {
          userId,
          error: response.error,
          timestamp: new Date().toISOString()
        });
        
        setFeedbackType('error');
        setFeedbackMessage(response.error || 'Server error. Please try again in a moment.');
        setFeedbackVisible(true);
      } else {
        // Recognition failed but can retry
        console.log('[CaptureScreen] Recognition failed:', {
          userId,
          attemptsRemaining: response.data?.attemptsRemaining,
          timestamp: new Date().toISOString()
        });
        
        setFeedbackType('error');
        setFeedbackMessage(response.error || 'Face not recognized. Please position your face within the guide and try again.');
        setAttemptsRemaining(response.data?.attemptsRemaining);
        setFeedbackVisible(true);
      }
    } catch (error) {
      // Handle unexpected errors
      console.error('[CaptureScreen] Unexpected error during capture:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      
      setFeedbackType('error');
      setFeedbackMessage(
        error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred. Please try again.'
      );
      setFeedbackVisible(true);
    } finally {
      setIsCapturing(false);
    }
  };
  
  // Handle feedback dismissal
  const handleFeedbackDismiss = () => {
    setFeedbackVisible(false);
  };
  
  // Show success screen if recognition was successful
  if (recognitionSuccess) {
    return <SuccessScreen userId={userId} />;
  }
  
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black">
      {/* Feedback Message */}
      <FeedbackMessage
        type={feedbackType}
        message={feedbackMessage}
        attemptsRemaining={attemptsRemaining}
        onDismiss={handleFeedbackDismiss}
        visible={feedbackVisible}
      />
      
      {/* Camera Feed Container - Full Screen */}
      <div className="absolute inset-0 bg-black">
        <div 
          ref={containerRef}
          className="relative w-full h-full"
        >
          <CameraFeed
            stream={cameraStream}
            onStreamReady={handleStreamReady}
            onError={handleCameraError}
            facingMode={facingMode}
          />
          
          {/* User ID Display */}
          <div className="absolute top-4 left-4 z-20 max-w-[50vw]">
            <p 
              className="text-white font-bold break-words"
              style={{
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.8), 1px -1px 2px rgba(0, 0, 0, 0.8), -1px 1px 2px rgba(0, 0, 0, 0.8)',
                fontSize: 'clamp(1rem, 4vw, 2rem)'
              }}
            >
              {userId}
            </p>
          </div>
          
          {/* Face Oval Guide Overlay */}
          {cameraStream && containerDimensions.width > 0 && (
            <FaceOvalGuide width={containerDimensions.width} height={containerDimensions.height} />
          )}
          
          {/* Camera Switch Button (mobile only) */}
          {cameraStream && !recognitionSuccess && (
            <CameraSwitchButton
              onClick={handleCameraSwitch}
              visible={showCameraSwitch && !isLocked}
            />
          )}
          
          {/* Capture Button */}
          {cameraStream && !recognitionSuccess && (
            <CaptureButton
              onClick={handleCapture}
              disabled={isCapturing || isLocked}
              isLoading={isCapturing}
            />
          )}
        </div>
      </div>
    </main>
  );
}
