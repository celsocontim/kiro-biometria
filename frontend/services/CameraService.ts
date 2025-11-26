/**
 * CameraService
 * 
 * Handles all camera-related operations including:
 * - Requesting camera access with facing mode support
 * - Capturing video frames as base64 images
 * - Device detection (mobile vs desktop)
 * - Camera enumeration
 * - Stream cleanup
 * 
 * Requirements: 1.1, 1.4, 2.2, 7.2
 */

import type { CameraConstraints, FacingMode } from '@/types/camera.types';

export class CameraService {
  /**
   * Request camera access with specified facing mode
   * 
   * @param facingMode - 'user' for front camera, 'environment' for back camera
   * @param retryWithFallback - Whether to retry with fallback constraints on failure
   * @returns Promise resolving to MediaStream
   * @throws Error if camera access is denied or unavailable
   * 
   * Requirement 1.1: Display live camera feed
   * Requirement 1.4: Request camera permissions
   * Requirement 1.5: Display error messages for camera issues
   * Requirement 7.2: Toggle between front and back cameras
   */
  async requestCameraAccess(facingMode: FacingMode = 'user', retryWithFallback: boolean = true): Promise<MediaStream> {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('[CameraService] getUserMedia not supported');
        throw new Error('Camera access is not supported in this browser. Please use a modern browser like Chrome, Firefox, or Safari.');
      }

      // Check if we're on a secure context (HTTPS or localhost)
      if (!window.isSecureContext) {
        console.error('[CameraService] Not in secure context');
        throw new Error('Camera access requires a secure connection (HTTPS). Please access this page via HTTPS or localhost.');
      }

      // Determine appropriate resolution based on device type
      const isMobile = this.isMobileDevice();
      const idealWidth = isMobile ? 1280 : 1920;
      const idealHeight = isMobile ? 720 : 1080;

      const constraints: CameraConstraints = {
        video: {
          facingMode,
          width: { ideal: idealWidth },
          height: { ideal: idealHeight }
        },
        audio: false
      };

      console.log('[CameraService] Requesting camera access:', {
        facingMode,
        isMobile,
        resolution: `${idealWidth}x${idealHeight}`,
        timestamp: new Date().toISOString()
      });

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('[CameraService] Camera access granted:', {
        facingMode,
        tracks: stream.getVideoTracks().length,
        timestamp: new Date().toISOString()
      });

