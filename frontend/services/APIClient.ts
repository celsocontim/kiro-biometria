/**
 * APIClient
 * 
 * Manipula comunicação com o serviço backend.
 * Fornece métodos para:
 * - Enviar solicitações de captura para backend
 * - Manipular timeouts e erros
 * - Analisar e retornar respostas de reconhecimento
 * 
 * Requisitos: 2.3, 11.1
 * Performance: Navegador manipula automaticamente pooling de conexão via HTTP/2 e keep-alive
 */

import { CaptureRequest, CaptureResponse } from '../types/api.types';

export class APIClient {
  private readonly backendUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;

  /**
   * Cria uma nova instância de APIClient
   * 
   * @param backendUrl - URL base do serviço backend
   * @param timeout - Timeout de requisição em milissegundos (padrão: 30000)
   * @param maxRetries - Número máximo de tentativas de retry para erros de rede (padrão: 2)
   * 
   * Nota: Navegadores modernos manipulam automaticamente pooling e reutilização de conexão
   * para requisições fetch() via multiplexação HTTP/2 e keep-alive HTTP/1.1.
   * Nenhuma configuração adicional necessária no lado do cliente.
   */
  constructor(backendUrl?: string, timeout: number = 30000, maxRetries: number = 2) {
    // Use environment variable or provided URL
    this.backendUrl = backendUrl || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    this.timeout = timeout;
    this.maxRetries = maxRetries;
  }

  /**
   * Envia uma solicitação de captura para o backend com lógica de retry
   * 
   * @param imageData - Dados de imagem codificados em base64
   * @param userId - Identificador de usuário
   * @returns Promise resolvendo para CaptureResponse
   * @throws Error se requisição falhar ou expirar
   * 
   * Requisito 2.3: Enviar dados de imagem para Serviço Backend
   * Requisito 11.1: Comunicar via API HTTP
   * Requisitos: 1.5, 4.4, 5.4 - Tratamento de erros para erros de rede e timeouts
   */
  async submitCapture(imageData: string, userId: string): Promise<CaptureResponse> {
    let lastError: Error | null = null;

    // Retry logic for network errors
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest(imageData, userId);
        
        // If we got a response (even an error response), return it
        // Don't retry for application-level errors (validation, max attempts, etc.)
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Only retry on network errors, not on timeout or other errors
        const isNetworkError = error instanceof TypeError;
        const isLastAttempt = attempt === this.maxRetries;
        
        if (isNetworkError && !isLastAttempt) {
          console.warn(`[APIClient] Network error on attempt ${attempt + 1}, retrying...`, {
            userId,
            error: lastError.message,
            timestamp: new Date().toISOString()
          });
          
          // Exponential backoff: wait 1s, then 2s
          await this.delay(1000 * (attempt + 1));
          continue;
        }
        
        // Don't retry for timeouts or on last attempt
        break;
      }
    }

    // All retries failed, return error response
    console.error('[APIClient] All retry attempts failed:', {
      userId,
      error: lastError?.message,
      attempts: this.maxRetries + 1,
      timestamp: new Date().toISOString()
    });

    return this.handleError(lastError);
  }

  /**
   * Make a single HTTP request to the backend
   * 
   * @param imageData - Base64 encoded image data
   * @param userId - User identifier
   * @returns Promise resolving to CaptureResponse
   * @throws Error if request fails
   */
  private async makeRequest(imageData: string, userId: string): Promise<CaptureResponse> {
    // Create request body
    const requestBody: CaptureRequest = {
      imageData,
      userId,
      timestamp: Date.now()
    };

    // Create abort controller for timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // Make HTTP POST request
      const response = await fetch(`${this.backendUrl}/api/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      // Clear timeout
      clearTimeout(timeoutId);

      // Parse response
      const data: CaptureResponse = await response.json();

      // Log response for debugging
      console.log('[APIClient] Response received:', {
        userId,
        status: response.status,
        success: data.success,
        errorCode: data.errorCode,
        error: data.error,
        fullResponse: data,
        timestamp: new Date().toISOString()
      });

      return data;
    } catch (error) {
      // Clear timeout on error
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Handle errors and convert to CaptureResponse
   * 
   * @param error - Error that occurred
   * @returns CaptureResponse with error details
   */
  private handleError(error: Error | null): CaptureResponse {
    if (!error) {
      return {
        success: false,
        error: 'Ocorreu um erro inesperado.',
        errorCode: 'SERVER_ERROR'
      };
    }

    // Handle timeout
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'A requisição expirou após 30 segundos. Por favor, verifique sua conexão e tente novamente.',
        errorCode: 'SERVER_ERROR'
      };
    }

    // Handle network errors
    if (error instanceof TypeError) {
      return {
        success: false,
        error: 'Não foi possível conectar ao servidor. Por favor, verifique sua conexão com a internet e tente novamente.',
        errorCode: 'SERVER_ERROR'
      };
    }

    // Handle other errors
    return {
      success: false,
      error: error.message || 'Ocorreu um erro inesperado. Por favor, tente novamente.',
      errorCode: 'SERVER_ERROR'
    };
  }

  /**
   * Utility method to delay execution
   * 
   * @param ms - Milliseconds to delay
   * @returns Promise that resolves after delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Check if a user is registered in the system
   * 
   * @param userId - User identifier to check
   * @returns Promise resolving to boolean indicating if user is registered
   * @throws Error if request fails
   */
  async checkUserRegistration(userId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.backendUrl}/api/user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!response.ok) {
        console.error('[APIClient] Failed to check user registration:', {
          userId,
          status: response.status,
          timestamp: new Date().toISOString()
        });
        return false;
      }

      const data = await response.json() as { registered: boolean };
      
      console.log('[APIClient] User registration check:', {
        userId,
        registered: data.registered,
        timestamp: new Date().toISOString()
      });

      return data.registered;
    } catch (error) {
      console.error('[APIClient] Error checking user registration:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  /**
   * Register a new user with facial biometric data
   * 
   * @param userId - User identifier
   * @param imageData - Base64 encoded image data
   * @returns Promise resolving to boolean indicating if registration was successful
   * @throws Error if request fails
   */
  async registerUser(userId: string, imageData: string): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch(`${this.backendUrl}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          user_id: userId,
          imageData 
        }),
      });

      const data = await response.json() as { success: boolean; error?: string };

      console.log('[APIClient] User registration response:', {
        userId,
        success: data.success,
        error: data.error,
        timestamp: new Date().toISOString()
      });

      return data;
    } catch (error) {
      console.error('[APIClient] Error registering user:', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Falha ao cadastrar usuário'
      };
    }
  }
}

// Export singleton instance
export const apiClient = new APIClient();
