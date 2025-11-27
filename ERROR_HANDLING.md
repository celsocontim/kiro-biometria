# Error Handling Guide

This document describes the comprehensive error handling implemented throughout the facial recognition capture application.

## Overview

The application implements robust error handling at all layers:
- **Frontend**: Camera access, network errors, timeouts, user feedback
- **Backend**: Input validation, API failures, server errors, configuration issues
- **Services**: Graceful degradation and error recovery

## Frontend Error Handling

### Camera Errors (CameraService)

**Error Types Handled:**
1. **NotAllowedError / PermissionDeniedError**: Camera access denied by user
   - Message: "Camera access denied. Please allow camera permissions..."
   - Action: User must grant permissions and refresh

2. **NotFoundError / DevicesNotFoundError**: No camera available
   - Message: "No camera found on this device..."
   - Action: User needs a device with a camera

3. **NotReadableError / TrackStartError**: Camera in use by another app
   - Message: "Camera is already in use by another application..."
   - Action: Close other apps using camera
   - Recovery: Automatic retry once after 1 second

4. **OverconstrainedError**: Requested camera not available
   - Message: "The requested camera (front/back) is not available..."
   - Action: Try switching cameras
   - Recovery: Automatic fallback to basic constraints

5. **SecurityError**: HTTPS/security issues
   - Message: "Camera access blocked due to security settings..."
   - Action: Use HTTPS or localhost

6. **AbortError**: Camera access interrupted
   - Message: "Camera access was interrupted..."
   - Action: Try again
   - Recovery: Automatic retry once

**Implementation:**
- Detailed error logging with timestamps
- User-friendly error messages
- Automatic retry for transient errors
- Fallback to relaxed constraints for OverconstrainedError
- Reload button for error recovery

### Network Errors (APIClient)

**Error Types Handled:**
1. **Timeout (AbortError)**: Request exceeds 30 seconds
   - Message: "Request timed out after 30 seconds..."
   - Recovery: No automatic retry (user must retry manually)

2. **Network Error (TypeError)**: Connection failed
   - Message: "Unable to connect to the server..."
   - Recovery: Automatic retry with exponential backoff (max 2 retries)
   - Backoff: 1s, 2s

3. **Server Errors**: Backend returns error response
   - Handled based on errorCode (see Backend Errors)

**Implementation:**
- 30-second timeout for all requests
- Exponential backoff retry for network errors
- Detailed logging of all attempts
- User-friendly error messages

### Capture Errors (Page Component)

**Error Scenarios:**
1. **Frame Capture Failure**: Video not ready or invalid
   - Message: "Failed to capture image from camera..."
   - Logging: Video state, dimensions logged

2. **Registration Check Failure**: Cannot determine if user is registered
   - Message: Logged to console, defaults to not registered
   - Action: Proceeds with registration flow
   - Logging: Error details logged

3. **Registration Failure**: User registration failed
   - Message: "Failed to register. Please try again..."
   - Action: User can retry capture
   - Logging: Registration error details

4. **Max Attempts Exceeded**: User locked out (identification only)
   - Message: "Maximum attempts exceeded. Please contact support..."
   - UI: Capture button disabled, attempts remaining shown
   - Parent notification: "False" sent via postMessage

5. **Liveness Check Failure**: Spoof detected
   - Message: "Spoof attempt! Make sure to use a real face!"
   - Action: User can retry with real face
   - Logging: Spoof detection logged

6. **Validation Errors**: Invalid request data
   - Message: "Invalid request. Please refresh the page..."
   - Action: User should refresh

7. **Server Errors**: Backend processing failed
   - Message: "Server error. Please try again in a moment..."
   - Action: User can retry

**Implementation:**
- Comprehensive try-catch around capture flow
- Separate handling for registration vs identification
- Detailed error logging with context
- User feedback via FeedbackMessage component
- Graceful UI state management

### UI Error Handling

**ErrorBoundary Component:**
- Catches unexpected React errors
- Displays user-friendly error screen
- Provides reload button
- Logs error details in development mode

**FeedbackMessage Component:**
- Success messages: Auto-dismiss after 3 seconds
- Error messages: Manual dismissal required
- Loading indicator: Shown during processing
- Attempts remaining: Displayed when available

## Backend Error Handling

### Input Validation (All Routes)

**User Check Route Validation:**
1. **User ID Validation**
   - Must be non-empty string
   - Status: 400 Bad Request
   - Error code: INVALID_REQUEST

**Register Route Validation:**
1. **User ID Validation**
   - Must be non-empty string
   - Status: 400 Bad Request
   - Error code: INVALID_REQUEST

2. **Image Data Validation**
   - Must be valid base64 string
   - Must have data URI prefix (data:image/jpeg or data:image/png)
   - Status: 400 Bad Request
   - Error code: INVALID_REQUEST

**Capture Route Validation:**
1. **User ID Validation**
   - Must be non-empty string
   - Max 255 characters
   - Status: 400 Bad Request
   - Error code: INVALID_REQUEST

2. **Image Data Validation**
   - Must be valid base64 string
   - Must have data URI prefix (data:image/jpeg or data:image/png)
   - Status: 400 Bad Request
   - Error code: INVALID_REQUEST

3. **User Lockout Check**
   - Check if user exceeded max attempts (identification only)
   - Status: 403 Forbidden
   - Error code: MAX_ATTEMPTS_EXCEEDED

**Implementation:**
- Early validation, fail fast
- Detailed logging of validation failures
- Consistent error response format across all routes

