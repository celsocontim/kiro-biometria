# Frontend Services

This directory contains service classes that handle specific functionality for the facial recognition capture application.

## CameraService

The `CameraService` provides a comprehensive interface for camera operations.

### Features

- **Camera Access**: Request camera access with support for front/back camera selection
- **Frame Capture**: Capture video frames as base64-encoded images
- **Device Detection**: Detect mobile vs desktop devices
- **Camera Enumeration**: List available camera devices
- **Resource Management**: Properly stop and cleanup camera streams

### Usage Example

```typescript
import { cameraService } from '@/services/CameraService';

// Request front camera access
const stream = await cameraService.requestCameraAccess('user');

// Capture a frame from video element
const videoElement = document.querySelector('video');
const imageData = cameraService.captureFrame(videoElement);

// Check if device is mobile
const isMobile = cameraService.isMobileDevice();

// Get available cameras
const cameras = await cameraService.getAvailableCameras();

// Stop the stream when done
cameraService.stopStream(stream);
```

### Requirements Satisfied

- **1.1**: Display live camera feed
- **1.4**: Request camera permissions from user's device
- **2.2**: Capture current camera frame as image
- **7.2**: Toggle between front-facing and back-facing cameras

### Error Handling

The service provides detailed error messages for common camera access issues:
- Permission denied
- No camera found
- Camera already in use
- Other camera errors
