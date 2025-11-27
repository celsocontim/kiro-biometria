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
}

/**
 * Handler para endpoint POST /api/register
 * Cadastra um novo usuário com dados biométricos faciais
 */
export async function handleRegister(
  req: Request,
  res: Response,
  faceApiUrl: string,
  faceApiKey: string
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

    // Verifica detecção de fraude (error_code 106)
    if (addCredentialData.error_code === 106 || addCredentialData.error_code === '106' || Number(addCredentialData.error_code) === 106) {
      debugLog('[Register] Spoof detected during registration, deleting user:', {
        userId: user_id,
        internalUserId,
        timestamp: new Date().toISOString()
      });

      // Deleta o usuário criado
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
          errorLog('[Register] Failed to delete user after spoof detection:', {
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

        debugLog('[Register] User deleted successfully after spoof detection:', {
          userId: user_id,
          internalUserId,
          timestamp: new Date().toISOString()
        });

        // Registra tentativa de fraude
        infoLog(`Spoof attempted! User_id: ${user_id}`);

        // Retorna erro de verificação de vivacidade para frontend
        const response: RegisterResponse = {
          success: false,
          timestamp: new Date().toISOString(),
          error: 'Tentativa de fraude! Certifique-se de usar um rosto real!',
          errorCode: 'LIVENESS_CHECK_ERROR'
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

    // Verifica se credencial foi adicionada com sucesso
    if (!addCredentialResponse.ok || addCredentialData.error_code !== 0) {
      errorLog('[Register] Failed to add credential:', {
        userId: user_id,
        internalUserId,
        status: addCredentialResponse.status,
        errorCode: addCredentialData.error_code,
        errorMessage: addCredentialData.error_message,
        timestamp: new Date().toISOString()
      });

      const response: RegisterResponse = {
        success: false,
        timestamp: new Date().toISOString(),
        error: 'Falha ao cadastrar dados faciais',
        errorCode: 'SERVER_ERROR'
      };
      res.status(500).json(response);
      return;
    }

    debugLog('[Register] User registration completed successfully:', {
      userId: user_id,
      internalUserId,
      timestamp: new Date().toISOString()
    });

    // Registra sucesso simples
    infoLog(`user_id: ${user_id}, registration: true`);

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
