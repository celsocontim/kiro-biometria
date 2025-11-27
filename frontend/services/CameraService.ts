/**
 * CameraService
 * 
 * Manipula todas as operações relacionadas à câmera incluindo:
 * - Solicitar acesso à câmera com suporte a modo de câmera
 * - Capturar quadros de vídeo como imagens base64
 * - Detecção de dispositivo (móvel vs desktop)
 * - Enumeração de câmeras
 * - Limpeza de stream
 * 
 * Requisitos: 1.1, 1.4, 2.2, 7.2
 */

import type { CameraConstraints, FacingMode } from '@/types/camera.types';

export class CameraService {
  /**
   * Solicita acesso à câmera com modo de câmera especificado
   * 
   * @param facingMode - 'user' para câmera frontal, 'environment' para câmera traseira
   * @param retryWithFallback - Se deve tentar novamente com restrições de fallback em caso de falha
   * @returns Promise resolvendo para MediaStream
   * @throws Error se acesso à câmera for negado ou indisponível
   * 
   * Requisito 1.1: Exibir feed de câmera ao vivo
   * Requisito 1.4: Solicitar permissões de câmera
   * Requisito 1.5: Exibir mensagens de erro para problemas de câmera
   * Requisito 7.2: Alternar entre câmeras frontal e traseira
   */
  async requestCameraAccess(facingMode: FacingMode = 'user', retryWithFallback: boolean = true): Promise<MediaStream> {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        console.error('[CameraService] getUserMedia not supported');
        throw new Error('O acesso à câmera não é suportado neste navegador. Por favor, use um navegador moderno como Chrome, Firefox ou Safari.');
      }

      // Check if we're on a secure context (HTTPS or localhost)
      if (!window.isSecureContext) {
        console.error('[CameraService] Not in secure context');
        throw new Error('O acesso à câmera requer uma conexão segura (HTTPS). Por favor, acesse esta página via HTTPS ou localhost.');
      }

      // Determine appropriate resolution based on device type
      const isMobile = this.isMobileDevice();
      const idealWidth = isMobile ? 1280 : 1920;
      const idealHeight = isMobile ? 720 : 1080;

      const constraints: CameraConstraints = {
        video: {
          facingMode,
          width: { ideal: idealWidth },
          height: { ideal: idealHeight }
        },
        audio: false
      };

      console.log('[CameraService] Requesting camera access:', {
        facingMode,
        isMobile,
        resolution: `${idealWidth}x${idealHeight}`,
        timestamp: new Date().toISOString()
      });

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('[CameraService] Camera access granted:', {
        facingMode,
        tracks: stream.getVideoTracks().length,
        timestamp: new Date().toISOString()
      });

