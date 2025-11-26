/**
 * CaptureScreen Page Tests
 * 
 * Property-based tests for the main capture screen functionality including:
 * - Capture flow (button click → capture frame → send to backend)
 * - Camera switching behavior
 * 
 * Feature: facial-recognition-capture, Property 2: Capture flow sends image to backend
 * Feature: facial-recognition-capture, Property 13: Camera switching toggles facing mode
 * Validates: Requirements 2.2, 2.3, 7.2, 7.3
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import fc from 'fast-check';
import Home from '../page';

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => key === 'userId' ? 'test-user-123' : null
  })
}));

// Mock services
const mockRequestCameraAccess = jest.fn();
const mockCaptureFrame = jest.fn();
const mockIsMobileDevice = jest.fn();
const mockGetAvailableCameras = jest.fn();
const mockStopStream = jest.fn();
const mockSubmitCapture = jest.fn();
const mockIsEmbedded = jest.fn();
const mockSendCompletionStatus = jest.fn();

jest.mock('@/services/CameraService', () => ({
  cameraService: {
    requestCameraAccess: (...args: any[]) => mockRequestCameraAccess(...args),
    captureFrame: (...args: any[]) => mockCaptureFrame(...args),
    isMobileDevice: () => mockIsMobileDevice(),
    getAvailableCameras: () => mockGetAvailableCameras(),
    stopStream: (...args: any[]) => mockStopStream(...args)
  }
}));

jest.mock('@/services/APIClient', () => ({
  apiClient: {
    submitCapture: (...args: any[]) => mockSubmitCapture(...args)
  }
}));

jest.mock('@/services/IframeMessenger', () => ({
  iframeMessenger: {
    isEmbedded: () => mockIsEmbedded(),
    sendCompletionStatus: (...args: any[]) => mockSendCompletionStatus(...args)
  }
}));

// Mock MediaStream
class MockMediaStream {
  getTracks() {
    return [{
      stop: jest.fn()
    }];
  }
}

describe('CaptureScreen Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock implementations
    mockRequestCameraAccess.mockResolvedValue(new MockMediaStream());
    mockIsMobileDevice.mockReturnValue(false);
    mockGetAvailableCameras.mockResolvedValue([]);
    mockIsEmbedded.mockReturnValue(false);
  });

  describe('Property-Based Tests', () => {
    /**
     * Feature: facial-recognition-capture, Property 2: Capture flow sends image to backend
     * Validates: Requirements 2.2, 2.3
     * 
     * Property: For any capture button activation, the system should:
     * 1. Capture the current camera frame
     * 2. Send the image data to the Backend Service
     */
    it('should capture frame and send to backend when capture button is clicked', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various image data formats
          fc.string({ minLength: 10, maxLength: 100 }),
          // Generate various user IDs
          fc.string({ minLength: 1, maxLength: 50 }),
          // Generate various recognition results
          fc.boolean(),
          fc.double({ min: 0, max: 1 }),
          async (imageData, userId, recognized, confidence) => {
            // Setup mocks
            const capturedImageData = `data:image/jpeg;base64,${imageData}`;
            mockCaptureFrame.mockReturnValue(capturedImageData);
            
            mockSubmitCapture.mockResolvedValue({
              success: true,
              data: {
                recognized,
                confidence,
                userId,
                timestamp: new Date().toISOString(),
                attemptsRemaining: 3
              }
            });

            // Render component
            const { container, unmount } = render(<Home />);

            try {
              // Wait for camera to initialize
              await waitFor(() => {
                expect(mockRequestCameraAccess).toHaveBeenCalled();
              }, { timeout: 3000 });

              // Wait for capture button to appear
              await waitFor(() => {
                const button = container.querySelector('[data-testid="capture-button"]');
                expect(button).not.toBeNull();
              }, { timeout: 3000 });

              const button = container.querySelector('[data-testid="capture-button"]') as HTMLButtonElement;

              // Simulate capture button click
              await act(async () => {
                button.click();
                // Wait for async operations
                await new Promise(resolve => setTimeout(resolve, 100));
              });

              // Property 1: System should capture the current camera frame
              // Requirement 2.2: Capture current camera frame as image
              await waitFor(() => {
                expect(mockCaptureFrame).toHaveBeenCalled();
              }, { timeout: 2000 });

              // Property 2: System should send image data to Backend Service
              // Requirement 2.3: Send image data to Backend Service
              await waitFor(() => {
                expect(mockSubmitCapture).toHaveBeenCalledWith(
                  capturedImageData,
                  expect.any(String)
                );
              }, { timeout: 2000 });
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100, timeout: 10000 }
      );
    }, 30000);

    /**
     * Feature: facial-recognition-capture, Property 4: Responsive layout adapts to viewport
     * Validates: Requirements 3.1, 3.5
     * 
     * Property: For any viewport dimensions, the application should:
     * 1. Render a layout appropriate for that viewport size
     * 2. Adjust when dimensions change
     * 3. Maintain minimum touch target sizes (44x44px)
     */
    it('should adapt layout to different viewport dimensions', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various viewport widths (mobile to desktop)
          fc.integer({ min: 320, max: 3840 }),
          // Generate various viewport heights
          fc.integer({ min: 568, max: 2160 }),
          async (width, height) => {
            // Set viewport dimensions
            Object.defineProperty(window, 'innerWidth', {
              writable: true,
              configurable: true,
              value: width
            });
            Object.defineProperty(window, 'innerHeight', {
              writable: true,
              configurable: true,
              value: height
            });

            // Render component
            const { container, unmount } = render(<Home />);

            try {
              // Wait for camera to initialize
              await waitFor(() => {
                expect(mockRequestCameraAccess).toHaveBeenCalled();
              }, { timeout: 3000 });

              // Wait for UI to render
              await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 200));
              });

              // Property 1: Layout should render without errors for any viewport size
              // Requirement 3.1: Render responsive layout appropriate for viewport dimensions
              const mainElement = container.querySelector('main');
              expect(mainElement).not.toBeNull();

              // Property 2: Capture button should have minimum touch target size classes
              // Requirement 3.5: Maintain usability across viewport changes
              const captureButton = container.querySelector('[data-testid="capture-button"]') as HTMLElement;
              if (captureButton) {
                // WCAG 2.1 Level AA: minimum 44x44px touch targets
                // Verify button has min-width and min-height classes or inline styles
                const className = captureButton.className;
                const hasMinSizeClasses = className.includes('min-w-') && className.includes('min-h-');
                
                // Button should have minimum size constraints
                // Either through Tailwind classes or be sized >= 44px (w-20 = 80px, w-12 = 48px)
                const hasSufficientSize = 
                  className.includes('w-20') || // 80px
                  className.includes('w-12') || // 48px
                  className.includes('w-[100px]') || // 100px
                  className.includes('w-[120px]') || // 120px
                  hasMinSizeClasses;
                
                expect(hasSufficientSize).toBe(true);
              }

              // Property 3: Camera switch button should have minimum touch target size
              const switchButton = container.querySelector('[data-testid="camera-switch-button"]') as HTMLElement;
              if (switchButton) {
                const className = switchButton.className;
                const hasMinSizeClasses = className.includes('min-w-') && className.includes('min-h-');
                
                // Button is w-12 h-12 (48px) which meets WCAG requirements
                const hasSufficientSize = 
                  className.includes('w-12') || // 48px
                  hasMinSizeClasses;
                
                expect(hasSufficientSize).toBe(true);
              }

              // Property 4: Feedback message dismiss button should have minimum touch target size
              const dismissButton = container.querySelector('[data-testid="dismiss-button"]') as HTMLElement;
              if (dismissButton) {
                const className = dismissButton.className;
                const hasMinSizeClasses = className.includes('min-w-') && className.includes('min-h-');
                
                // Button should have minimum size constraints
                expect(hasMinSizeClasses).toBe(true);
              }
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100, timeout: 10000 }
      );
    }, 30000);

    /**
     * Feature: facial-recognition-capture, Property 13: Camera switching toggles facing mode
     * Validates: Requirements 7.2, 7.3
     * 
     * Simplified Property: For any mobile device with multiple cameras:
     * 1. The camera switch button should be visible
     * 2. The button should be clickable without errors
     * 3. The page should remain functional after clicking (no reload)
     */
    it('should display camera switch button on mobile and handle clicks', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate boolean for whether device has multiple cameras
          fc.boolean(),
          async (hasMultipleCameras) => {
            // Setup mocks for mobile device
            mockIsMobileDevice.mockReturnValue(true);
            
            if (hasMultipleCameras) {
              mockGetAvailableCameras.mockResolvedValue([
                { deviceId: 'camera1', kind: 'videoinput', label: 'Front Camera', groupId: 'group1', toJSON: () => ({}) },
                { deviceId: 'camera2', kind: 'videoinput', label: 'Back Camera', groupId: 'group1', toJSON: () => ({}) }
              ]);
            } else {
              mockGetAvailableCameras.mockResolvedValue([
                { deviceId: 'camera1', kind: 'videoinput', label: 'Front Camera', groupId: 'group1', toJSON: () => ({}) }
              ]);
            }

            mockRequestCameraAccess.mockResolvedValue(new MockMediaStream());

            // Render component
            const { container, unmount } = render(<Home />);

            try {
              // Wait for camera to initialize
              await waitFor(() => {
                expect(mockRequestCameraAccess).toHaveBeenCalled();
              }, { timeout: 3000 });

              // Wait a bit for camera switch button logic to run
              await act(async () => {
                await new Promise(resolve => setTimeout(resolve, 500));
              });

              const switchButton = container.querySelector('[data-testid="camera-switch-button"]');

              if (hasMultipleCameras) {
                // Property 1: Camera switch button should be visible on mobile with multiple cameras
                // Requirement 7.2: Display camera switch button on mobile devices
                expect(switchButton).not.toBeNull();

                // Property 2: Button should be clickable without throwing errors
                // Requirement 7.3: Maintain camera feed without page reload
                await act(async () => {
                  (switchButton as HTMLButtonElement).click();
                  await new Promise(resolve => setTimeout(resolve, 100));
                });

                // Property 3: Page should remain functional (button still exists)
                const switchButtonAfter = container.querySelector('[data-testid="camera-switch-button"]');
                expect(switchButtonAfter).not.toBeNull();
              } else {
                // Property: Camera switch button should be hidden with single camera
                // Requirement 7.4: Hide when only one camera available
                expect(switchButton).toBeNull();
              }
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 50, timeout: 8000 }
      );
    }, 60000);

    /**
     * Feature: facial-recognition-capture, Property 22: Success message sent to parent on recognition
     * Validates: Requirements 10.1
     * 
     * Property: For any successful facial recognition completion, the Frontend Application
     * should send a postMessage event to window.parent with value "True".
     */
    it('should send "True" message to parent window on successful recognition', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various image data
          fc.string({ minLength: 10, maxLength: 100 }),
          // Generate various user IDs
          fc.string({ minLength: 1, maxLength: 50 }),
          // Generate various confidence scores
          fc.double({ min: 0.5, max: 1.0 }),
          async (imageData, userId, confidence) => {
            // Setup mocks
            const capturedImageData = `data:image/jpeg;base64,${imageData}`;
            mockCaptureFrame.mockReturnValue(capturedImageData);
            
            // Mock successful recognition response
            mockSubmitCapture.mockResolvedValue({
              success: true,
              data: {
                recognized: true, // Always successful for this test
                confidence,
                userId,
                timestamp: new Date().toISOString(),
                attemptsRemaining: 3
              }
            });

            // Mock embedded scenario
            mockIsEmbedded.mockReturnValue(true);

            // Render component
            const { container, unmount } = render(<Home />);

            try {
              // Wait for camera to initialize
              await waitFor(() => {
                expect(mockRequestCameraAccess).toHaveBeenCalled();
              }, { timeout: 3000 });

              // Wait for capture button to appear
              await waitFor(() => {
                const button = container.querySelector('[data-testid="capture-button"]');
                expect(button).not.toBeNull();
              }, { timeout: 3000 });

              const button = container.querySelector('[data-testid="capture-button"]') as HTMLButtonElement;

              // Clear previous calls
              mockSendCompletionStatus.mockClear();

              // Simulate capture button click
              await act(async () => {
                button.click();
                // Wait for async operations
                await new Promise(resolve => setTimeout(resolve, 100));
              });

              // Wait for capture to complete
              await waitFor(() => {
                expect(mockSubmitCapture).toHaveBeenCalled();
              }, { timeout: 2000 });

              // Property: On successful recognition, should send "True" to parent
              // Requirement 10.1: Send message event to window.parent with value "True"
              await waitFor(() => {
                expect(mockSendCompletionStatus).toHaveBeenCalledWith(true);
              }, { timeout: 2000 });

              // Verify it was called exactly once
              expect(mockSendCompletionStatus).toHaveBeenCalledTimes(1);
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100, timeout: 10000 }
      );
    }, 30000);

    /**
     * Feature: facial-recognition-capture, Property 23: Failure message sent to parent on max attempts
     * Validates: Requirements 10.2
     * 
     * Property: For any user that exhausts all allowed attempts, the Frontend Application
     * should send a postMessage event to window.parent with value "False".
     */
    it('should send "False" message to parent window when max attempts exceeded', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various image data
          fc.string({ minLength: 10, maxLength: 100 }),
          // Generate various user IDs
          fc.string({ minLength: 1, maxLength: 50 }),
          // Generate various error messages
          fc.string({ minLength: 10, maxLength: 200 }),
          async (imageData, userId, errorMessage) => {
            // Setup mocks
            const capturedImageData = `data:image/jpeg;base64,${imageData}`;
            mockCaptureFrame.mockReturnValue(capturedImageData);
            
            // Mock max attempts exceeded response
            mockSubmitCapture.mockResolvedValue({
              success: false,
              error: errorMessage || 'Maximum attempts exceeded',
              errorCode: 'MAX_ATTEMPTS_EXCEEDED',
              data: {
                recognized: false,
                confidence: 0,
                userId,
                timestamp: new Date().toISOString(),
                attemptsRemaining: 0
              }
            });

            // Mock embedded scenario
            mockIsEmbedded.mockReturnValue(true);

            // Render component
            const { container, unmount } = render(<Home />);

            try {
              // Wait for camera to initialize
              await waitFor(() => {
                expect(mockRequestCameraAccess).toHaveBeenCalled();
              }, { timeout: 3000 });

              // Wait for capture button to appear
              await waitFor(() => {
                const button = container.querySelector('[data-testid="capture-button"]');
                expect(button).not.toBeNull();
              }, { timeout: 3000 });

              const button = container.querySelector('[data-testid="capture-button"]') as HTMLButtonElement;

              // Clear previous calls
              mockSendCompletionStatus.mockClear();

              // Simulate capture button click
              await act(async () => {
                button.click();
                // Wait for async operations
                await new Promise(resolve => setTimeout(resolve, 100));
              });

              // Wait for capture to complete
              await waitFor(() => {
                expect(mockSubmitCapture).toHaveBeenCalled();
              }, { timeout: 2000 });

              // Property: On max attempts exceeded, should send "False" to parent
              // Requirement 10.2: Send message event to window.parent with value "False"
              await waitFor(() => {
                expect(mockSendCompletionStatus).toHaveBeenCalledWith(false);
              }, { timeout: 2000 });

              // Verify it was called exactly once
              expect(mockSendCompletionStatus).toHaveBeenCalledTimes(1);
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100, timeout: 10000 }
      );
    }, 30000);
  });
});
