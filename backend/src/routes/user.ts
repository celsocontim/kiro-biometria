import { Request, Response } from 'express';
import { debugLog, infoLog, errorLog } from '../utils/logger';

/**
 * Solicitação de verificação de cadastro de usuário
 */
interface UserCheckRequest {
  user_id: string;
}

/**
 * Resposta de verificação de cadastro de usuário
 */
interface UserCheckResponse {
  registered: boolean;
  timestamp: string;
  error?: string;
  errorCode?: string;
}

/**
 * Handler para endpoint GET /api/user
 * Verifica se um usuário está cadastrado na API de reconhecimento facial
 */
export async function handleUserCheck(
  req: Request,
  res: Response,
  faceApiUrl: string,
  faceApiKey: string
): Promise<void> {
  try {
    const { user_id } = req.body as UserCheckRequest;

    // Validate user_id
    if (!user_id || typeof user_id !== 'string') {
      const response: UserCheckResponse = {
        registered: false,
        timestamp: new Date().toISOString(),
        error: 'ID de usuário inválido ou ausente',
        errorCode: 'INVALID_REQUEST'
      };
      res.status(400).json(response);
      return;
    }

    // Check if Face API credentials are configured
    if (!faceApiUrl || !faceApiKey) {
      const response: UserCheckResponse = {
        registered: false,
        timestamp: new Date().toISOString(),
        error: 'API de reconhecimento facial não configurada',
        errorCode: 'SERVER_ERROR'
      };
      res.status(500).json(response);
      return;
    }

    // Chama API de reconhecimento facial para verificar cadastro de usuário
    const apiUrl = `${faceApiUrl}/api/v1/users?include=credentials&external_id=${encodeURIComponent(user_id)}&limit=1`;

    // Log simples para modo não-debug
    infoLog(`Checking user_id: ${user_id} registration status`);
    
    debugLog('[UserCheck] Checking user registration:', {
      userId: user_id,
      apiUrl,
      timestamp: new Date().toISOString()
    });

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-API-Key': faceApiKey
      }
    });

    // Verifica se resposta está OK
    if (!response.ok) {
      errorLog('[UserCheck] Face API returned non-200 status:', {
        userId: user_id,
        status: response.status,
        statusText: response.statusText,
        timestamp: new Date().toISOString()
      });

      const errorResponse: UserCheckResponse = {
        registered: false,
        timestamp: new Date().toISOString(),
        error: 'Falha ao verificar cadastro do usuário',
        errorCode: 'SERVER_ERROR'
      };
      res.status(500).json(errorResponse);
      return;
    }

    // Analisa resposta
    const data = await response.json() as any;

    debugLog('[UserCheck] Face API response:', {
      userId: user_id,
      errorCode: data.error_code,
      usersCount: data.users?.length || 0,
      timestamp: new Date().toISOString()
    });

    // Verifica se usuário está cadastrado (array de usuários não está vazio)
    const isRegistered = Array.isArray(data.users) && data.users.length > 0;

    const successResponse: UserCheckResponse = {
      registered: isRegistered,
      timestamp: new Date().toISOString()
    };

    res.status(200).json(successResponse);
  } catch (error) {
    errorLog('[UserCheck] Unexpected error:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });

    const errorResponse: UserCheckResponse = {
      registered: false,
      timestamp: new Date().toISOString(),
      error: 'Ocorreu um erro inesperado',
      errorCode: 'SERVER_ERROR'
    };

    res.status(500).json(errorResponse);
  }
}