      return stream;
    } catch (error) {
      // Log error for debugging
      console.error('[CameraService] Camera access failed:', {
        facingMode,
        error: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });

      // Try fallback with relaxed constraints for OverconstrainedError
      if (error instanceof Error && error.name === 'OverconstrainedError' && retryWithFallback) {
        console.log('[CameraService] Retrying with fallback constraints');
        try {
          // Try with basic constraints (no resolution or facing mode preference)
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
          
          console.log('[CameraService] Camera access granted with fallback constraints');
          return fallbackStream;
        } catch (fallbackError) {
          console.error('[CameraService] Fallback also failed:', fallbackError);
          // Continue to error handling below
        }
      }

      if (error instanceof Error) {
        // Requirement 1.5: Handle specific error types with user-friendly messages
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          throw new Error('Acesso à câmera negado. Por favor, permita o acesso à câmera nas configurações do navegador e atualize a página.');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          throw new Error('Nenhuma câmera encontrada neste dispositivo. Por favor, certifique-se de que seu dispositivo possui uma câmera funcionando.');
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
          throw new Error('A câmera já está em uso por outro aplicativo. Por favor, feche outros aplicativos que estejam usando a câmera e tente novamente.');
        } else if (error.name === 'OverconstrainedError') {
          throw new Error(`A câmera solicitada (${facingMode === 'user' ? 'frontal' : 'traseira'}) não está disponível. Por favor, tente trocar de câmera.`);
        } else if (error.name === 'SecurityError') {
          throw new Error('Acesso à câmera bloqueado devido às configurações de segurança. Por favor, certifique-se de estar usando HTTPS ou localhost.');
        } else if (error.name === 'TypeError') {
          throw new Error('As configurações da câmera são inválidas. Por favor, atualize a página e tente novamente.');
        } else if (error.name === 'AbortError') {
          throw new Error('O acesso à câmera foi interrompido. Por favor, tente novamente.');
        } else {
          throw new Error(`Falha ao acessar a câmera: ${error.message}`);
        }
      }
      throw new Error('Falha ao acessar a câmera devido a um erro desconhecido. Por favor, atualize a página e tente novamente.');
    }
  }

  /**
   * Captura quadro atual do elemento de vídeo como imagem base64
   * 
   * @param videoElement - HTMLVideoElement exibindo o stream da câmera
   * @returns Dados de imagem codificados em base64 com prefixo URI de dados
   * @throws Error se captura falhar ou vídeo não estiver pronto
   * 
   * Requisito 2.2: Capturar quadro atual da câmera como imagem
   * Performance: Comprimir imagens para máximo de 1MB
   */
  captureFrame(videoElement: HTMLVideoElement): string {
    try {
      // Validate video element state
      if (!videoElement) {
        throw new Error('Elemento de vídeo não está disponível');
      }

      if (videoElement.readyState < videoElement.HAVE_CURRENT_DATA) {
        throw new Error('O stream de vídeo não está pronto. Por favor, aguarde um momento e tente novamente.');
      }

      if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        throw new Error('As dimensões do vídeo são inválidas. Por favor, certifique-se de que a câmera está funcionando corretamente.');
      }

      // Create canvas with video dimensions
      const canvas = document.createElement('canvas');
      let width = videoElement.videoWidth;
      let height = videoElement.videoHeight;
      
      // Resize if dimensions are too large (max 1920x1080)
      const maxWidth = 1920;
      const maxHeight = 1080;
      
      if (width > maxWidth || height > maxHeight) {
        const aspectRatio = width / height;
        if (width > height) {
          width = maxWidth;
          height = Math.round(maxWidth / aspectRatio);
        } else {
          height = maxHeight;
          width = Math.round(maxHeight * aspectRatio);
        }
      }
      
      canvas.width = width;
      canvas.height = height;

      // Draw current video frame to canvas
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Failed to get canvas context. Your browser may not support this feature.');
      }

      context.drawImage(videoElement, 0, 0, width, height);

      // Convert to base64 JPEG with compression
      // Start with 0.8 quality and reduce if needed to stay under 1MB
      let quality = 0.8;
      let imageData = canvas.toDataURL('image/jpeg', quality);
      
      // Check size and reduce quality if needed (1MB = ~1.33MB base64)
      const maxBase64Size = 1.33 * 1024 * 1024; // 1MB in base64
      while (imageData.length > maxBase64Size && quality > 0.3) {
        quality -= 0.1;
        imageData = canvas.toDataURL('image/jpeg', quality);
      }

      // Validate that we got valid image data
      if (!imageData || !imageData.startsWith('data:image/')) {
        throw new Error('Falha ao gerar dados de imagem do quadro de vídeo');
      }

      console.log('[CameraService] Frame captured successfully:', {
        originalDimensions: `${videoElement.videoWidth}x${videoElement.videoHeight}`,
        resizedDimensions: `${width}x${height}`,
        quality,
        dataSize: imageData.length,
        dataSizeMB: (imageData.length / (1024 * 1024)).toFixed(2),
        timestamp: new Date().toISOString()
      });

      return imageData;
    } catch (error) {
      console.error('[CameraService] Frame capture failed:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        videoReady: videoElement?.readyState,
        videoDimensions: `${videoElement?.videoWidth}x${videoElement?.videoHeight}`,
        timestamp: new Date().toISOString()
      });

      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Falha ao capturar imagem da câmera. Por favor, tente novamente.');
    }
  }

  /**
   * Detecta se o dispositivo atual é móvel
   * 
   * @returns true se dispositivo for móvel, false caso contrário
   * 
   * Requisito 7.2: Exibir botão de troca de câmera em dispositivos móveis
   */
  isMobileDevice(): boolean {
    // Check user agent for mobile indicators
    const userAgent = navigator.userAgent || (window as any).opera || '';
    
    // Check for mobile patterns in user agent
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    const isMobileUA = mobileRegex.test(userAgent.toLowerCase());

    // Also check for touch support and screen size
    const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth < 768;

    // Consider it mobile if it matches UA pattern or has touch + small screen
    return isMobileUA || (hasTouchScreen && isSmallScreen);
  }

  /**
   * Obtém lista de dispositivos de câmera disponíveis
   * 
   * @returns Promise resolvendo para array de MediaDeviceInfo para dispositivos de entrada de vídeo
   * 
   * Requisito 7.2: Suportar troca de câmera
   */
  async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cameras = devices.filter(device => device.kind === 'videoinput');
      return cameras;
    } catch (error) {
      console.error('Failed to enumerate cameras:', error);
      return [];
    }
  }

  /**
   * Para stream da câmera e libera recursos
   * 
   * @param stream - MediaStream para parar
   * 
   * Requisito: Limpeza adequada de recursos
   */
  stopStream(stream: MediaStream): void {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
    }
  }
}

// Exporta instância singleton
export const cameraService = new CameraService();
