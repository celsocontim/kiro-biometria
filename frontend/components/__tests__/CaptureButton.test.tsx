/**
 * CaptureButton Component Tests
 * 
 * Property-based tests for capture button functionality including:
 * - Button state management during capture
 * - Disabled state handling
 * - Loading state display
 * - Responsive sizing
 * 
 * Feature: facial-recognition-capture, Property 3: Button state management during capture
 * Validates: Requirements 2.4, 2.5
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import fc from 'fast-check';
import CaptureButton from '../CaptureButton';

describe('CaptureButton Component', () => {
  describe('Unit Tests', () => {
    it('should render the button with correct structure', () => {
      const mockOnClick = jest.fn();
      render(<CaptureButton onClick={mockOnClick} disabled={false} isLoading={false} />);
      
      expect(screen.getByTestId('capture-button-container')).toBeInTheDocument();
      expect(screen.getByTestId('capture-button')).toBeInTheDocument();
    });

    it('should display camera icon when not loading', () => {
      const mockOnClick = jest.fn();
      render(<CaptureButton onClick={mockOnClick} disabled={false} isLoading={false} />);
      
      expect(screen.getByTestId('capture-button-icon')).toBeInTheDocument();
      expect(screen.queryByTestId('capture-button-spinner')).not.toBeInTheDocument();
    });

    it('should display spinner when loading', () => {
      const mockOnClick = jest.fn();
      render(<CaptureButton onClick={mockOnClick} disabled={false} isLoading={true} />);
      
      expect(screen.getByTestId('capture-button-spinner')).toBeInTheDocument();
      expect(screen.queryByTestId('capture-button-icon')).not.toBeInTheDocument();
    });

    it('should call onClick when clicked and not disabled', () => {
      const mockOnClick = jest.fn();
      render(<CaptureButton onClick={mockOnClick} disabled={false} isLoading={false} />);
      
      const button = screen.getByTestId('capture-button');
      fireEvent.click(button);
      
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', () => {
      const mockOnClick = jest.fn();
      render(<CaptureButton onClick={mockOnClick} disabled={true} isLoading={false} />);
      
      const button = screen.getByTestId('capture-button');
      fireEvent.click(button);
      
      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('should not call onClick when loading', () => {
      const mockOnClick = jest.fn();
      render(<CaptureButton onClick={mockOnClick} disabled={false} isLoading={true} />);
      
      const button = screen.getByTestId('capture-button');
      fireEvent.click(button);
      
      expect(mockOnClick).not.toHaveBeenCalled();
    });

    it('should have disabled attribute when disabled prop is true', () => {
      const mockOnClick = jest.fn();
      render(<CaptureButton onClick={mockOnClick} disabled={true} isLoading={false} />);
      
      const button = screen.getByTestId('capture-button');
      expect(button).toBeDisabled();
    });

    it('should have disabled attribute when isLoading is true', () => {
      const mockOnClick = jest.fn();
      render(<CaptureButton onClick={mockOnClick} disabled={false} isLoading={true} />);
      
      const button = screen.getByTestId('capture-button');
      expect(button).toBeDisabled();
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Feature: facial-recognition-capture, Property 3: Button state management during capture
     * Validates: Requirements 2.4, 2.5
     * 
     * Property: For any capture process, the Capture Button should be:
     * 1. Disabled when activated (isLoading=true or disabled=true)
     * 2. Re-enabled when the process completes (isLoading=false and disabled=false)
     * 3. Not trigger onClick when disabled or loading
     */
    it('should be disabled when isLoading is true regardless of disabled prop', () => {
      fc.assert(
        fc.property(
          // Generate boolean for disabled prop
          fc.boolean(),
          (disabledProp) => {
            const mockOnClick = jest.fn();
            const { container, unmount } = render(
              <CaptureButton 
                onClick={mockOnClick} 
                disabled={disabledProp} 
                isLoading={true} 
              />
            );
            
            try {
              const button = container.querySelector('[data-testid="capture-button"]') as HTMLButtonElement;
              expect(button).not.toBeNull();
              
              // Property 1: Button should be disabled during capture (isLoading=true)
              // Requirement 2.4: Disable button until capture process completes
              expect(button.disabled).toBe(true);
              
              // Verify onClick is not called when button is clicked
              fireEvent.click(button);
              expect(mockOnClick).not.toHaveBeenCalled();
              
              // Verify loading spinner is displayed
              const spinner = container.querySelector('[data-testid="capture-button-spinner"]');
              expect(spinner).not.toBeNull();
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be disabled when disabled prop is true regardless of isLoading', () => {
      fc.assert(
        fc.property(
          // Generate boolean for isLoading prop
          fc.boolean(),
          (isLoadingProp) => {
            const mockOnClick = jest.fn();
            const { container, unmount } = render(
              <CaptureButton 
                onClick={mockOnClick} 
                disabled={true} 
                isLoading={isLoadingProp} 
              />
            );
            
            try {
              const button = container.querySelector('[data-testid="capture-button"]') as HTMLButtonElement;
              expect(button).not.toBeNull();
              
              // Property: Button should be disabled when disabled prop is true
              expect(button.disabled).toBe(true);
              
              // Verify onClick is not called when button is clicked
              fireEvent.click(button);
              expect(mockOnClick).not.toHaveBeenCalled();
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be enabled only when both disabled and isLoading are false', () => {
      fc.assert(
        fc.property(
          // Generate boolean combinations for disabled and isLoading
          fc.boolean(),
          fc.boolean(),
          (disabledProp, isLoadingProp) => {
            const mockOnClick = jest.fn();
            const { container, unmount } = render(
              <CaptureButton 
                onClick={mockOnClick} 
                disabled={disabledProp} 
                isLoading={isLoadingProp} 
              />
            );
            
            try {
              const button = container.querySelector('[data-testid="capture-button"]') as HTMLButtonElement;
              expect(button).not.toBeNull();
              
              // Property 2: Button should be enabled only when capture completes
              // Requirement 2.5: Re-enable button when capture process completes
              const shouldBeEnabled = !disabledProp && !isLoadingProp;
              expect(button.disabled).toBe(!shouldBeEnabled);
              
              // Verify onClick behavior matches enabled state
              fireEvent.click(button);
              if (shouldBeEnabled) {
                expect(mockOnClick).toHaveBeenCalledTimes(1);
              } else {
                expect(mockOnClick).not.toHaveBeenCalled();
              }
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should transition from disabled to enabled when capture completes', () => {
      fc.assert(
        fc.property(
          // Generate initial disabled state
          fc.boolean(),
          (initialDisabled) => {
            const mockOnClick = jest.fn();
            
            // Start with loading state (capture in progress)
            const { container, rerender, unmount } = render(
              <CaptureButton 
                onClick={mockOnClick} 
                disabled={initialDisabled} 
                isLoading={true} 
              />
            );
            
            try {
              const button = container.querySelector('[data-testid="capture-button"]') as HTMLButtonElement;
              expect(button).not.toBeNull();
              
              // Property: Button should be disabled during capture
              // Requirement 2.4: Disable button until capture process completes
              expect(button.disabled).toBe(true);
              
              // Verify loading spinner is shown
              let spinner = container.querySelector('[data-testid="capture-button-spinner"]');
              expect(spinner).not.toBeNull();
              
              // Simulate capture completion (isLoading becomes false)
              rerender(
                <CaptureButton 
                  onClick={mockOnClick} 
                  disabled={initialDisabled} 
                  isLoading={false} 
                />
              );
              
              // Property: Button state should reflect completion
              // Requirement 2.5: Re-enable button when capture process completes
              expect(button.disabled).toBe(initialDisabled);
              
              // Verify spinner is hidden and icon is shown
              spinner = container.querySelector('[data-testid="capture-button-spinner"]');
              expect(spinner).toBeNull();
              
              const icon = container.querySelector('[data-testid="capture-button-icon"]');
              expect(icon).not.toBeNull();
              
              // Verify onClick works if button is enabled
              fireEvent.click(button);
              if (!initialDisabled) {
                expect(mockOnClick).toHaveBeenCalledTimes(1);
              } else {
                expect(mockOnClick).not.toHaveBeenCalled();
              }
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should display correct visual state for all state combinations', () => {
      fc.assert(
        fc.property(
          fc.boolean(),
          fc.boolean(),
          (disabledProp, isLoadingProp) => {
            const mockOnClick = jest.fn();
            const { container, unmount } = render(
              <CaptureButton 
                onClick={mockOnClick} 
                disabled={disabledProp} 
                isLoading={isLoadingProp} 
              />
            );
            
            try {
              const button = container.querySelector('[data-testid="capture-button"]') as HTMLButtonElement;
              expect(button).not.toBeNull();
              
              // Property: Visual state should match functional state
              if (isLoadingProp) {
                // Should show spinner when loading
                const spinner = container.querySelector('[data-testid="capture-button-spinner"]');
                expect(spinner).not.toBeNull();
                
                const icon = container.querySelector('[data-testid="capture-button-icon"]');
                expect(icon).toBeNull();
              } else {
                // Should show icon when not loading
                const icon = container.querySelector('[data-testid="capture-button-icon"]');
                expect(icon).not.toBeNull();
                
                const spinner = container.querySelector('[data-testid="capture-button-spinner"]');
                expect(spinner).toBeNull();
              }
              
              // Button should be disabled if either prop is true
              const shouldBeDisabled = disabledProp || isLoadingProp;
              expect(button.disabled).toBe(shouldBeDisabled);
            } finally {
              unmount();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
