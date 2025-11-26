# Implementation Plan

- [x] 1. Set up project structure





  - Create Next.js frontend project with TypeScript and Tailwind CSS
  - Create Node.js/Express backend project with TypeScript
  - Configure build tools and development environment
  - Set up CORS configuration for frontend-backend communication
  - Configure CSP headers to allow iframe embedding from `http://personal-zx6yray0.outsystemscloud.com/`
  - _Requirements: 11.1, 11.4, 10.4_

- [x] 2. Implement backend configuration service





  - Create configuration schema and TypeScript interfaces
  - Implement configuration loading from environment variables or file
  - Add configuration reload mechanism (polling or file watch)
  - Set default values for maxFailureAttempts and other settings
  - _Requirements: 8.3, 8.5_

- [x] 2.1 Write property test for configuration reload


  - **Property 17: Configuration loaded without deployment**
  - **Validates: Requirements 8.3, 8.5**

- [x] 3. Implement backend failure tracking service





  - Create FailureTrackingService interface and implementation
  - Implement in-memory storage for development (Map-based)
  - Add methods for recording failures, checking lock status, and resetting
  - Implement getRemainingAttempts logic
  - _Requirements: 8.1, 8.2, 8.4_

- [x] 3.1 Write property test for failure count increment


  - **Property 15: Failure count increments on failed recognition**
  - **Validates: Requirements 8.1**

- [x] 3.2 Write property test for user lockout


  - **Property 16: User locked after max failures**
  - **Validates: Requirements 8.2**

- [x] 3.3 Write property test for failure reset


  - **Property 18: Failure count resets on success**
  - **Validates: Requirements 8.4**

- [x] 4. Implement backend recognition service with mock





  - Create RecognitionService interface
  - Implement mock recognition that returns random success/failure
  - Add placeholder for future real API integration
  - Include userId in recognition result
  - _Requirements: 5.1, 5.2, 5.5_

- [x] 5. Implement backend API endpoint





  - Create POST /api/capture route
  - Implement request validation (userId, imageData)
  - Integrate failure tracking to check if user is locked
  - Call recognition service and handle response
  - Update failure count based on recognition result
  - Return appropriate response with attemptsRemaining
  - Handle errors and return proper status codes (200, 400, 403, 500)
  - _Requirements: 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 8.1, 8.2, 8.4_

- [x] 5.1 Write property test for user identifier validation


  - **Property 6: User identifier validation**
  - **Validates: Requirements 4.3**

- [x] 5.2 Write property test for API request structure


  - **Property 7: Backend sends complete API requests**
  - **Validates: Requirements 5.1, 5.2**

- [x] 5.3 Write property test for response forwarding


  - **Property 8: Backend parses and forwards API responses**
  - **Validates: Requirements 5.3**

- [x] 5.4 Write property test for user identifier inclusion


  - **Property 5: User identifier included in API requests**
  - **Validates: Requirements 4.2**

- [x] 6. Checkpoint - Backend core functionality





  - Ensure all tests pass, ask the user if questions arise

- [x] 7. Implement frontend camera service





  - Create CameraService with MediaStream API integration
  - Implement requestCameraAccess with facingMode support
  - Add captureFrame method to capture video frame as base64
  - Implement isMobileDevice detection
  - Add getAvailableCameras method
  - Implement stopStream cleanup
  - _Requirements: 1.1, 1.4, 2.2, 7.2_

- [-] 8. Implement frontend iframe messenger service






  - Create IframeMessenger service
  - Implement isEmbedded detection (check window.parent !== window)
  - Add sendCompletionStatus method using postMessage
  - Handle cases where parent window doesn't exist
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 8.1 Write property test for iframe detection






  - **Property 25: Iframe detection**
  - **Validates: Requirements 10.4**

- [ ] 8.2 Write property test for postMessage usage
  - **Property 24: PostMessage API used for parent communication**
  - **Validates: Requirements 10.3**

- [x] 9. Implement frontend API client





  - Create APIClient service for backend communication
  - Implement submitCapture method with proper error handling
  - Add timeout handling (30 seconds)
  - Parse and return RecognitionResponse
  - _Requirements: 2.3, 11.1_

- [x] 9.1 Write property test for HTTP API communication


  - **Property 14: Frontend communicates via HTTP API**
  - **Validates: Requirements 11.1**

- [x] 10. Create CameraFeed component





  - Implement video element with MediaStream rendering
  - Handle camera permission requests
  - Display error messages for permission denial or camera unavailable
  - Manage stream lifecycle (start/stop)
  - Support facingMode prop for camera switching
  - _Requirements: 1.1, 1.4, 1.5, 7.2, 7.3_

- [x] 11. Create FaceOvalGuide component










  - Implement SVG-based vertical oval overlay
  - Make oval responsive to viewport dimensions
  - Center oval in viewport
  - Apply proportional sizing based on viewport
  - _Requirements: 1.2, 1.3_

- [x] 11.1 Write property test for oval centering and proportionality


  - **Property 1: Face oval guide is always centered and proportional**
  - **Validates: Requirements 1.2, 1.3**

