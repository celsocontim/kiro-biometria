import { Request, Response } from 'express';
import { debugLog, infoLog, errorLog } from '../utils/logger';

/**
 * Solicitação de cadastro de usuário
 */
interface RegisterRequest {
  user_id: string;
  imageData: string;
}

/**
 * Resposta de cadastro de usuário
 */
interface RegisterResponse {
  success: boolean;
  timestamp: string;
  error?: string;
  errorCode?: string;
  attemptsRemaining?: number;
  minutesRemaining?: number;
}

/**
 * Handler para endpoint POST /api/register
 * Cadastra um novo usuário com dados biométricos faciais
 */
export async function handleRegister(
  req: Request,
  res: Response,
  faceApiUrl: string,
  faceApiKey: string,
  failureTrackingService: any,
  configService: any
): Promise<void> {
  try {
    const { user_id, imageData } = req.body as RegisterRequest;

    // Valida user_id
    if (!user_id || typeof user_id !== 'string') {
      const response: RegisterResponse = {
        success: false,
        timestamp: new Date().toISOString(),
        error: 'ID de usuário inválido ou ausente',
        errorCode: 'INVALID_REQUEST'
      };
      res.status(400).json(response);
      return;
    }

    // Valida imageData
    if (!imageData || typeof imageData !== 'string' || !imageData.startsWith('data:image/')) {
      const response: RegisterResponse = {
        success: false,
        timestamp: new Date().toISOString(),
        error: 'Dados de imagem inválidos ou ausentes',
        errorCode: 'INVALID_REQUEST'
      };
      res.status(400).json(response);
      return;
    }

    // Verifica se credenciais da API de reconhecimento facial estão configuradas
    if (!faceApiUrl || !faceApiKey) {
      const response: RegisterResponse = {
        success: false,
        timestamp: new Date().toISOString(),
        error: 'API de reconhecimento facial não configurada',
        errorCode: 'SERVER_ERROR'
      };
      res.status(500).json(response);
      return;
    }

    debugLog('[Register] Starting user registration:', {
      userId: user_id,
      timestamp: new Date().toISOString()
    });

    // Passo 1: Criar usuário na API de reconhecimento facial
    const createUserUrl = `${faceApiUrl}/api/v1/users`;
    const createUserResponse = await fetch(createUserUrl, {
      method: 'POST',
      headers: {
        'X-API-Key': faceApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        external_id: user_id
      })
    });

    const createUserData = await createUserResponse.json() as any;

    debugLog('[Register] Create user response:', {
      userId: user_id,
      status: createUserResponse.status,
      errorCode: createUserData.error_code,
      timestamp: new Date().toISOString()
    });

    // Verifica se criação de usuário foi bem-sucedida
    if (!createUserResponse.ok || createUserData.error_code !== 0) {
      errorLog('[Register] Failed to create user:', {
        userId: user_id,
        status: createUserResponse.status,
        errorCode: createUserData.error_code,
        errorMessage: createUserData.error_message,
        timestamp: new Date().toISOString()
      });

      const response: RegisterResponse = {
        success: false,
        timestamp: new Date().toISOString(),
        error: 'Falha ao cadastrar usuário',
        errorCode: 'SERVER_ERROR'
      };
      res.status(500).json(response);
      return;
    }

    // Extrai ID do usuário da resposta
    const internalUserId = createUserData.user?.id;
    if (!internalUserId) {
      errorLog('[Register] No user ID in create response:', {
        userId: user_id,
        timestamp: new Date().toISOString()
      });

      const response: RegisterResponse = {
        success: false,
        timestamp: new Date().toISOString(),
        error: 'Falha ao obter ID do usuário do cadastro',
        errorCode: 'SERVER_ERROR'
      };
      res.status(500).json(response);
      return;
    }

    debugLog('[Register] User created successfully:', {
      userId: user_id,
      internalUserId,
      timestamp: new Date().toISOString()
    });

    // Passo 2: Adicionar credencial (template facial) ao usuário
    // Extrai dados base64 (remove prefixo URI de dados)
    const base64Data = imageData.split(',')[1];
    if (!base64Data) {
      const response: RegisterResponse = {
        success: false,
        timestamp: new Date().toISOString(),
        error: 'Dados de imagem base64 inválidos',
        errorCode: 'INVALID_REQUEST'
      };
      res.status(400).json(response);
      return;
    }

    const addCredentialUrl = `${faceApiUrl}/api/v1/credentials`;
    const addCredentialResponse = await fetch(addCredentialUrl, {
      method: 'POST',
      headers: {
        'X-API-Key': faceApiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: internalUserId,
        get_quality: [],
        suppress_liveness: false,
        biometric_data: {
          modality: 'face',
          datatype: 'jpg',
          data: base64Data
        }
      })
    });

    const addCredentialData = await addCredentialResponse.json() as any;

    debugLog('[Register] Add credential response:', {
      userId: user_id,
      internalUserId,
      status: addCredentialResponse.status,
      errorCode: addCredentialData.error_code,
      timestamp: new Date().toISOString()
    });

    // Verifica se houve erro ao adicionar credencial
    if (!addCredentialResponse.ok || addCredentialData.error_code !== 0) {
      const credentialErrorCode = addCredentialData.error_code;
      const credentialErrorMessage = addCredentialData.error_message;
      const isSpoof = credentialErrorCode === 106 || credentialErrorCode === '106' || Number(credentialErrorCode) === 106;
      
      errorLog('[Register] Credential error during registration, deleting user:', {
        userId: user_id,
        internalUserId,
        errorCode: credentialErrorCode,
        errorCodeType: typeof credentialErrorCode,
        errorMessage: credentialErrorMessage,
        isSpoof,
        timestamp: new Date().toISOString()
      });

      // Deleta o usuário criado (para qualquer erro de credencial)
      const deleteUserUrl = `${faceApiUrl}/api/v1/users/${internalUserId}`;
      try {
        const deleteResponse = await fetch(deleteUserUrl, {
          method: 'DELETE',
          headers: {
            'X-API-Key': faceApiKey
          }
        });

        const deleteData = await deleteResponse.json() as any;

        debugLog('[Register] Delete user response:', {
          userId: user_id,
          internalUserId,
          status: deleteResponse.status,
          errorCode: deleteData.error_code,
          deleteCount: deleteData.delete_count,
          timestamp: new Date().toISOString()
        });

        // Verifica se deleção foi bem-sucedida
        if (!deleteResponse.ok || deleteData.error_code !== 0) {
          errorLog('[Register] Failed to delete user after credential error:', {
            userId: user_id,
            internalUserId,
            status: deleteResponse.status,
            errorCode: deleteData.error_code,
            errorMessage: deleteData.error_message,
            timestamp: new Date().toISOString()
          });

          const response: RegisterResponse = {
            success: false,
            timestamp: new Date().toISOString(),
            error: 'Erro interno durante a limpeza do cadastro',
            errorCode: 'SERVER_ERROR'
          };
          res.status(500).json(response);
          return;
        }

        debugLog('[Register] User deleted successfully after credential error:', {
          userId: user_id,
          internalUserId,
          timestamp: new Date().toISOString()
        });

        // Mapeia código de erro para tipo e mensagem específicos
        let errorType: string;
        let errorMessage: string;
        
        if (isSpoof) {
          // Erro 106: Liveness/Spoof
          infoLog(`Spoof attempted! User_id: ${user_id}`);
          errorType = 'LIVENESS_CHECK_ERROR';
          errorMessage = 'Tentativa de fraude! Certifique-se de usar um rosto real!';
        } else if (credentialErrorCode === 109 || credentialErrorCode === '109' || Number(credentialErrorCode) === 109) {
          // Erro 109: Face fora dos limites
          errorLog('[Register] Mapping to FACE_BOUNDARY_ERROR');
          errorType = 'FACE_BOUNDARY_ERROR';
          errorMessage = 'Face não está posicionada adequadamente.';
        } else if (credentialErrorCode === 108 || credentialErrorCode === '108' || Number(credentialErrorCode) === 108) {
          // Erro 108: Múltiplas faces
          errorLog('[Register] Mapping to MULTIPLE_FACE_ERROR');
          errorType = 'MULTIPLE_FACE_ERROR';
          errorMessage = 'Diversas faces encontradas. Garanta apenas uma face na imagem.';
        } else if (credentialErrorCode === 107 || credentialErrorCode === '107' || Number(credentialErrorCode) === 107) {
          // Erro 107: Face não detectada
          errorLog('[Register] Mapping to FACE_NOT_FOUND');
          errorType = 'FACE_NOT_FOUND';
          errorMessage = 'Não foi encontrada face na imagem.';
        } else {
          // Outros erros
          errorLog('[Register] Mapping to SERVER_ERROR for code:', credentialErrorCode);
          errorType = 'SERVER_ERROR';
          errorMessage = 'Falha ao cadastrar dados faciais. Por favor, tente novamente.';
        }
        
        errorLog('[Register] Final error mapping:', {
          errorType,
          errorMessage,
          credentialErrorCode
        });

        // Registra falha no rastreamento
        await failureTrackingService.recordFailure(user_id);
        const attemptsRemaining = await failureTrackingService.getRemainingAttempts(user_id);
        
        // Verifica se usuário ficou bloqueado após esta tentativa
        const isNowLocked = await failureTrackingService.isUserLocked(user_id);
        const minutesRemaining = isNowLocked ? await failureTrackingService.getMinutesUntilExpiry(user_id) : undefined;

        // Retorna erro apropriado para frontend
        const response: RegisterResponse = {
          success: false,
          timestamp: new Date().toISOString(),
          error: errorMessage,
          errorCode: errorType,
          attemptsRemaining,
          minutesRemaining
        };
        res.status(200).json(response);
        return;
      } catch (deleteError) {
        errorLog('[Register] Exception during user deletion:', {
          userId: user_id,
          internalUserId,
          error: deleteError instanceof Error ? deleteError.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });

        const response: RegisterResponse = {
          success: false,
          timestamp: new Date().toISOString(),
          error: 'Erro interno durante a limpeza do cadastro',
          errorCode: 'SERVER_ERROR'
        };
        res.status(500).json(response);
        return;
      }
    }

    debugLog('[Register] User registration completed successfully:', {
      userId: user_id,
      internalUserId,
      timestamp: new Date().toISOString()
    });

    // Registra sucesso simples
    infoLog(`user_id: ${user_id}, registration: true`);

    // Reseta falhas em caso de sucesso
    const config = await configService.getConfiguration();
    if (config.failureResetOnSuccess) {
      await failureTrackingService.resetFailures(user_id);
      debugLog('[Register] Failure count reset for user:', { userId: user_id });
    }

    // Retorna resposta de sucesso
    const response: RegisterResponse = {
      success: true,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(response);
  } catch (error) {
    errorLog('[Register] Unexpected error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });

    const errorResponse: RegisterResponse = {
      success: false,
      timestamp: new Date().toISOString(),
      error: 'Ocorreu um erro inesperado durante o cadastro',
      errorCode: 'SERVER_ERROR'
    };

    res.status(500).json(errorResponse);
  }
}