### Recognition Service Errors

**Error Types:**
1. **Timeout**: Recognition API exceeds 10 seconds
   - Message: "Recognition service timed out..."
   - Logging: Full error details

2. **Network Errors**: Cannot connect to API
   - Message: "Unable to connect to recognition service..."
   - Logging: Connection details

3. **Invalid Image Data**: Malformed image
   - Message: "Invalid image data format"
   - Logging: Image validation failure

4. **Unknown Errors**: Unexpected failures
   - Message: "Recognition service temporarily unavailable..."
   - Logging: Full stack trace

**Implementation:**
- 10-second timeout wrapper
- Detailed error logging
- User-friendly error messages
- Graceful fallback to mock service

### Configuration Service Errors

**Error Scenarios:**
1. **File Not Found**: Config file doesn't exist
   - Action: Use environment variables or defaults
   - Logging: Warning logged

2. **Invalid JSON**: Config file malformed
   - Action: Use environment variables or defaults
   - Logging: Error logged with details

3. **Invalid Values**: Config values out of range
   - Action: Use default values
   - Logging: Warning logged

4. **Reload Failures**: Auto-reload encounters error
   - Action: Continue with existing config
   - Logging: Error logged

**Implementation:**
- Safe defaults for all values
- Graceful degradation on errors
- Detailed logging of issues
- Continue operation with safe values

### Failure Tracking Service Errors (SQLite)

**Error Scenarios:**
1. **Database Connection Error**: Cannot connect to SQLite
   - Action: Throw error on initialization
   - Logging: Full error details with database path

2. **Record Failure Error**: Cannot increment count
   - Action: Throw error to caller
   - Logging: Error details with user_id

3. **Reset Failure Error**: Cannot reset count
   - Action: Continue (non-critical)
   - Logging: Error logged

4. **Lock Check Error**: Cannot determine status
   - Action: Fail open (allow attempt)
   - Logging: Error logged

5. **Cleanup Error**: Cannot remove old records
   - Action: Continue (non-critical)
   - Logging: Error logged

**Implementation:**
- SQLite persistence ensures data survives restarts
- Critical operations throw errors
- Non-critical operations log and continue
- Safe defaults for error cases
- Automatic cleanup of old records (24h+)
- Detailed error logging with context

### Global Error Handlers (Express)

**Handlers:**
1. **JSON Parse Error**: Invalid JSON in request
   - Status: 400 Bad Request
   - Message: "Invalid JSON in request body"

2. **Request Too Large**: Body exceeds 2MB
   - Status: 413 Payload Too Large
   - Message: "Request body too large. Maximum size is 2MB."

3. **404 Not Found**: Unknown route
   - Status: 404 Not Found
   - Message: "Route not found"

4. **Unhandled Errors**: Unexpected exceptions
   - Status: 500 Internal Server Error
   - Message: "Internal server error"
   - Logging: Full stack trace

5. **Uncaught Exceptions**: Process-level errors
   - Action: Log and exit gracefully
   - Logging: Full error details

6. **Unhandled Rejections**: Promise rejections
   - Action: Log error
   - Logging: Full error details

**Implementation:**
- Middleware-based error handling
- Consistent error response format
- Never expose stack traces to clients
- Comprehensive logging for debugging

## Error Response Format

All backend errors follow this format:

```typescript
{
  success: false,
  error: string,        // User-friendly message
  errorCode?: string,   // Machine-readable code
  timestamp?: string    // ISO 8601 timestamp
}
```

**Error Codes:**
- `INVALID_REQUEST`: Validation failure
- `MAX_ATTEMPTS_EXCEEDED`: User locked out (both registration and identification)
- `LIVENESS_CHECK_ERROR`: Spoof detection failure (FACE_API codes 106, 107, 108, 109)
- `SERVER_ERROR`: Internal server error
- `NOT_FOUND`: Route not found
- `FACE_API_ERROR`: Face API specific errors with detailed messages

## Logging Standards

**Frontend Logging:**
- All errors logged to console with context
- Includes: userId, timestamp, error details
- Format: `[Component] Message: { context }`

**Backend Logging:**
- All errors logged with full context
- Includes: userId, timestamp, stack trace
- Format: `[Service] Message: { context }`
- Security: Never log sensitive data (API keys, etc.)

## Error Recovery Strategies

**Automatic Recovery:**
1. Camera access: Retry once for transient errors
2. Network requests: Retry twice with backoff
3. Configuration: Use defaults on failure
4. Failure tracking: Fail open on errors

**Manual Recovery:**
1. Camera errors: Reload page button
2. Max attempts: Contact support
3. Server errors: User retry
4. Validation errors: Refresh page

## Testing Error Scenarios

**Frontend:**
- Deny camera permissions
- Disconnect network during capture
- Send invalid data
- Exceed max attempts

**Backend:**
- Send invalid JSON
- Send oversized requests
- Corrupt configuration file
- Simulate API timeouts

## Requirements Coverage

This error handling implementation satisfies:
- **Requirement 1.5**: Camera error messages
- **Requirement 4.4**: User identifier validation
- **Requirement 5.4**: Recognition API error handling
- **Requirement 8.2**: Max attempts exceeded handling

## Future Enhancements

1. **Retry UI**: Add retry button for network errors
2. **Error Analytics**: Track error rates and types
3. **Circuit Breaker**: Prevent cascading failures
4. **Health Checks**: Monitor service availability
5. **Error Reporting**: Send errors to monitoring service
