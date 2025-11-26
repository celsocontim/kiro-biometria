/**
 * Property-based tests for IframeMessenger service
 * 
 * Tests correctness properties:
 * - Property 25: Iframe detection
 * - Property 24: PostMessage API used for parent communication
 */

import * as fc from 'fast-check';
import { IframeMessenger } from '../IframeMessenger';

describe('IframeMessenger', () => {
  let messenger: IframeMessenger;
  let originalWindow: Window & typeof globalThis;

  beforeEach(() => {
    messenger = new IframeMessenger();
    originalWindow = global.window;
  });

  afterEach(() => {
    global.window = originalWindow;
  });

  describe('Property 25: Iframe detection', () => {
    /**
     * Feature: facial-recognition-capture, Property 25: Iframe detection
     * Validates: Requirements 10.4
     * 
     * For any application load, the Frontend Application should correctly detect
     * whether it is embedded in an iframe by checking window.parent.
     */
    it('should correctly detect when embedded in iframe (window.parent !== window)', () => {
      fc.assert(
        fc.property(fc.constant(true), () => {
          // Mock window.parent to be different from window (embedded scenario)
          const mockParent = { ...global.window, location: { href: 'http://parent.com' } };
          Object.defineProperty(global.window, 'parent', {
            value: mockParent,
            writable: true,
            configurable: true,
          });

          const result = messenger.isEmbedded();

          // Should detect as embedded when window.parent !== window
          expect(result).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it('should correctly detect when NOT embedded (window.parent === window)', () => {
      fc.assert(
        fc.property(fc.constant(true), () => {
          // Mock window.parent to be same as window (not embedded scenario)
          Object.defineProperty(global.window, 'parent', {
            value: global.window,
            writable: true,
            configurable: true,
          });

          const result = messenger.isEmbedded();

          // Should detect as NOT embedded when window.parent === window
          expect(result).toBe(false);
        }),
        { numRuns: 100 }
      );
    });

    it('should handle cross-origin restrictions gracefully', () => {
      fc.assert(
        fc.property(fc.constant(true), () => {
          // Mock window.parent to throw error (cross-origin restriction)
          Object.defineProperty(global.window, 'parent', {
            get: () => {
              throw new Error('Cross-origin access denied');
            },
            configurable: true,
          });

          const result = messenger.isEmbedded();

          // Should return false when cross-origin error occurs
          expect(result).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe('Property 24: PostMessage API used for parent communication', () => {
    /**
     * Feature: facial-recognition-capture, Property 24: PostMessage API used for parent communication
     * Validates: Requirements 10.3
     * 
     * For any message sent to the parent window, the Frontend Application should
     * use the standard postMessage API.
     */
    it('should use postMessage API for all parent communication', () => {
      fc.assert(
        fc.property(
          fc.oneof(fc.constant('True'), fc.constant('False'), fc.string()),
          (message) => {
            // Mock window.parent.postMessage
            const mockPostMessage = jest.fn();
            const mockParent = {
              ...global.window,
              postMessage: mockPostMessage,
            };
            Object.defineProperty(global.window, 'parent', {
              value: mockParent,
              writable: true,
              configurable: true,
            });

            // Call postMessageToParent
            messenger.postMessageToParent(message);

            // Verify postMessage was called with correct arguments
            expect(mockPostMessage).toHaveBeenCalledWith(message, '*');
            expect(mockPostMessage).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should send "True" or "False" messages via postMessage for completion status', () => {
      fc.assert(
        fc.property(fc.boolean(), (success) => {
          // Mock window.parent to be different from window (embedded)
          const mockPostMessage = jest.fn();
          const mockParent = {
            ...global.window,
            postMessage: mockPostMessage,
          };
          Object.defineProperty(global.window, 'parent', {
            value: mockParent,
            writable: true,
            configurable: true,
          });

          // Call sendCompletionStatus
          messenger.sendCompletionStatus(success);

          // Verify postMessage was called with "True" or "False"
          const expectedMessage = success ? 'True' : 'False';
          expect(mockPostMessage).toHaveBeenCalledWith(expectedMessage, '*');
        }),
        { numRuns: 100 }
      );
    });

    it('should not send message when not embedded', () => {
      fc.assert(
        fc.property(fc.boolean(), (success) => {
          // Mock window.parent to be same as window (not embedded)
          const mockPostMessage = jest.fn();
          Object.defineProperty(global.window, 'parent', {
            value: global.window,
            writable: true,
            configurable: true,
          });
          global.window.postMessage = mockPostMessage;

          // Call sendCompletionStatus
          messenger.sendCompletionStatus(success);

          // Verify postMessage was NOT called
          expect(mockPostMessage).not.toHaveBeenCalled();
        }),
        { numRuns: 100 }
      );
    });

    it('should handle postMessage errors gracefully', () => {
      fc.assert(
        fc.property(fc.string(), (message) => {
          // Mock window.parent.postMessage to throw error
          const mockParent = {
            ...global.window,
            postMessage: jest.fn(() => {
              throw new Error('postMessage failed');
            }),
          };
          Object.defineProperty(global.window, 'parent', {
            value: mockParent,
            writable: true,
            configurable: true,
          });

          // Should throw error when postMessage fails
          expect(() => messenger.postMessageToParent(message)).toThrow('postMessage failed');
        }),
        { numRuns: 100 }
      );
    });
  });
});
