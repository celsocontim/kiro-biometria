# Product Overview

A full-stack facial recognition capture application that enables users to capture facial images through a web interface with visual guidance and real-time feedback.

## Core Functionality

- Live camera feed with face positioning guide (oval overlay)
- Image capture with automatic compression and optimization
- Facial recognition processing via backend API
- Failure tracking with user lockout after max attempts
- Iframe embedding support with PostMessage communication
- Responsive design for mobile, tablet, and desktop devices

## Key Features

- Camera switching (front/back on mobile devices)
- Visual feedback for capture success/failure
- Attempt tracking with remaining attempts display
- Comprehensive error handling for camera and network issues
- Performance optimizations for image size and network efficiency

## User Flow

1. User grants camera permissions
2. Camera feed displays with face positioning guide
3. User positions face within oval guide
4. User captures image via button
5. Image is processed by recognition API
6. User receives success/failure feedback
7. On success: parent window is notified via postMessage
8. On failure: user can retry (up to max attempts)
9. On max attempts exceeded: user is locked out

## Integration

The application is designed to be embedded in an iframe and communicates with the parent window using PostMessage API to notify of capture success/failure.
