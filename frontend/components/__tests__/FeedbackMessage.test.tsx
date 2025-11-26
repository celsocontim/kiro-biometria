/**
 * FeedbackMessage Component Tests
 * 
 * Tests for feedback message display, auto-dismissal, and manual dismissal.
 * Includes property-based tests for universal behaviors.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import fc from 'fast-check';
import FeedbackMessage, { FeedbackType } from '../FeedbackMessage';

describe('FeedbackMessage Component', () => {
  describe('Unit Tests', () => {
    it('should not render when visible is false', () => {
      const { container } = render(
        <FeedbackMessage
          type="success"
          message="Test message"
          visible={false}
        />
      );
      
      expect(container.firstChild).toBeNull();
    });

    it('should render loading indicator with spinner', () => {
      render(
        <FeedbackMessage
          type="loading"
          message="Processing..."
          visible={true}
        />
      );
      
      expect(screen.getByTestId('feedback-loading')).toBeInTheDocument();
      expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
      expect(screen.getByText('Processing...')).toBeInTheDocument();
    });

    it('should render success message with icon', () => {
      render(
        <FeedbackMessage
          type="success"
          message="Success!"
          visible={true}
        />
      );
      
      expect(screen.getByTestId('feedback-success')).toBeInTheDocument();
      expect(screen.getByTestId('success-icon')).toBeInTheDocument();
      expect(screen.getByText('Success!')).toBeInTheDocument();
    });

    it('should render error message with icon and dismiss button', () => {
      const onDismiss = jest.fn();
      
      render(
        <FeedbackMessage
          type="error"
          message="Error occurred"
          visible={true}
          onDismiss={onDismiss}
        />
      );
      
      expect(screen.getByTestId('feedback-error')).toBeInTheDocument();
      expect(screen.getByTestId('error-icon')).toBeInTheDocument();
      expect(screen.getByText('Error occurred')).toBeInTheDocument();
      expect(screen.getByTestId('dismiss-button')).toBeInTheDocument();
    });

    it('should display attempts remaining when provided', () => {
      render(
        <FeedbackMessage
          type="error"
          message="Recognition failed"
          attemptsRemaining={3}
          visible={true}
        />
      );
      
      expect(screen.getByTestId('attempts-remaining')).toBeInTheDocument();
      expect(screen.getByText('Attempts remaining: 3')).toBeInTheDocument();
    });

    it('should call onDismiss when dismiss button is clicked', async () => {
      const user = userEvent.setup();
      const onDismiss = jest.fn();
      
      render(
        <FeedbackMessage
          type="error"
          message="Error"
          visible={true}
          onDismiss={onDismiss}
        />
      );
      
      const dismissButton = screen.getByTestId('dismiss-button');
      await user.click(dismissButton);
      
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('should auto-dismiss success message after 3 seconds', async () => {
      jest.useFakeTimers();
      const onDismiss = jest.fn();
      
      render(
        <FeedbackMessage
          type="success"
          message="Success!"
          visible={true}
          onDismiss={onDismiss}
        />
      );
      
      expect(onDismiss).not.toHaveBeenCalled();
      
      // Fast-forward 3 seconds
      jest.advanceTimersByTime(3000);
      
      expect(onDismiss).toHaveBeenCalledTimes(1);
      
      jest.useRealTimers();
    });

    it('should not auto-dismiss error messages', async () => {
      jest.useFakeTimers();
      const onDismiss = jest.fn();
      
      render(
        <FeedbackMessage
          type="error"
          message="Error!"
          visible={true}
          onDismiss={onDismiss}
        />
      );
      
      // Fast-forward 5 seconds
      jest.advanceTimersByTime(5000);
      
      expect(onDismiss).not.toHaveBeenCalled();
      
      jest.useRealTimers();
    });

    it('should not auto-dismiss loading messages', async () => {
      jest.useFakeTimers();
      const onDismiss = jest.fn();
      
      render(
        <FeedbackMessage
          type="loading"
          message="Loading..."
          visible={true}
          onDismiss={onDismiss}
        />
      );
      
      // Fast-forward 5 seconds
      jest.advanceTimersByTime(5000);
      
      expect(onDismiss).not.toHaveBeenCalled();
      
      jest.useRealTimers();
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Feature: facial-recognition-capture, Property 9: Loading indicator during capture
     * Validates: Requirements 6.1
     * 
     * For any Capture Button activation, the Frontend Application should display 
     * a loading indicator until the capture process completes.
     */
    it('Property 9: should always display loading indicator when type is loading and visible is true', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }), // message
          (message) => {
            const { container } = render(
              <FeedbackMessage
                type="loading"
                message={message}
                visible={true}
              />
            );
            
            // Loading indicator should be present
            const loadingElement = container.querySelector('[data-testid="feedback-loading"]');
            expect(loadingElement).not.toBeNull();
            
            // Spinner should be present
            const spinner = container.querySelector('[data-testid="loading-spinner"]');
            expect(spinner).not.toBeNull();
            
            // Message should be displayed
            expect(loadingElement?.textContent).toContain(message);
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: facial-recognition-capture, Property 10: Feedback messages displayed based on response
     * Validates: Requirements 6.2, 6.3
     * 
     * For any Backend Service response (success or error), the Frontend Application 
     * should display an appropriate feedback message with relevant details.
     */
    it('Property 10: should display appropriate feedback for any message type and content', () => {
      fc.assert(
        fc.property(
          fc.constantFrom<FeedbackType>('success', 'error', 'loading'),
          fc.string({ minLength: 1, maxLength: 200 }),
          fc.option(fc.integer({ min: 0, max: 10 }), { nil: undefined }),
          (type, message, attemptsRemaining) => {
            const { container } = render(
              <FeedbackMessage
                type={type}
                message={message}
                attemptsRemaining={attemptsRemaining}
                visible={true}
              />
            );
            
            // Appropriate feedback element should be present
            const feedbackElement = container.querySelector(
              `[data-testid="feedback-${type}"]`
            );
            expect(feedbackElement).not.toBeNull();
            
            // Message should be displayed
            expect(feedbackElement?.textContent).toContain(message);
            
            // If attemptsRemaining is provided and type is error, it should be displayed
            if (type === 'error' && attemptsRemaining !== undefined) {
              const attemptsElement = container.querySelector('[data-testid="attempts-remaining"]');
              if (attemptsRemaining >= 0) {
                expect(attemptsElement).not.toBeNull();
                expect(attemptsElement?.textContent).toContain(String(attemptsRemaining));
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: facial-recognition-capture, Property 11: Success message auto-dismissal
     * Validates: Requirements 6.4
     * 
     * For any success message displayed, the Frontend Application should 
     * automatically dismiss it after exactly 3 seconds.
     */
    it('Property 11: should auto-dismiss any success message after 3 seconds', () => {
      jest.useFakeTimers();
      
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          (message) => {
            const onDismiss = jest.fn();
            
            render(
              <FeedbackMessage
                type="success"
                message={message}
                visible={true}
                onDismiss={onDismiss}
              />
            );
            
            // Should not be dismissed immediately
            expect(onDismiss).not.toHaveBeenCalled();
            
            // Should not be dismissed before 3 seconds
            jest.advanceTimersByTime(2999);
            expect(onDismiss).not.toHaveBeenCalled();
            
            // Should be dismissed at exactly 3 seconds
            jest.advanceTimersByTime(1);
            expect(onDismiss).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 100 }
      );
      
      jest.useRealTimers();
    });

    /**
     * Feature: facial-recognition-capture, Property 12: Error message manual dismissal
     * Validates: Requirements 6.5
     * 
     * For any error message displayed, the Frontend Application should provide 
     * a mechanism for the user to manually dismiss it.
     */
    it('Property 12: should provide manual dismissal for any error message', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.option(fc.integer({ min: 0, max: 10 }), { nil: undefined }),
          (message, attemptsRemaining) => {
            const onDismiss = jest.fn();
            
            const { container } = render(
              <FeedbackMessage
                type="error"
                message={message}
                attemptsRemaining={attemptsRemaining}
                visible={true}
                onDismiss={onDismiss}
              />
            );
            
            // Dismiss button should be present
            const dismissButton = container.querySelector('[data-testid="dismiss-button"]');
            expect(dismissButton).not.toBeNull();
            
            // Clicking dismiss button should call onDismiss
            dismissButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
            expect(onDismiss).toHaveBeenCalledTimes(1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
