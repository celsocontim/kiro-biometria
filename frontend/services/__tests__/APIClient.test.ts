/**
 * Property-based tests for APIClient service
 * 
 * Tests correctness properties:
 * - Property 14: Frontend communicates via HTTP API
 */

import * as fc from 'fast-check';
import { APIClient } from '../APIClient';
import { CaptureResponse } from '../../types/api.types';

// Mock fetch globally
global.fetch = jest.fn();

describe('APIClient', () => {
  let apiClient: APIClient;
  const mockBackendUrl = 'http://localhost:3001';

  beforeEach(() => {
    apiClient = new APIClient(mockBackendUrl, 30000);
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Property 14: Frontend communicates via HTTP API', () => {
    /**
     * Feature: facial-recognition-capture, Property 14: Frontend communicates via HTTP API
     * Validates: Requirements 11.1
     * 
     * For any image capture operation, the Frontend Application should communicate
     * with the Backend Service exclusively through HTTP API calls, not directly
     * with the Recognition API.
     */
    it('should use HTTP POST method for all capture requests', () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 20 }), // imageData
          fc.string({ minLength: 1, maxLength: 255 }), // userId
          async (imageData, userId) => {
            // Reset mock completely before each iteration
            (global.fetch as jest.Mock).mockReset();

            // Mock successful response
            const mockResponse: CaptureResponse = {
              success: true,
              data: {
                recognized: true,
                confidence: 0.95,
                userId,
                timestamp: new Date().toISOString(),
                attemptsRemaining: 5
              }
            };

            (global.fetch as jest.Mock).mockResolvedValue({
              ok: true,
              json: async () => mockResponse,
            });

            // Call submitCapture
            await apiClient.submitCapture(imageData, userId);

            // Verify fetch was called with HTTP POST
            expect(global.fetch).toHaveBeenCalledTimes(1);
            expect(global.fetch).toHaveBeenCalledWith(
              `${mockBackendUrl}/api/capture`,
              expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                  'Content-Type': 'application/json',
                }),
              })
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should send complete request body with imageData and userId', () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 20 }), // imageData
          fc.string({ minLength: 1, maxLength: 255 }), // userId
          async (imageData, userId) => {
            // Reset mock completely before each iteration
            (global.fetch as jest.Mock).mockReset();
            
            // Create fresh client instance for each iteration
            const testClient = new APIClient(mockBackendUrl, 30000);

            // Mock successful response - use implementation to capture the actual call
            (global.fetch as jest.Mock).mockImplementation(async (url, options) => {
              return {
                ok: true,
                json: async () => ({
                  success: true,
                  data: {
                    recognized: true,
                    confidence: 0.95,
                    userId,
                    timestamp: new Date().toISOString(),
                    attemptsRemaining: 5
                  }
                })
              };
            });

            // Call submitCapture
            await testClient.submitCapture(imageData, userId);

            // Verify request body contains imageData and userId
            const callArgs = (global.fetch as jest.Mock).mock.calls[0];
            
            // Check if fetch was called
            if (!callArgs) {
              throw new Error('fetch was not called');
            }
            
            const requestBodyString = callArgs[1].body;
            const requestBody = JSON.parse(requestBodyString);
            
            // Verify the round-trip: stringify the original values and compare
            expect(requestBody.imageData).toBe(imageData);
            expect(requestBody.userId).toBe(userId);
            expect(requestBody).toHaveProperty('timestamp');
            expect(typeof requestBody.timestamp).toBe('number');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should parse and return backend response for all response types', () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 20 }), // imageData
          fc.string({ minLength: 1, maxLength: 255 }), // userId
          fc.boolean(), // recognized
          fc.double({ min: 0, max: 1, noNaN: true }), // confidence
          fc.integer({ min: 0, max: 10 }), // attemptsRemaining
          async (imageData, userId, recognized, confidence, attemptsRemaining) => {
            // Reset mock completely before each iteration
            (global.fetch as jest.Mock).mockReset();

            // Mock response
            const mockResponse: CaptureResponse = {
              success: true,
              data: {
                recognized,
                confidence,
                userId,
                timestamp: new Date().toISOString(),
                attemptsRemaining
              }
            };

            (global.fetch as jest.Mock).mockResolvedValue({
              ok: true,
              json: async () => mockResponse,
            });

            // Call submitCapture
            const result = await apiClient.submitCapture(imageData, userId);

            // Verify response is parsed correctly
            expect(result).toEqual(mockResponse);
            expect(result.success).toBe(true);
            expect(result.data?.recognized).toBe(recognized);
            expect(result.data?.confidence).toBe(confidence);
            expect(result.data?.userId).toBe(userId);
            expect(result.data?.attemptsRemaining).toBe(attemptsRemaining);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle error responses from backend', () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 20 }), // imageData
          fc.string({ minLength: 1, maxLength: 255 }), // userId
          fc.constantFrom('MAX_ATTEMPTS_EXCEEDED', 'INVALID_REQUEST', 'SERVER_ERROR'),
          fc.string({ minLength: 1 }), // error message
          async (imageData, userId, errorCode, errorMessage) => {
            // Reset mock completely before each iteration
            (global.fetch as jest.Mock).mockReset();

            // Mock error response
            const mockResponse: CaptureResponse = {
              success: false,
              error: errorMessage,
              errorCode
            };

            (global.fetch as jest.Mock).mockResolvedValue({
              ok: false,
              json: async () => mockResponse,
            });

            // Call submitCapture
            const result = await apiClient.submitCapture(imageData, userId);

            // Verify error response is returned
            expect(result.success).toBe(false);
            expect(result.error).toBe(errorMessage);
            expect(result.errorCode).toBe(errorCode);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle timeout after 30 seconds', () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 20 }), // imageData
          fc.string({ minLength: 1, maxLength: 255 }), // userId
          async (imageData, userId) => {
            // Reset mock completely before each iteration
            (global.fetch as jest.Mock).mockReset();

            // Mock timeout by rejecting with AbortError
            (global.fetch as jest.Mock).mockRejectedValue(
              Object.assign(new Error('The operation was aborted'), { name: 'AbortError' })
            );

            // Call submitCapture
            const result = await apiClient.submitCapture(imageData, userId);

            // Verify timeout error response
            expect(result.success).toBe(false);
            expect(result.error).toContain('timed out');
            expect(result.errorCode).toBe('SERVER_ERROR');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle network errors', () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 20 }), // imageData
          fc.string({ minLength: 1, maxLength: 255 }), // userId
          async (imageData, userId) => {
            // Reset mock completely before each iteration
            (global.fetch as jest.Mock).mockReset();

            // Mock network error
            (global.fetch as jest.Mock).mockRejectedValue(
              new TypeError('Failed to fetch')
            );

            // Call submitCapture
            const result = await apiClient.submitCapture(imageData, userId);

            // Verify network error response
            expect(result.success).toBe(false);
            expect(result.error).toContain('Network error');
            expect(result.errorCode).toBe('SERVER_ERROR');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use correct backend URL endpoint', () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 20 }), // imageData
          fc.string({ minLength: 1, maxLength: 255 }), // userId
          async (imageData, userId) => {
            // Reset mock completely before each iteration
            (global.fetch as jest.Mock).mockReset();

            // Mock successful response
            const mockResponse: CaptureResponse = {
              success: true,
              data: {
                recognized: true,
                confidence: 0.95,
                userId,
                timestamp: new Date().toISOString(),
                attemptsRemaining: 5
              }
            };

            (global.fetch as jest.Mock).mockResolvedValue({
              ok: true,
              json: async () => mockResponse,
            });

            // Call submitCapture
            await apiClient.submitCapture(imageData, userId);

            // Verify correct endpoint is used
            const callArgs = (global.fetch as jest.Mock).mock.calls[0];
            expect(callArgs[0]).toBe(`${mockBackendUrl}/api/capture`);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should include Content-Type header in all requests', () => {
      fc.assert(
        fc.asyncProperty(
          fc.string({ minLength: 20 }), // imageData
          fc.string({ minLength: 1, maxLength: 255 }), // userId
          async (imageData, userId) => {
            // Reset mock completely before each iteration
            (global.fetch as jest.Mock).mockReset();

            // Mock successful response
            const mockResponse: CaptureResponse = {
              success: true,
              data: {
                recognized: true,
                confidence: 0.95,
                userId,
                timestamp: new Date().toISOString(),
                attemptsRemaining: 5
              }
            };

            (global.fetch as jest.Mock).mockResolvedValue({
              ok: true,
              json: async () => mockResponse,
            });

            // Call submitCapture
            await apiClient.submitCapture(imageData, userId);

            // Verify Content-Type header
            const callArgs = (global.fetch as jest.Mock).mock.calls[0];
            expect(callArgs[1].headers['Content-Type']).toBe('application/json');
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
