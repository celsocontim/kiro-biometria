/**
 * SuccessScreen Component Tests
 * 
 * Tests for success screen display, content, and capture prevention.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import fc from 'fast-check';
import SuccessScreen from '../SuccessScreen';

describe('SuccessScreen', () => {
  describe('Unit Tests', () => {
    it('should render success screen with userId', () => {
      const userId = 'test-user-123';
      render(<SuccessScreen userId={userId} />);
      
      const successScreen = screen.getByTestId('success-screen');
      expect(successScreen).toBeInTheDocument();
      
      const userIdElement = screen.getByTestId('success-user-id');
      expect(userIdElement).toHaveTextContent(`User ID: ${userId}`);
    });

    it('should display success message', () => {
      render(<SuccessScreen userId="test-user" />);
      
      const title = screen.getByTestId('success-title');
      expect(title).toHaveTextContent('Recognition Successful!');
      
      const message = screen.getByTestId('success-message');
      expect(message).toHaveTextContent('Your face has been successfully recognized.');
    });

    it('should display success icon', () => {
      render(<SuccessScreen userId="test-user" />);
      
      const icon = screen.getByTestId('success-icon');
      expect(icon).toBeInTheDocument();
    });

    it('should call onComplete callback when provided', () => {
      const mockOnComplete = jest.fn();
      render(<SuccessScreen userId="test-user" onComplete={mockOnComplete} />);
      
      expect(mockOnComplete).toHaveBeenCalledTimes(1);
    });

    it('should have full-screen overlay to hide camera feed', () => {
      render(<SuccessScreen userId="test-user" />);
      
      const successScreen = screen.getByTestId('success-screen');
      expect(successScreen).toHaveClass('fixed', 'inset-0', 'z-50');
    });

    it('should have proper accessibility attributes', () => {
      render(<SuccessScreen userId="test-user" />);
      
      const successScreen = screen.getByTestId('success-screen');
      expect(successScreen).toHaveAttribute('role', 'alert');
      expect(successScreen).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Feature: facial-recognition-capture, Property 19: Success screen displayed on recognition
     * Validates: Requirements 9.1, 9.3
     * 
     * For any successful recognition response from the Backend Service, 
     * the Frontend Application should display the success screen and hide 
     * the camera feed and capture controls.
     */
    it('Property 19: should display success screen for any valid userId', () => {
      fc.assert(
        fc.property(
          // Generate various valid user identifiers
          fc.string({ minLength: 1, maxLength: 255 }),
          (userId) => {
            const { container, unmount } = render(<SuccessScreen userId={userId} />);
            
            try {
              // Success screen should be displayed
              const successScreen = container.querySelector('[data-testid="success-screen"]') as HTMLElement;
              expect(successScreen).not.toBeNull();
              
              // Should have full-screen overlay (hides camera feed and controls)
              expect(successScreen.classList.contains('fixed')).toBe(true);
              expect(successScreen.classList.contains('inset-0')).toBe(true);
              
              // Should have highest z-index to overlay everything
              expect(successScreen.classList.contains('z-50')).toBe(true);
              
              // Should display the userId
              const userIdElement = container.querySelector('[data-testid="success-user-id"]') as HTMLElement;
              expect(userIdElement).not.toBeNull();
              expect(userIdElement.textContent).toContain(userId);
            } finally {
              // Cleanup properly
              unmount();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: facial-recognition-capture, Property 20: Success screen shows confirmation
     * Validates: Requirements 9.2, 9.4
     * 
     * For any success screen display, the Frontend Application should show 
     * a confirmation message and visual feedback indicating successful recognition.
     */
    it('Property 20: should show confirmation message and visual feedback for any userId', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 255 }),
          (userId) => {
            const { container, unmount } = render(<SuccessScreen userId={userId} />);
            
            try {
              // Should display confirmation title
              const title = container.querySelector('[data-testid="success-title"]') as HTMLElement;
              expect(title).not.toBeNull();
              expect(title.textContent).toBeTruthy();
              expect(title.textContent?.toLowerCase()).toContain('success');
              
              // Should display confirmation message
              const message = container.querySelector('[data-testid="success-message"]') as HTMLElement;
              expect(message).not.toBeNull();
              expect(message.textContent).toBeTruthy();
              
              // Should display visual feedback (success icon)
              const icon = container.querySelector('[data-testid="success-icon"]') as HTMLElement;
              expect(icon).not.toBeNull();
              
              // Should have visual feedback container
              const iconContainer = container.querySelector('[data-testid="success-icon-container"]') as HTMLElement;
              expect(iconContainer).not.toBeNull();
              
              // Should have animation for visual feedback
              const checkmarkAnimation = container.querySelector('[data-testid="success-checkmark-animation"]') as HTMLElement;
              expect(checkmarkAnimation).not.toBeNull();
            } finally {
              // Cleanup properly
              unmount();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Feature: facial-recognition-capture, Property 21: Success screen prevents further captures
     * Validates: Requirements 9.5
     * 
     * For any user on the success screen, the Frontend Application should 
     * prevent further capture attempts.
     */
    it('Property 21: should prevent further captures by overlaying entire screen', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 255 }),
          (userId) => {
            const { container, unmount } = render(<SuccessScreen userId={userId} />);
            
            try {
              const successScreen = container.querySelector('[data-testid="success-screen"]') as HTMLElement;
              expect(successScreen).not.toBeNull();
              
              // Should cover entire viewport (prevents interaction with underlying elements)
              // The 'fixed' and 'inset-0' classes create a full-screen overlay
              expect(successScreen.classList.contains('fixed')).toBe(true);
              expect(successScreen.classList.contains('inset-0')).toBe(true);
              
              // Should have high z-index to be on top of all other elements
              // This prevents any interaction with underlying camera feed or capture button
              expect(successScreen.classList.contains('z-50')).toBe(true);
            } finally {
              // Cleanup properly
              unmount();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
