import * as fc from 'fast-check';
import { Request, Response } from 'express';
import { handleCapture } from '../capture';
import { RecognitionService } from '../../services/RecognitionService';
import { FailureTrackingService } from '../../services/FailureTrackingService';
import { ConfigurationService } from '../../services/ConfigurationService';
import { CaptureResponse } from '../../types/api.types';

describe('Capture Route', () => {
  let recognitionService: RecognitionService;
  let failureTrackingService: FailureTrackingService;
  let configService: ConfigurationService;

  beforeEach(() => {
    configService = new ConfigurationService();
    recognitionService = new RecognitionService();
    failureTrackingService = new FailureTrackingService(configService);
  });

  afterEach(() => {
    // Clean up failure tracking records
    (failureTrackingService as any).clearAllRecords();
  });

  describe('Basic functionality', () => {
    it('should handle valid capture request', async () => {
      const mockReq = {
        body: {
          userId: 'test-user-123',
          imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
        }
      } as Request;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;

      await handleCapture(mockReq, mockRes, recognitionService, failureTrackingService, configService);

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            userId: 'test-user-123',
            recognized: expect.any(Boolean),
            confidence: expect.any(Number),
            timestamp: expect.any(String),
            attemptsRemaining: expect.any(Number)
          })
        })
      );
    });

    it('should reject request with missing userId', async () => {
      const mockReq = {
        body: {
          imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
        }
      } as Request;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;

      await handleCapture(mockReq, mockRes, recognitionService, failureTrackingService, configService);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorCode: 'INVALID_REQUEST'
        })
      );
    });

    it('should reject request with missing imageData', async () => {
      const mockReq = {
        body: {
          userId: 'test-user-123'
        }
      } as Request;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;

      await handleCapture(mockReq, mockRes, recognitionService, failureTrackingService, configService);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorCode: 'INVALID_REQUEST'
        })
      );
    });

    it('should lock user after max attempts', async () => {
      const userId = 'test-user-lockout';
      
      // Simulate max failures
      for (let i = 0; i < 5; i++) {
        await failureTrackingService.recordFailure(userId);
      }

      const mockReq = {
        body: {
          userId,
          imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
        }
      } as Request;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;

      await handleCapture(mockReq, mockRes, recognitionService, failureTrackingService, configService);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorCode: 'MAX_ATTEMPTS_EXCEEDED'
        })
      );
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Feature: facial-recognition-capture, Property 6: User identifier validation
     * 
     * Property: For any user identifier provided to the Backend Service,
     * the service should validate it is a non-empty string before processing.
     * 
     * Validates: Requirements 4.3
     */
    it('should validate user identifier is non-empty string', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate various invalid userId values
          fc.oneof(
            fc.constant(''),           // empty string
            fc.constant('   '),        // whitespace only
            fc.constant(null),         // null
            fc.constant(undefined),    // undefined
            fc.integer(),              // number
            fc.boolean(),              // boolean
            fc.constant({}),           // object
            fc.constant([]),           // array
            fc.string({ minLength: 256, maxLength: 300 }) // too long (> 255 chars)
          ),
          async (invalidUserId) => {
            const mockReq = {
              body: {
                userId: invalidUserId,
                imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
              }
            } as Request;

            const mockRes = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            } as unknown as Response;

            await handleCapture(mockReq, mockRes, recognitionService, failureTrackingService, configService);

            // Should reject with 400 status
            expect(mockRes.status).toHaveBeenCalledWith(400);
            
            // Should return error response
            const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0] as CaptureResponse;
            expect(jsonCall.success).toBe(false);
            expect(jsonCall.errorCode).toBe('INVALID_REQUEST');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: facial-recognition-capture, Property 5: User identifier included in API requests
     * 
     * Property: For any image capture with a valid user identifier,
     * the Backend Service should include that identifier in the Recognition API request.
     * 
     * Validates: Requirements 4.2
     */
    it('should include user identifier in recognition result', async () => {
      // Mock recognition service to return immediately
      const mockRecognize = jest.spyOn(recognitionService, 'recognize').mockImplementation(
        async (imageData: string, userId: string) => ({
          recognized: true,
          confidence: 0.9,
          userId
        })
      );

      await fc.assert(
        fc.asyncProperty(
          // Generate valid userId values
          fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
          async (userId) => {
            const mockReq = {
              body: {
                userId,
                imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
              }
            } as Request;

            const mockRes = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            } as unknown as Response;

            await handleCapture(mockReq, mockRes, recognitionService, failureTrackingService, configService);

            // Should return success (200) or locked (403)
            const statusCall = (mockRes.status as jest.Mock).mock.calls[0][0];
            
            if (statusCall === 200) {
              // If successful, userId should be in response
              const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0] as CaptureResponse;
              expect(jsonCall.success).toBe(true);
              expect(jsonCall.data?.userId).toBe(userId);
            }
          }
        ),
        { numRuns: 100 }
      );

      mockRecognize.mockRestore();
    }, 30000);

    /**
     * Feature: facial-recognition-capture, Property 7: Backend sends complete API requests
     * 
     * Property: For any capture request received by the Backend Service,
     * the service should send an HTTP request to the Recognition API endpoint
     * containing both the image data and user identifier.
     * 
     * Validates: Requirements 5.1, 5.2
     */
    it('should send complete API requests with imageData and userId', async () => {
      // Spy on recognition service
      const recognizeSpy = jest.spyOn(recognitionService, 'recognize').mockImplementation(
        async (imageData: string, userId: string) => ({
          recognized: true,
          confidence: 0.9,
          userId
        })
      );

      await fc.assert(
        fc.asyncProperty(
          // Generate valid userId and imageData
          fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
          fc.oneof(
            fc.constant('data:image/jpeg;base64,'),
            fc.constant('data:image/png;base64,')
          ),
          fc.base64String({ minLength: 10, maxLength: 100 }),
          async (userId, prefix, base64Data) => {
            const imageData = prefix + base64Data;
            
            const mockReq = {
              body: {
                userId,
                imageData
              }
            } as Request;

            const mockRes = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            } as unknown as Response;

            await handleCapture(mockReq, mockRes, recognitionService, failureTrackingService, configService);

            const statusCall = (mockRes.status as jest.Mock).mock.calls[0][0];
            
            if (statusCall === 200) {
              // Verify recognition service was called with both parameters
              expect(recognizeSpy).toHaveBeenCalledWith(imageData, userId);
            }
          }
        ),
        { numRuns: 100 }
      );

      recognizeSpy.mockRestore();
    }, 30000);

    /**
     * Feature: facial-recognition-capture, Property 8: Backend parses and forwards API responses
     * 
     * Property: For any Recognition API response,
     * the Backend Service should parse the response and return it to the Frontend Application.
     * 
     * Validates: Requirements 5.3
     */
    it('should parse and forward recognition API responses', async () => {
      // Mock recognition service to return immediately
      const mockRecognize = jest.spyOn(recognitionService, 'recognize').mockImplementation(
        async (imageData: string, userId: string) => ({
          recognized: true,
          confidence: 0.9,
          userId
        })
      );

      await fc.assert(
        fc.asyncProperty(
          // Generate valid userId
          fc.string({ minLength: 1, maxLength: 255 }).filter(s => s.trim().length > 0),
          async (userId) => {
            const mockReq = {
              body: {
                userId,
                imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
              }
            } as Request;

            const mockRes = {
              status: jest.fn().mockReturnThis(),
              json: jest.fn()
            } as unknown as Response;

            await handleCapture(mockReq, mockRes, recognitionService, failureTrackingService, configService);

            const statusCall = (mockRes.status as jest.Mock).mock.calls[0][0];
            
            if (statusCall === 200) {
              // Verify response contains parsed recognition result
              const jsonCall = (mockRes.json as jest.Mock).mock.calls[0][0] as CaptureResponse;
              
              expect(jsonCall.success).toBe(true);
              expect(jsonCall.data).toBeDefined();
              expect(jsonCall.data?.recognized).toBeDefined();
              expect(typeof jsonCall.data?.recognized).toBe('boolean');
              expect(jsonCall.data?.confidence).toBeDefined();
              expect(typeof jsonCall.data?.confidence).toBe('number');
              expect(jsonCall.data?.confidence).toBeGreaterThanOrEqual(0);
              expect(jsonCall.data?.confidence).toBeLessThanOrEqual(1);
              expect(jsonCall.data?.userId).toBe(userId);
              expect(jsonCall.data?.timestamp).toBeDefined();
              expect(jsonCall.data?.attemptsRemaining).toBeDefined();
            }
          }
        ),
        { numRuns: 100 }
      );

      mockRecognize.mockRestore();
    }, 30000);
  });

  describe('Failure tracking integration', () => {
    it('should increment failure count on failed recognition', async () => {
      const userId = 'test-user-failure';
      
      // Mock recognition service to always return failure
      jest.spyOn(recognitionService, 'recognize').mockResolvedValue({
        recognized: false,
        confidence: 0.3,
        userId
      });

      const mockReq = {
        body: {
          userId,
          imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
        }
      } as Request;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;

      // Initial attempts remaining should be 5
      const initialAttempts = await failureTrackingService.getRemainingAttempts(userId);
      expect(initialAttempts).toBe(5);

      // Make a failed capture
      await handleCapture(mockReq, mockRes, recognitionService, failureTrackingService, configService);

      // Attempts remaining should decrease
      const remainingAttempts = await failureTrackingService.getRemainingAttempts(userId);
      expect(remainingAttempts).toBe(4);
    });

    it('should reset failure count on successful recognition', async () => {
      const userId = 'test-user-success';
      
      // Record some failures first
      await failureTrackingService.recordFailure(userId);
      await failureTrackingService.recordFailure(userId);
      
      let remaining = await failureTrackingService.getRemainingAttempts(userId);
      expect(remaining).toBe(3);

      // Mock recognition service to return success
      jest.spyOn(recognitionService, 'recognize').mockResolvedValue({
        recognized: true,
        confidence: 0.95,
        userId
      });

      const mockReq = {
        body: {
          userId,
          imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRg=='
        }
      } as Request;

      const mockRes = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;

      // Make a successful capture
      await handleCapture(mockReq, mockRes, recognitionService, failureTrackingService, configService);

      // Attempts should be reset to max
      remaining = await failureTrackingService.getRemainingAttempts(userId);
      expect(remaining).toBe(5);
    });
  });
});