- [x] 12. Create CaptureButton component


  - Implement button with loading state
  - Handle disabled state during capture
  - Apply responsive sizing (mobile: 80px, tablet: 100px, desktop: 120px)
  - Position in lower half of viewport
  - _Requirements: 2.1, 2.4, 2.5_

- [x] 12.1 Write property test for button state management

  - **Property 3: Button state management during capture**
  - **Validates: Requirements 2.4, 2.5**

- [x] 13. Create CameraSwitchButton component

  - Implement button for camera switching
  - Position in upper right section
  - Show only on mobile devices
  - Hide when only one camera available
  - _Requirements: 7.1, 7.4, 7.5_

- [x] 14. Create SuccessScreen component

  - Implement success confirmation UI
  - Display success message and visual feedback
  - Hide camera feed and controls
  - Prevent further capture attempts
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 14.1 Write property test for success screen display

  - **Property 19: Success screen displayed on recognition**
  - **Validates: Requirements 9.1, 9.3**

- [x] 14.2 Write property test for success screen content

  - **Property 20: Success screen shows confirmation**
  - **Validates: Requirements 9.2, 9.4**

- [x] 14.3 Write property test for capture prevention

  - **Property 21: Success screen prevents further captures**
  - **Validates: Requirements 9.5**

- [x] 15. Create feedback message system

  - Implement message display component
  - Support success and error message types
  - Add auto-dismissal for success messages (3 seconds)
  - Add manual dismissal for error messages
  - Display loading indicator during capture
  - Show attempts remaining when available
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 15.1 Write property test for loading indicator

  - **Property 9: Loading indicator during capture**
  - **Validates: Requirements 6.1**

- [x] 15.2 Write property test for feedback display

  - **Property 10: Feedback messages displayed based on response**
  - **Validates: Requirements 6.2, 6.3**

- [x] 15.3 Write property test for success auto-dismissal

  - **Property 11: Success message auto-dismissal**
  - **Validates: Requirements 6.4**

- [x] 15.4 Write property test for error manual dismissal

  - **Property 12: Error message manual dismissal**
  - **Validates: Requirements 6.5**

- [x] 16. Implement main CaptureScreen page

  - Create main page component with userId from query params
  - Integrate all child components (CameraFeed, FaceOvalGuide, CaptureButton, etc.)
  - Implement capture flow: button click → capture frame → send to backend
  - Handle camera switching on mobile
  - Manage application state (capturing, success, error, locked)
  - Display appropriate feedback messages
  - Show success screen on successful recognition
  - Handle max attempts exceeded scenario
  - _Requirements: 2.2, 2.3, 4.1, 7.2, 7.3_

- [x] 16.1 Write property test for capture flow


  - **Property 2: Capture flow sends image to backend**
  - **Validates: Requirements 2.2, 2.3**

- [x] 16.2 Write property test for camera switching


  - **Property 13: Camera switching toggles facing mode**
  - **Validates: Requirements 7.2, 7.3**

- [x] 17. Implement responsive layout and styling

  - Create Tailwind CSS responsive styles for all breakpoints
  - Mobile (< 768px): full-screen layout, large touch targets
  - Tablet (768-1024px): centered layout with padding
  - Desktop (> 1024px): constrained width, optimal sizing
  - Handle orientation changes
  - Ensure minimum touch target sizes (44x44px)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 17.1 Write property test for responsive layout


  - **Property 4: Responsive layout adapts to viewport**
  - **Validates: Requirements 3.1, 3.5**

- [x] 18. Integrate iframe messaging

  - Add iframe messenger calls to CaptureScreen
  - Send "True" message on successful recognition
  - Send "False" message when max attempts exceeded
  - Handle non-embedded scenario gracefully
  - _Requirements: 10.1, 10.2, 10.5_

- [x] 18.1 Write property test for success message to parent


  - **Property 22: Success message sent to parent on recognition**
  - **Validates: Requirements 10.1**

- [x] 18.2 Write property test for failure message to parent


  - **Property 23: Failure message sent to parent on max attempts**
  - **Validates: Requirements 10.2**

- [ ] 19. Add error handling throughout application



  - Implement frontend error scenarios (camera denied, network errors, timeouts)
  - Implement backend error scenarios (invalid data, API failures, server errors)
  - Add proper error logging
  - Display user-friendly error messages
  - Handle max attempts exceeded with appropriate UI
  - _Requirements: 1.5, 4.4, 5.4, 8.2_

- [x] 20. Optimize performance

  - Compress captured images to max 1MB
  - Request appropriate camera resolution based on device
  - Implement debouncing for resize events
  - Add connection pooling for backend API calls
  - Implement request body size limits
  - _Requirements: Performance considerations from design_

- [x] 21. Final checkpoint - Integration testing



  - Ensure all tests pass, ask the user if questions arise, making sure to only run tests as silent. NEVER run the tests without the silent flag
  - Test complete capture flow end-to-end
  - Verify iframe messaging works correctly
  - Test failure tracking and lockout behavior
  - Verify configuration reload works
  - Test responsive behavior across breakpoints
  - Verify camera switching on mobile devices
