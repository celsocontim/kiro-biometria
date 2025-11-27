/**
 * Página CaptureScreen
 * 
 * Componente principal da página que orquestra o fluxo de captura de reconhecimento facial.
 * Integra todos os componentes filhos e gerencia o estado da aplicação.
 * 
 * Requisitos: 2.2, 2.3, 4.1, 7.2, 7.3
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import CameraFeed from '@/components/CameraFeed';
import FaceOvalGuide from '@/components/FaceOvalGuide';
import CaptureButton from '@/components/CaptureButton';
import CameraSwitchButton from '@/components/CameraSwitchButton';
import SuccessScreen from '@/components/SuccessScreen';
import FeedbackMessage, { FeedbackType } from '@/components/FeedbackMessage';
import { cameraService } from '@/services/CameraService';
import { apiClient } from '@/services/APIClient';
import { iframeMessenger } from '@/services/IframeMessenger';
import type { FacingMode } from '@/types/camera.types';

export default function Home() {
  const searchParams = useSearchParams();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  // Obtém userId dos parâmetros de consulta
  // Requisito 4.1: Gerar ou aceitar Identificador de Usuário
  const userId = searchParams.get('userId') || 'default-user';
  
  // Ref do container para dimensões
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  
  // Estado da aplicação
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>('user');
  const [isCapturing, setIsCapturing] = useState(false);
  const [recognitionSuccess, setRecognitionSuccess] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isRegistered, setIsRegistered] = useState<boolean | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [wasRegistration, setWasRegistration] = useState(false);  // Rastreia se o sucesso foi de um cadastro
  
  // Estado de feedback
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('loading');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState<number | undefined>(undefined);
  
  // Estado de troca de câmera
  const [showCameraSwitch, setShowCameraSwitch] = useState(false);
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  
  // Ref para prevenir verificações duplicadas de cadastro no React Strict Mode
  const registrationCheckRef = useRef(false);
  
  // Verifica se o usuário está cadastrado na montagem
  useEffect(() => {
    // Previne chamadas duplicadas no React Strict Mode (apenas desenvolvimento)
    if (registrationCheckRef.current) return;
    registrationCheckRef.current = true;
    
    const checkRegistration = async () => {
      console.log('[CaptureScreen] Checking user registration:', {
        userId,
        timestamp: new Date().toISOString()
      });
      
      const registered = await apiClient.checkUserRegistration(userId);
      setIsRegistered(registered);
      
      console.log('[CaptureScreen] User registration status:', {
        userId,
        registered,
        timestamp: new Date().toISOString()
      });
    };
    
    checkRegistration();
  }, [userId]);
  
  // Verifica se o dispositivo é móvel e tem múltiplas câmeras
  useEffect(() => {
    const checkCameraAvailability = async () => {
      const isMobile = cameraService.isMobileDevice();
      if (isMobile) {
        const cameras = await cameraService.getAvailableCameras();
        setShowCameraSwitch(cameras.length > 1);
      }
    };
    
    checkCameraAvailability();
  }, []);
  
  // Rastreia dimensões do container para FaceOvalGuide
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerDimensions({ width: rect.width, height: rect.height });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, [cameraStream]);
  
  // Armazena ref do elemento de vídeo para captura
  useEffect(() => {
    if (cameraStream) {
      const videoElement = document.querySelector('video[data-testid="camera-video"]') as HTMLVideoElement;
      if (videoElement) {
        videoRef.current = videoElement;
      }
    }
  }, [cameraStream]);
  
  // Manipula stream de câmera pronto
  const handleStreamReady = (stream: MediaStream) => {
    setCameraStream(stream);
  };
  
  // Manipula erros da câmera
  const handleCameraError = (error: Error) => {
    setFeedbackType('error');
    setFeedbackMessage(error.message);
    setFeedbackVisible(true);
  };
  
  // Manipula troca de câmera
  // Requisito 7.2: Alternar entre câmeras frontal e traseira
  // Requisito 7.3: Manter feed da câmera sem recarregar a página
  const handleCameraSwitch = async () => {
    if (isSwitchingCamera) return;
    
    setIsSwitchingCamera(true);
    
    // Alterna modo de câmera
    const newFacingMode: FacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);
    
    // Adiciona pequeno atraso para permitir troca de câmera
    setTimeout(() => {
      setIsSwitchingCamera(false);
    }, 500);
  };
  
  // Manipula clique no botão de captura
  // Requisito 2.2: Capturar quadro atual da câmera como imagem
  // Requisito 2.3: Enviar dados de imagem para o Serviço Backend
  // Requisitos: 1.5, 4.4, 5.4 - Tratamento de erros durante todo o fluxo de captura
  const handleCapture = async () => {
    if (!videoRef.current || !cameraStream || isCapturing || recognitionSuccess || isLocked) {
      return;
    }
    
    try {
      // Define estado de captura
      setIsCapturing(true);
      setFeedbackType('loading');
      setFeedbackMessage('Processando sua imagem...');
      setFeedbackVisible(true);
      
      // Captura quadro do elemento de vídeo
      let imageData: string;
      try {
        imageData = cameraService.captureFrame(videoRef.current);
      } catch (captureError) {
        console.error('[CaptureScreen] Failed to capture frame:', captureError);
        throw new Error('Falha ao capturar imagem da câmera. Por favor, tente novamente.');
      }
      
      // Se o usuário não está cadastrado, cadastra primeiro
      if (isRegistered === false) {
        console.log('[CaptureScreen] User not registered, starting registration:', {
          userId,
          timestamp: new Date().toISOString()
        });
        
        setIsRegistering(true);
        setFeedbackMessage('Cadastrando seu rosto...');
        
        const registrationResult = await apiClient.registerUser(userId, imageData);
        
        if (!registrationResult.success) {
          console.error('[CaptureScreen] Registration failed:', {
            userId,
            error: registrationResult.error,
            timestamp: new Date().toISOString()
          });
          
          setFeedbackType('error');
          setFeedbackMessage(registrationResult.error || 'Falha ao cadastrar. Por favor, tente novamente.');
          setFeedbackVisible(true);
          setIsRegistering(false);
          setIsCapturing(false);
          return;
        }
        
        console.log('[CaptureScreen] Registration successful:', {
          userId,
          timestamp: new Date().toISOString()
        });
        
        // Atualiza status de cadastro
        setIsRegistered(true);
        setIsRegistering(false);
        
        // Cadastro bem-sucedido - mostra tela de sucesso
        setWasRegistration(true);  // Marca como sucesso de cadastro
        setRecognitionSuccess(true);
        setFeedbackType('success');
        setFeedbackMessage('Cadastro realizado com sucesso!');
        setFeedbackVisible(true);
        
        // Envia mensagem de sucesso para janela pai se incorporado
        iframeMessenger.sendCompletionStatus(true);
        
        return;
      }
      
      // Usuário está cadastrado - envia para backend para identificação
      const response = await apiClient.submitCapture(imageData, userId);
      
      // Manipula resposta
      if (response.success && response.data?.recognized) {
        // Sucesso - rosto reconhecido
        console.log('[CaptureScreen] Recognition successful:', {
          userId,
          confidence: response.data.confidence,
          timestamp: new Date().toISOString()
        });
        
        setRecognitionSuccess(true);
        setFeedbackType('success');
        setFeedbackMessage('Rosto reconhecido com sucesso!');
        setFeedbackVisible(true);
        
        // Envia mensagem de sucesso para janela pai se incorporado
        iframeMessenger.sendCompletionStatus(true);
      } else if (response.errorCode === 'MAX_ATTEMPTS_EXCEEDED') {
        // Requisito 8.2: Manipular tentativas máximas excedidas
        console.warn('[CaptureScreen] Max attempts exceeded:', {
          userId,
          timestamp: new Date().toISOString()
        });
        
        setIsLocked(true);
        setFeedbackType('error');
        setFeedbackMessage(response.error || 'Número máximo de tentativas excedido. Por favor, entre em contato com o suporte.');
        setAttemptsRemaining(0);
        setFeedbackVisible(true);
        
        // Envia mensagem de falha para janela pai se incorporado
        iframeMessenger.sendCompletionStatus(false);
      } else if (response.errorCode === 'LIVENESS_CHECK_ERROR') {
        // Manipula detecção de fraude
        console.log('Spoff');
        console.warn('[CaptureScreen] Spoof attempt detected:', {
          userId,
          error: response.error,
          errorCode: response.errorCode,
          timestamp: new Date().toISOString()
        });
        
        setFeedbackType('error');
        setFeedbackMessage(response.error || 'Tentativa de fraude! Certifique-se de usar um rosto real!');
        setFeedbackVisible(true);
      } else if (response.error && response.error.toLowerCase().includes('spoof')) {
        // Manipula detecção de fraude (verificação de fallback)
        console.log('Spoff');
        console.warn('[CaptureScreen] Spoof attempt detected (via message):', {
          userId,
          error: response.error,
          timestamp: new Date().toISOString()
        });
        
        setFeedbackType('error');
        setFeedbackMessage(response.error);
        setFeedbackVisible(true);
      } else if (response.errorCode === 'INVALID_REQUEST') {
        // Requisito 4.4: Manipular erros de validação
        console.error('[CaptureScreen] Invalid request:', {
          userId,
          error: response.error,
          timestamp: new Date().toISOString()
        });
        
        setFeedbackType('error');
        setFeedbackMessage(response.error || 'Requisição inválida. Por favor, atualize a página e tente novamente.');
        setFeedbackVisible(true);
      } else if (response.errorCode === 'SERVER_ERROR') {
        // Requisito 5.4: Manipular erros de servidor
        console.error('[CaptureScreen] Server error:', {
          userId,
          error: response.error,
          timestamp: new Date().toISOString()
        });
        
        setFeedbackType('error');
        setFeedbackMessage(response.error || 'Erro no servidor. Por favor, tente novamente em instantes.');
        setFeedbackVisible(true);
      } else {
        // Reconhecimento falhou mas pode tentar novamente
        console.log('[CaptureScreen] Recognition failed:', {
          userId,
          attemptsRemaining: response.data?.attemptsRemaining,
          timestamp: new Date().toISOString()
        });
        
        setFeedbackType('error');
        setFeedbackMessage(response.error || 'Rosto não reconhecido. Por favor, posicione seu rosto dentro da guia e tente novamente.');
        setAttemptsRemaining(response.data?.attemptsRemaining);
        setFeedbackVisible(true);
      }
    } catch (error) {
      // Manipula erros inesperados
      console.error('[CaptureScreen] Unexpected error during capture:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      
      setFeedbackType('error');
      setFeedbackMessage(
        error instanceof Error 
          ? error.message 
          : 'Ocorreu um erro inesperado. Por favor, tente novamente.'
      );
      setFeedbackVisible(true);
    } finally {
      setIsCapturing(false);
    }
  };
  
  // Manipula dispensa de feedback
  const handleFeedbackDismiss = () => {
    setFeedbackVisible(false);
  };
  
  // Mostra tela de sucesso se reconhecimento foi bem-sucedido
  if (recognitionSuccess) {
    return <SuccessScreen userId={userId} isRegistration={wasRegistration} />;
  }
  
  return (
    <main className="relative w-screen h-screen overflow-hidden bg-black">
      {/* Feedback Message */}
      <FeedbackMessage
        type={feedbackType}
        message={feedbackMessage}
        attemptsRemaining={attemptsRemaining}
        onDismiss={handleFeedbackDismiss}
        visible={feedbackVisible}
      />
      
      {/* Camera Feed Container - Full Screen */}
      <div className="absolute inset-0 bg-black">
        <div 
          ref={containerRef}
          className="relative w-full h-full"
        >
          <CameraFeed
            stream={cameraStream}
            onStreamReady={handleStreamReady}
            onError={handleCameraError}
            facingMode={facingMode}
            userId={userId}
          />
          
          {/* User ID Display */}
          <div className="absolute top-4 left-4 z-20 max-w-[50vw]">
            <p 
              className="text-white font-bold break-words"
              style={{
                textShadow: '2px 2px 4px rgba(0, 0, 0, 0.8), -1px -1px 2px rgba(0, 0, 0, 0.8), 1px -1px 2px rgba(0, 0, 0, 0.8), -1px 1px 2px rgba(0, 0, 0, 0.8)',
                fontSize: 'clamp(1rem, 4vw, 2rem)'
              }}
            >
              {userId}
            </p>
          </div>
          
          {/* Face Oval Guide Overlay */}
          {cameraStream && containerDimensions.width > 0 && (
            <FaceOvalGuide width={containerDimensions.width} height={containerDimensions.height} />
          )}
          
          {/* Camera Switch Button (mobile only) */}
          {cameraStream && !recognitionSuccess && (
            <CameraSwitchButton
              onClick={handleCameraSwitch}
              visible={showCameraSwitch && !isLocked}
            />
          )}
          
          {/* Capture Button */}
          {cameraStream && !recognitionSuccess && (
            <CaptureButton
              onClick={handleCapture}
              disabled={isCapturing || isLocked || isRegistered === null}
              isLoading={isCapturing}
            />
          )}
        </div>
      </div>
    </main>
  );
}
