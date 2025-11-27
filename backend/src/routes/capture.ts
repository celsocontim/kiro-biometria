import { Request, Response } from 'express';
import { CaptureRequest, CaptureResponse } from '../types/api.types';
import { RecognitionService } from '../services/RecognitionService';
import { FailureTrackingService } from '../services/FailureTrackingService';
import { IConfigurationService } from '../types/config.types';
import { debugLog, infoLog, warnLog, errorLog } from '../utils/logger';

/**
 * Valida identificador de usuário
 * @param userId Identificador de usuário para validar
 * @returns True se válido, false caso contrário
 */
function validateUserId(userId: any): userId is string {
  return typeof userId === 'string' && userId.trim().length > 0 && userId.length <= 255;
}

/**
 * Valida dados de imagem
 * @param imageData Dados de imagem para validar
 * @returns True se válido, false caso contrário
 */
function validateImageData(imageData: any): imageData is string {
  if (typeof imageData !== 'string' || imageData.length === 0) {
    return false;
  }
  
  // Verifica prefixo URI de dados (validação básica)
  // Aceita formatos data:image/jpeg;base64, e data:image/png;base64,
  const hasValidPrefix = imageData.startsWith('data:image/jpeg;base64,') || 
                         imageData.startsWith('data:image/png;base64,');
  
  return hasValidPrefix;
}

/**
 * Handler para endpoint POST /api/capture
 * Processa solicitações de captura de reconhecimento facial
 * 
 * Requisitos: 1.5, 4.4, 5.4, 8.2
 */
export async function handleCapture(
  req: Request,
  res: Response,
  recognitionService: RecognitionService,
  failureTrackingService: FailureTrackingService,
  configService: IConfigurationService
): Promise<void> {
  const startTime = Date.now();
  let userId: string | undefined;

  try {
    const requestBody = req.body;
    const imageData = requestBody?.imageData;
    const requestUserId = requestBody?.userId;
    userId = requestUserId;

    // Requisito 4.4: Validar identificador de usuário e rejeitar solicitações inválidas
    if (!validateUserId(userId)) {
      debugLog('[Capture] Invalid userId provided:', {
        userId: userId || 'undefined',
        timestamp: new Date().toISOString()
      });
      
      const response: CaptureResponse = {
        success: false,
        error: 'ID de usuário inválido ou ausente. Deve ser uma string não vazia com no máximo 255 caracteres.',
        errorCode: 'INVALID_REQUEST'
      };
      res.status(400).json(response);
      return;
    }

    // Requisito 4.4: Validar dados de imagem
    if (!validateImageData(imageData)) {
      debugLog('[Capture] Invalid imageData provided:', {
        userId,
        hasImageData: !!imageData,
        imageDataType: typeof imageData,
        timestamp: new Date().toISOString()
      });
      
      const response: CaptureResponse = {
        success: false,
        error: 'Dados de imagem inválidos ou ausentes. Deve ser uma imagem codificada em base64 com prefixo URI de dados.',
        errorCode: 'INVALID_REQUEST'
      };
      res.status(400).json(response);
      return;
    }

    // Requisito 8.2: Verificar se usuário está bloqueado devido a tentativas máximas excedidas
    const isLocked = await failureTrackingService.isUserLocked(userId);
    if (isLocked) {
      debugLog('[Capture] User is locked:', {
        userId,
        timestamp: new Date().toISOString()
      });
      
      const response: CaptureResponse = {
        success: false,
        error: 'Número máximo de tentativas de reconhecimento excedido. Por favor, entre em contato com o suporte para obter assistência.',
        errorCode: 'MAX_ATTEMPTS_EXCEEDED'
      };
      res.status(403).json(response);
      return;
    }

    // Requisito 5.4: Chamar serviço de reconhecimento com tratamento de erros
    // Obtém parâmetros de configuração
    const config = await configService.getConfiguration();
    const threshold = config.recognitionThreshold;
    const useMock = config.useMock;
    const faceApiUrl = config.faceApiUrl;
    const faceApiKey = config.faceApiKey;
    
    debugLog('[Capture] Processing recognition request:', {
      userId,
      imageSize: imageData.length,
      threshold,
      useMock,
      hasFaceApiUrl: !!faceApiUrl,
      hasFaceApiKey: !!faceApiKey,
      timestamp: new Date().toISOString()
    });

    let recognitionResult;
    try {
      recognitionResult = await recognitionService.recognize(
        imageData, 
        userId, 
        threshold, 
        useMock,
        faceApiUrl,
        faceApiKey
      );
    } catch (error) {
      // Verifica se é um erro de detecção de fraude
      if (error instanceof Error && (error as any).code === 'SPOOF_DETECTED') {
        infoLog(`Spoof attempted! User_id: ${userId}`);
        
        const response: CaptureResponse = {
          success: false,
          error: 'Tentativa de fraude! Certifique-se de usar um rosto real!',
          errorCode: 'LIVENESS_CHECK_ERROR'
        };
        
        res.status(400).json(response);
        return;
      }
      // Re-lança outros erros para serem manipulados pelo catch externo
      throw error;
    }

    debugLog('[Capture] Recognition result:', {
      userId,
      recognized: recognitionResult.recognized,
      confidence: recognitionResult.confidence,
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });

    // Registra sucesso/falha simples
    infoLog(`user_id: ${userId}, registration: false, recognized: ${recognitionResult.recognized}`);

    // Atualiza rastreamento de falhas baseado no resultado
    if (recognitionResult.recognized) {
      // Reseta falhas em caso de sucesso
      const config = await configService.getConfiguration();
      if (config.failureResetOnSuccess) {
        await failureTrackingService.resetFailures(userId);
        debugLog('[Capture] Failure count reset for user:', { userId });
      }
    } else {
      // Registra falha
      await failureTrackingService.recordFailure(userId);
      const remaining = await failureTrackingService.getRemainingAttempts(userId);
      debugLog('[Capture] Failure recorded:', {
        userId,
        attemptsRemaining: remaining,
        timestamp: new Date().toISOString()
      });
    }

    // Obtém tentativas restantes
    const attemptsRemaining = await failureTrackingService.getRemainingAttempts(userId);

    // Retorna resposta de sucesso
    const response: CaptureResponse = {
      success: true,
      data: {
        recognized: recognitionResult.recognized,
        confidence: recognitionResult.confidence,
        userId: recognitionResult.userId,
        timestamp: new Date().toISOString(),
        attemptsRemaining
      }
    };

    res.status(200).json(response);
  } catch (error) {
    // Requisito 5.4: Manipular erros inesperados com logging adequado
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    errorLog('[Capture] Unexpected error:', {
      userId: userId || 'unknown',
      error: errorMessage,
      stack: errorStack,
      processingTime: Date.now() - startTime,
      timestamp: new Date().toISOString()
    });
    
    const response: CaptureResponse = {
      success: false,
      error: 'Ocorreu um erro inesperado ao processar sua solicitação. Por favor, tente novamente.',
      errorCode: 'SERVER_ERROR'
    };
    
    res.status(500).json(response);
  }
}