      return stream;
    } catch (error) {
      // Log error for debugging
      console.error('[CameraService] Camera access failed:', {
        facingMode,
        error: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });

      // Try fallback with relaxed constraints for OverconstrainedError
      if (error instanceof Error && error.name === 'OverconstrainedError' && retryWithFallback) {
        console.log('[CameraService] Retrying with fallback constraints');
        try {
          // Try with basic constraints (no resolution or facing mode preference)
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
          
          console.log('[CameraService] Camera access granted with fallback constraints');
          return fallbackStream;
        } catch (fallbackError) {
          console.error('[CameraService] Fallback also failed:', fallbackError);
          // Continue to error handling below
        }
      }

      if (error instanceof Error) {
        // Requirement 1.5: Handle specific error types with user-friendly messages
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          throw new Error('Camera access denied. Please allow camera permissions in your browser settings and refresh the page.');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          throw new Error('No camera found on this device. Please ensure your device has a working camera.');
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          throw new Error('Camera is already in use by another application. Please close other apps using the camera and try again.');
        } else if (error.name === 'OverconstrainedError') {
          throw new Error(`The requested camera (${facingMode === 'user' ? 'front' : 'back'}) is not available. Please try switching cameras.`);
        } else if (error.name === 'SecurityError') {
          throw new Error('Camera access blocked due to security settings. Please ensure you are using HTTPS or localhost.');
        } else if (error.name === 'TypeError') {
          throw new Error('Camera constraints are invalid. Please refresh the page and try again.');
        } else if (error.name === 'AbortError') {
          throw new Error('Camera access was interrupted. Please try again.');
        } else {
          throw new Error(`Failed to access camera: ${error.message}`);
        }
      }
      throw new Error('Failed to access camera due to an unknown error. Please refresh the page and try again.');
    }
  }

  /**
   * Capture current frame from video element as base64 image
   * 
   * @param videoElement - HTMLVideoElement displaying the camera stream
   * @returns Base64 encoded image data with data URI prefix
   * @throws Error if capture fails or video is not ready
   * 
   * Requirement 2.2: Capture current camera frame as image
   * Performance: Compress images to max 1MB
   */
  captureFrame(videoElement: HTMLVideoElement): string {
    try {
      // Validate video element state
      if (!videoElement) {
        throw new Error('Video element is not available');
      }

      if (videoElement.readyState < videoElement.HAVE_CURRENT_DATA) {
        throw new Error('Video stream is not ready. Please wait a moment and try again.');
      }

      if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        throw new Error('Video dimensions are invalid. Please ensure the camera is working properly.');
      }

      // Create canvas with video dimensions
      const canvas = document.createElement('canvas');
      let width = videoElement.videoWidth;
      let height = videoElement.videoHeight;
      
      // Resize if dimensions are too large (max 1920x1080)
      const maxWidth = 1920;
      const maxHeight = 1080;
      
      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;
        if (width > height) {
          width = maxWidth;
          height = Math.round(maxWidth / aspectRatio);
        } else {
          height = maxHeight;
          width = Math.round(maxHeight * aspectRatio);
        }
      }
      
      canvas.width = width;
      canvas.height = height;

      // Draw current video frame to canvas
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Failed to get canvas context. Your browser may not support this feature.');
      }

      context.drawImage(videoElement, 0, 0, width, height);

      // Convert to base64 JPEG with compression
      // Start with 0.8 quality and reduce if needed to stay under 1MB
      let quality = 0.8;
      let imageData = canvas.toDataURL('image/jpeg', quality);
      
      // Check size and reduce quality if needed (1MB = ~1.33MB base64)
      const maxBase64Size = 1.33 * 1024 * 1024; // 1MB in base64
      while (imageData.length > maxBase64Size && quality > 0.3) {
        quality -= 0.1;
        imageData = canvas.toDataURL('image/jpeg', quality);
      }

      // Validate that we got valid image data
      if (!imageData || !imageData.startsWith('data:image/')) {
        throw new Error('Failed to generate image data from video frame');
      }

      console.log('[CameraService] Frame captured successfully:', {
        originalDimensions: `${videoElement.videoWidth}x${videoElement.videoHeight}`,
        resizedDimensions: `${width}x${height}`,
        quality,
        dataSize: imageData.length,
        dataSizeMB: (imageData.length / (1024 * 1024)).toFixed(2),
        timestamp: new Date().toISOString()
      });

      return imageData;
    } catch (error) {
      console.error('[CameraService] Frame capture failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        videoReady: videoElement?.readyState,
        videoDimensions: `${videoElement?.videoWidth}x${videoElement?.videoHeight}`,
        timestamp: new Date().toISOString()
      });

      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Failed to capture image from camera. Please try again.');
    }
  }

  /**
   * Detect if the current device is mobile
   * 
   * @returns true if device is mobile, false otherwise
   * 
   * Requirement 7.2: Display camera switch button on mobile devices
   */
  isMobileDevice(): boolean {
    // Check user agent for mobile indicators
    const userAgent = navigator.userAgent || (window as any).opera || '';
    
    // Check for mobile patterns in user agent
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    const isMobileUA = mobileRegex.test(userAgent.toLowerCase());

    // Also check for touch support and screen size
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth < 768;

    // Consider it mobile if it matches UA pattern or has touch + small screen
    return isMobileUA || (hasTouchScreen && isSmallScreen);
  }

  /**
   * Get list of available camera devices
   * 
   * @returns Promise resolving to array of MediaDeviceInfo for video input devices
   * 
   * Requirement 7.2: Support camera switching
   */
  async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      return cameras;
    } catch (error) {
      console.error('Failed to enumerate cameras:', error);
      return [];
    }
  }

  /**
   * Stop camera stream and release resources
   * 
   * @param stream - MediaStream to stop
   * 
   * Requirement: Proper resource cleanup
   */
  stopStream(stream: MediaStream): void {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
    }
  }
}

// Export singleton instance
export const cameraService = new CameraService();
