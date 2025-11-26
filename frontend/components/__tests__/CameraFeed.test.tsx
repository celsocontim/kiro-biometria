/**
 * CameraFeed Component Tests
 * 
 * Tests for camera feed component functionality including:
 * - Camera permission requests
 * - Stream lifecycle management
 * - Error handling and display
 * - FacingMode support
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import CameraFeed from '../CameraFeed';
import { cameraService } from '@/services/CameraService';

// Mock the CameraService
jest.mock('@/services/CameraService', () => ({
  cameraService: {
    requestCameraAccess: jest.fn(),
    stopStream: jest.fn(),
  },
}));

describe('CameraFeed Component', () => {
  const mockOnStreamReady = jest.fn();
  const mockOnError = jest.fn();
  const mockStream = {
    getTracks: jest.fn(() => [{ stop: jest.fn() }]),
  } as unknown as MediaStream;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should display loading indicator while requesting camera access', () => {
    // Mock a pending promise
    (cameraService.requestCameraAccess as jest.Mock).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(
      <CameraFeed
        stream={null}
        onStreamReady={mockOnStreamReady}
        onError={mockOnError}
        facingMode="user"
      />
    );

    expect(screen.getByTestId('camera-loading')).toBeInTheDocument();
    expect(screen.getByText('Accessing camera...')).toBeInTheDocument();
  });

  it('should request camera access with correct facing mode', async () => {
    (cameraService.requestCameraAccess as jest.Mock).mockResolvedValue(mockStream);

    render(
      <CameraFeed
        stream={null}
        onStreamReady={mockOnStreamReady}
        onError={mockOnError}
        facingMode="environment"
      />
    );

    await waitFor(() => {
      expect(cameraService.requestCameraAccess).toHaveBeenCalledWith('environment');
    });
  });

  it('should call onStreamReady when camera access is granted', async () => {
    (cameraService.requestCameraAccess as jest.Mock).mockResolvedValue(mockStream);

    render(
      <CameraFeed
        stream={null}
        onStreamReady={mockOnStreamReady}
        onError={mockOnError}
        facingMode="user"
      />
    );

    await waitFor(() => {
      expect(mockOnStreamReady).toHaveBeenCalledWith(mockStream);
    });
  });

  it('should display error message when camera access is denied', async () => {
    const error = new Error('Camera access denied. Please grant camera permissions to use this feature.');
    (cameraService.requestCameraAccess as jest.Mock).mockRejectedValue(error);

    render(
      <CameraFeed
        stream={null}
        onStreamReady={mockOnStreamReady}
        onError={mockOnError}
        facingMode="user"
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('camera-error')).toBeInTheDocument();
      expect(screen.getByText('Camera Access Error')).toBeInTheDocument();
      expect(screen.getByText(error.message)).toBeInTheDocument();
    });
  });

  it('should call onError when camera access fails', async () => {
    const error = new Error('No camera found');
    (cameraService.requestCameraAccess as jest.Mock).mockRejectedValue(error);

    render(
      <CameraFeed
        stream={null}
        onStreamReady={mockOnStreamReady}
        onError={mockOnError}
        facingMode="user"
      />
    );

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith(error);
    });
  });

  it('should stop stream when component unmounts', async () => {
    (cameraService.requestCameraAccess as jest.Mock).mockResolvedValue(mockStream);

    const { unmount } = render(
      <CameraFeed
        stream={null}
        onStreamReady={mockOnStreamReady}
        onError={mockOnError}
        facingMode="user"
      />
    );

    await waitFor(() => {
      expect(mockOnStreamReady).toHaveBeenCalled();
    });

    unmount();

    expect(cameraService.stopStream).toHaveBeenCalledWith(mockStream);
  });

  it('should request new camera access when facingMode changes', async () => {
    (cameraService.requestCameraAccess as jest.Mock).mockResolvedValue(mockStream);

    const { rerender } = render(
      <CameraFeed
        stream={null}
        onStreamReady={mockOnStreamReady}
        onError={mockOnError}
        facingMode="user"
      />
    );

    await waitFor(() => {
      expect(cameraService.requestCameraAccess).toHaveBeenCalledWith('user');
    });

    // Change facing mode
    rerender(
      <CameraFeed
        stream={null}
        onStreamReady={mockOnStreamReady}
        onError={mockOnError}
        facingMode="environment"
      />
    );

    await waitFor(() => {
      expect(cameraService.requestCameraAccess).toHaveBeenCalledWith('environment');
    });

    // Should stop the previous stream
    expect(cameraService.stopStream).toHaveBeenCalledWith(mockStream);
  });

  it('should display video element when stream is ready', async () => {
    (cameraService.requestCameraAccess as jest.Mock).mockResolvedValue(mockStream);

    render(
      <CameraFeed
        stream={mockStream}
        onStreamReady={mockOnStreamReady}
        onError={mockOnError}
        facingMode="user"
      />
    );

    await waitFor(() => {
      const video = screen.getByTestId('camera-video');
      expect(video).toBeInTheDocument();
      expect(video).not.toHaveClass('hidden');
    });
  });

  it('should provide troubleshooting instructions in error message', async () => {
    const error = new Error('Camera access denied');
    (cameraService.requestCameraAccess as jest.Mock).mockRejectedValue(error);

    render(
      <CameraFeed
        stream={null}
        onStreamReady={mockOnStreamReady}
        onError={mockOnError}
        facingMode="user"
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Grant camera permissions in your browser settings/i)).toBeInTheDocument();
      expect(screen.getByText(/Ensure no other application is using the camera/i)).toBeInTheDocument();
      expect(screen.getByText(/Check that your device has a working camera/i)).toBeInTheDocument();
    });
  });
});
