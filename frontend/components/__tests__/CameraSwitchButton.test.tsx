/**
 * CameraSwitchButton Component Tests
 * 
 * Tests for camera switch button visibility and interaction.
 * 
 * Requirements: 7.1, 7.4, 7.5
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import CameraSwitchButton from '../CameraSwitchButton';

describe('CameraSwitchButton', () => {
  describe('Visibility', () => {
    it('should render when visible prop is true', () => {
      const mockOnClick = jest.fn();
      render(<CameraSwitchButton onClick={mockOnClick} visible={true} />);
      
      const button = screen.getByTestId('camera-switch-button');
      expect(button).toBeInTheDocument();
    });

    it('should not render when visible prop is false', () => {
      const mockOnClick = jest.fn();
      render(<CameraSwitchButton onClick={mockOnClick} visible={false} />);
      
      const button = screen.queryByTestId('camera-switch-button');
      expect(button).not.toBeInTheDocument();
    });
  });

  describe('Positioning', () => {
    it('should be positioned in upper right section', () => {
      const mockOnClick = jest.fn();
      render(<CameraSwitchButton onClick={mockOnClick} visible={true} />);
      
      const container = screen.getByTestId('camera-switch-button-container');
      expect(container).toHaveClass('absolute', 'top-4', 'right-4');
    });
  });

  describe('Interaction', () => {
    it('should call onClick when button is clicked', () => {
      const mockOnClick = jest.fn();
      render(<CameraSwitchButton onClick={mockOnClick} visible={true} />);
      
      const button = screen.getByTestId('camera-switch-button');
      fireEvent.click(button);
      
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('should have proper accessibility label', () => {
      const mockOnClick = jest.fn();
      render(<CameraSwitchButton onClick={mockOnClick} visible={true} />);
      
      const button = screen.getByTestId('camera-switch-button');
      expect(button).toHaveAttribute('aria-label', 'Switch camera');
    });
  });

  describe('Styling', () => {
    it('should render camera switch icon', () => {
      const mockOnClick = jest.fn();
      render(<CameraSwitchButton onClick={mockOnClick} visible={true} />);
      
      const icon = screen.getByTestId('camera-switch-icon');
      expect(icon).toBeInTheDocument();
    });

    it('should have proper button styling', () => {
      const mockOnClick = jest.fn();
      render(<CameraSwitchButton onClick={mockOnClick} visible={true} />);
      
      const button = screen.getByTestId('camera-switch-button');
      expect(button).toHaveClass('rounded-full', 'w-12', 'h-12');
    });
  });
});
