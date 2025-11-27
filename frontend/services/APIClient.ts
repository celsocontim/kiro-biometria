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

export interface RegisterResponse {
  success: boolean;
  error?: string;
  errorCode?: string;
  attemptsRemaining?: number;
  minutesRemaining?: number;
}

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
    // Usa variável de ambiente ou URL fornecida
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

    // Lógica de retry para erros de rede
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest(imageData, userId);
        
        // Se obtivemos uma resposta (mesmo que seja de erro), retorna
        // Não faz retry para erros de nível de aplicação (validação, tentativas máximas, etc.)
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Apenas faz retry em erros de rede, não em timeout ou outros erros
        const isNetworkError = error instanceof TypeError;
        const isLastAttempt = attempt === this.maxRetries;
        
        if (isNetworkError && !isLastAttempt) {
          console.warn(`[APIClient] Network error on attempt ${attempt + 1}, retrying...`, {
            userId,
            error: lastError.message,
            timestamp: new Date().toISOString()
          });
          
          // Backoff exponencial: espera 1s, depois 2s
          await this.delay(1000 * (attempt + 1));
          continue;
        }
        
        // Não faz retry para timeouts ou na última tentativa
        break;
      }
    }

    // Todas as tentativas falharam, retorna resposta de erro
    console.error('[APIClient] All retry attempts failed:', {
      userId,
      error: lastError?.message,
      attempts: this.maxRetries + 1,
      timestamp: new Date().toISOString()
    });

    return this.handleError(lastError);
  }

  /**
   * Faz uma única requisição HTTP para o backend
   * 
   * @param imageData - Dados de imagem codificados em base64
   * @param userId - Identificador de usuário
   * @returns Promise resolvendo para CaptureResponse
   * @throws Error se requisição falhar
   */
  private async makeRequest(imageData: string, userId: string): Promise<CaptureResponse> {
    // Cria corpo da requisição
    const requestBody: CaptureRequest = {
      imageData,
      userId,
      timestamp: Date.now()
    };

    // Cria abort controller para manipulação de timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // Faz requisição HTTP POST
      const response = await fetch(`${this.backendUrl}/api/capture`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      // Limpa timeout
      clearTimeout(timeoutId);

      // Analisa resposta
      const data: CaptureResponse = await response.json();

      // Registra resposta para depuração
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
      // Limpa timeout em caso de erro
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Manipula erros e converte para CaptureResponse
   * 
   * @param error - Erro que ocorreu
   * @returns CaptureResponse com detalhes do erro
   */
  private handleError(error: Error | null): CaptureResponse {
    if (!error) {
      return {
        success: false,
        error: 'Ocorreu um erro inesperado.',
        errorCode: 'SERVER_ERROR'
      };
    }

    // Manipula timeout
    if (error.name === 'AbortError') {
      return {
        success: false,
        error: 'A requisição expirou após 30 segundos. Por favor, verifique sua conexão e tente novamente.',
        errorCode: 'SERVER_ERROR'
      };
    }

    // Manipula erros de rede
    if (error instanceof TypeError) {
      return {
        success: false,
        error: 'Não foi possível conectar ao servidor. Por favor, verifique sua conexão com a internet e tente novamente.',
        errorCode: 'SERVER_ERROR'
      };
    }

    // Manipula outros erros
    return {
      success: false,
      error: error.message || 'Ocorreu um erro inesperado. Por favor, tente novamente.',
      errorCode: 'SERVER_ERROR'
    };
  }

  /**
   * Método utilitário para atrasar execução
   * 
   * @param ms - Milissegundos para atrasar
   * @returns Promise que resolve após o atraso
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Verifica se um usuário está cadastrado no sistema
   * 
   * @param userId - Identificador de usuário para verificar
   * @returns Promise resolvendo para boolean indicando se usuário está cadastrado
   * @throws Error se requisição falhar
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
   * Cadastra um novo usuário com dados biométricos faciais
   * 
   * @param userId - Identificador de usuário
   * @param imageData - Dados de imagem codificados em base64
   * @returns Promise resolvendo para RegisterResponse
   * @throws Error se requisição falhar
   */
  async registerUser(userId: string, imageData: string): Promise<RegisterResponse> {
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

      const data = await response.json() as RegisterResponse;

      console.log('[APIClient] User registration response:', {
        userId,
        success: data.success,
        error: data.error,
        errorCode: data.errorCode,
        attemptsRemaining: data.attemptsRemaining,
        minutesRemaining: data.minutesRemaining,
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
        error: error instanceof Error ? error.message : 'Falha ao cadastrar usuário',
        errorCode: 'SERVER_ERROR'
      };
    }
  }
}

// Exporta instância singleton
export const apiClient = new APIClient();
