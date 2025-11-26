/**
 * FaceOvalGuide Component Tests
 * 
 * Property-based tests for face oval guide component functionality including:
 * - Oval centering across viewport dimensions
 * - Proportional sizing relative to viewport
 * - Responsive behavior
 * 
 * Feature: facial-recognition-capture, Property 1: Face oval guide is always centered and proportional
 * Validates: Requirements 1.2, 1.3
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import fc from 'fast-check';
import FaceOvalGuide from '../FaceOvalGuide';

describe('FaceOvalGuide Component', () => {
  describe('Unit Tests', () => {
    it('should render the oval guide with correct structure', () => {
      render(<FaceOvalGuide width={1024} height={768} />);
      
      expect(screen.getByTestId('face-oval-guide')).toBeInTheDocument();
      expect(screen.getByTestId('face-oval-svg')).toBeInTheDocument();
      expect(screen.getByTestId('oval-border')).toBeInTheDocument();
    });

    it('should render centered oval for mobile viewport', () => {
      const width = 375;
      const height = 667;
      
      render(<FaceOvalGuide width={width} height={height} />);
      
      const ovalBorder = screen.getByTestId('oval-border');
      const cx = parseFloat(ovalBorder.getAttribute('cx') || '0');
      const cy = parseFloat(ovalBorder.getAttribute('cy') || '0');
      
      // Should be centered
      expect(cx).toBe(width / 2);
      expect(cy).toBe(height / 2);
    });

    it('should render centered oval for desktop viewport', () => {
      const width = 1920;
      const height = 1080;
      
      render(<FaceOvalGuide width={width} height={height} />);
      
      const ovalBorder = screen.getByTestId('oval-border');
      const cx = parseFloat(ovalBorder.getAttribute('cx') || '0');
      const cy = parseFloat(ovalBorder.getAttribute('cy') || '0');
      
      // Should be centered
      expect(cx).toBe(width / 2);
      expect(cy).toBe(height / 2);
    });

    it('should have vertical oval proportions (height > width)', () => {
      const width = 1024;
      const height = 768;
      
      render(<FaceOvalGuide width={width} height={height} />);
      
      const ovalBorder = screen.getByTestId('oval-border');
      const rx = parseFloat(ovalBorder.getAttribute('rx') || '0');
      const ry = parseFloat(ovalBorder.getAttribute('ry') || '0');
      
      // Vertical oval: ry (height radius) should be greater than rx (width radius)
      expect(ry).toBeGreaterThan(rx);
    });
  });

  describe('Property-Based Tests', () => {
    /**
     * Feature: facial-recognition-capture, Property 1: Face oval guide is always centered and proportional
     * Validates: Requirements 1.2, 1.3
     * 
     * Property: For any viewport dimensions, the Face Oval Guide should be:
     * 1. Centered in the viewport (cx = width/2, cy = height/2)
     * 2. Proportionally sized relative to viewport dimensions
     * 3. Vertical oval (height > width)
     */
    it('should always center oval in viewport for any dimensions', () => {
      fc.assert(
        fc.property(
          // Generate viewport dimensions
          // Width: 320px (small mobile) to 3840px (4K)
          // Height: 568px (small mobile) to 2160px (4K)
          fc.integer({ min: 320, max: 3840 }),
          fc.integer({ min: 568, max: 2160 }),
          (width, height) => {
            const { container, unmount } = render(<FaceOvalGuide width={width} height={height} />);
            
            try {
              const ovalBorder = container.querySelector('[data-testid="oval-border"]') as SVGElement;
              expect(ovalBorder).not.toBeNull();
              
              const cx = parseFloat(ovalBorder.getAttribute('cx') || '0');
              const cy = parseFloat(ovalBorder.getAttribute('cy') || '0');
              
              // Property 1: Oval should be centered in viewport
              // Requirement 1.2: Overlay vertical oval Face Oval Guide in center of viewport
              expect(cx).toBe(width / 2);
              expect(cy).toBe(height / 2);
            } finally {
              // Cleanup
              unmount();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain proportional sizing relative to viewport dimensions', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 320, max: 3840 }),
          fc.integer({ min: 568, max: 2160 }),
          (width, height) => {
            const { container, unmount } = render(<FaceOvalGuide width={width} height={height} />);
            
            try {
              const ovalBorder = container.querySelector('[data-testid="oval-border"]') as SVGElement;
              expect(ovalBorder).not.toBeNull();
              
              const rx = parseFloat(ovalBorder.getAttribute('rx') || '0');
              const ry = parseFloat(ovalBorder.getAttribute('ry') || '0');
              
              // Property 2: Oval dimensions should be proportional to viewport
              // Requirement 1.3: Maintain Face Oval Guide centered and proportionally sized
              
              // Oval height should be a percentage of viewport height
              const isMobile = width < 768;
              const heightPercentage = isMobile ? 0.6 : 0.5;
              const expectedOvalHeight = height * heightPercentage;
              const expectedOvalWidth = expectedOvalHeight * 0.7;
              
              // ry is the radius (half of height)
              expect(ry).toBeCloseTo(expectedOvalHeight / 2, 1);
              expect(rx).toBeCloseTo(expectedOvalWidth / 2, 1);
              
              // Property 3: Should be a vertical oval (height > width)
              // Requirement 1.2: Vertical oval Face Oval Guide
              expect(ry).toBeGreaterThan(rx);
            } finally {
              // Cleanup
              unmount();
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should adapt oval size when viewport dimensions change', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 320, max: 3840 }),
          fc.integer({ min: 568, max: 2160 }),
          fc.integer({ min: 320, max: 3840 }),
          fc.integer({ min: 568, max: 2160 }),
          (width1, height1, width2, height2) => {
            // Render with first dimensions
            const { container, rerender, unmount } = render(
              <FaceOvalGuide width={width1} height={height1} />
            );
            
            try {
              const ovalBorder1 = container.querySelector('[data-testid="oval-border"]') as SVGElement;
              expect(ovalBorder1).not.toBeNull();
              
              const rx1 = parseFloat(ovalBorder1.getAttribute('rx') || '0');
              const ry1 = parseFloat(ovalBorder1.getAttribute('ry') || '0');
              const cx1 = parseFloat(ovalBorder1.getAttribute('cx') || '0');
              const cy1 = parseFloat(ovalBorder1.getAttribute('cy') || '0');
              
              // Verify first render is centered
              expect(cx1).toBe(width1 / 2);
              expect(cy1).toBe(height1 / 2);
              
              // Rerender with second dimensions
              rerender(<FaceOvalGuide width={width2} height={height2} />);
              
              const ovalBorder2 = container.querySelector('[data-testid="oval-border"]') as SVGElement;
              expect(ovalBorder2).not.toBeNull();
              
              const rx2 = parseFloat(ovalBorder2.getAttribute('rx') || '0');
              const ry2 = parseFloat(ovalBorder2.getAttribute('ry') || '0');
              const cx2 = parseFloat(ovalBorder2.getAttribute('cx') || '0');
              const cy2 = parseFloat(ovalBorder2.getAttribute('cy') || '0');
              
              // Property: Oval should remain centered after dimension change
              // Requirement 1.3: Maintain Face Oval Guide centered and proportionally sized
              expect(cx2).toBe(width2 / 2);
              expect(cy2).toBe(height2 / 2);
              
              // If dimensions changed significantly, oval size should also change
              if (Math.abs(height1 - height2) > 100) {
                expect(ry1).not.toBeCloseTo(ry2, 0);
              }
            } finally {
              // Cleanup
              unmount();
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
