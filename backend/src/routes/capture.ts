import { Request, Response } from 'express';
import { CaptureRequest, CaptureResponse } from '../types/api.types';
import { RecognitionService } from '../services/RecognitionService';
import { FailureTrackingService } from '../services/FailureTrackingService';
import { IConfigurationService } from '../types/config.types';

/**
 * Validate user identifier
 * @param userId User identifier to validate
 * @returns True if valid, false otherwise
 */
function validateUserId(userId: any): userId is string {
  return typeof userId === 'string' && userId.trim().length > 0 && userId.length <= 255;
}

/**
 * Validate image data
 * @param imageData Image data to validate
 * @returns True if valid, false otherwise
 */
function validateImageData(imageData: any): imageData is string {
  if (typeof imageData !== 'string' || imageData.length === 0) {
    return false;
  }
  
  // Check for data URI prefix (basic validation)
  // Accept both data:image/jpeg;base64, and data:image/png;base64, formats
  const hasValidPrefix = imageData.startsWith('data:image/jpeg;base64,') || 
                         imageData.startsWith('data:image/png;base64,');
  
  return hasValidPrefix;
}

/**
 * Handler for POST /api/capture endpoint
 * Processes facial recognition capture requests
 * 
 * Requirements: 1.5, 4.4, 5.4, 8.2
 */
export async function handleCapture(
  req: Request,
  res: Response,
  recognitionService: RecognitionService,
  failureTrackingService: FailureTrackingService,
  configService: IConfigurationService
): Promise<void> {
  const startTime = Date.now();
  let userId: string | undefined;

  try {
    const requestBody = req.body;
    const imageData = requestBody?.imageData;
    const requestUserId = requestBody?.userId;
    userId = requestUserId;

    // Requirement 4.4: Validate user identifier and reject invalid requests
    if (!validateUserId(userId)) {
      console.warn('[Capture] Invalid userId provided:', {
        userId: userId || 'undefined',
        timestamp: new Date().toISOString()
      });
      
      const response: CaptureResponse = {
        success: false,
        error: 'Invalid or missing userId. Must be a non-empty string with max 255 characters.',
        errorCode: 'INVALID_REQUEST'
      };
      res.status(400).json(response);
      return;
    }

    // Requirement 4.4: Validate image data
    if (!validateImageData(imageData)) {
      console.warn('[Capture] Invalid imageData provided:', {
        userId,
        hasImageData: !!imageData,
        imageDataType: typeof imageData,
        timestamp: new Date().toISOString()
      });
      
      const response: CaptureResponse = {
        success: false,
        error: 'Invalid or missing imageData. Must be a base64 encoded image with data URI prefix.',
        errorCode: 'INVALID_REQUEST'
      };
      res.status(400).json(response);
      return;
    }

    // Requirement 8.2: Check if user is locked due to max attempts exceeded
    const isLocked = await failureTrackingService.isUserLocked(userId);
    if (isLocked) {
      console.warn('[Capture] User is locked:', {
        userId,
        timestamp: new Date().toISOString()
      });
      
      const response: CaptureResponse = {
        success: false,
        error: 'Maximum recognition attempts exceeded. Please contact support for assistance.',
        errorCode: 'MAX_ATTEMPTS_EXCEEDED'
      };
      res.status(403).json(response);
      return;
    }

    // Requirement 5.4: Call recognition service with error handling
    // Get recognition threshold and forceFailure from configuration
    const config = await configService.getConfiguration();
    const threshold = config.recognitionThreshold;
    const forceFailure = config.forceFailure;
    
    console.log('[Capture] Processing recognition request:', {
      userId,
      imageSize: imageData.length,
      threshold,
      forceFailure,
      timestamp: new Date().toISOString()
    });

    const recognitionResult = await recognitionService.recognize(imageData, userId, threshold, forceFailure);

    console.log('[Capture] Recognition result:', {
      userId,
      recognized: recognitionResult.recognized,
      confidence: recognitionResult.confidence,
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });

    // Update failure tracking based on result
    if (recognitionResult.recognized) {
      // Reset failures on success
      const config = await configService.getConfiguration();
      if (config.failureResetOnSuccess) {
        await failureTrackingService.resetFailures(userId);
        console.log('[Capture] Failure count reset for user:', { userId });
      }
    } else {
      // Record failure
      await failureTrackingService.recordFailure(userId);
      const remaining = await failureTrackingService.getRemainingAttempts(userId);
      console.log('[Capture] Failure recorded:', {
        userId,
        attemptsRemaining: remaining,
        timestamp: new Date().toISOString()
      });
    }

    // Get remaining attempts
    const attemptsRemaining = await failureTrackingService.getRemainingAttempts(userId);

    // Return success response
    const response: CaptureResponse = {
      success: true,
      data: {
        recognized: recognitionResult.recognized,
        confidence: recognitionResult.confidence,
        userId: recognitionResult.userId,
        timestamp: new Date().toISOString(),
        attemptsRemaining
      }
    };

    res.status(200).json(response);
  } catch (error) {
    // Requirement 5.4: Handle unexpected errors with proper logging
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    console.error('[Capture] Unexpected error:', {
      userId: userId || 'unknown',
      error: errorMessage,
      stack: errorStack,
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
    
    const response: CaptureResponse = {
      success: false,
      error: 'An unexpected error occurred while processing your request. Please try again.',
      errorCode: 'SERVER_ERROR'
    };
    
    res.status(500).json(response);
  }
}
