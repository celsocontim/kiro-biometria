/**
 * Camera-related type definitions
 */

export interface CameraConstraints {
  video: {
    facingMode: 'user' | 'environment';
    width: { ideal: number };
    height: { ideal: number };
  };
  audio: false;
}

export type FacingMode = 'user' | 'environment';
