/**
 * IframeMessenger
 * 
 * Manipula comunicação com janela pai quando aplicação está incorporada como iframe.
 * Fornece métodos para:
 * - Detectar se aplicação está incorporada em um iframe
 * - Enviar mensagens de status de conclusão para janela pai
 * - Manipular casos onde janela pai não existe
 * 
 * Requisitos: 10.1, 10.2, 10.3, 10.4, 10.5
 */

export class IframeMessenger {
  /**
   * Verifica se aplicação está incorporada em um iframe
   * 
   * @returns true se incorporada em iframe, false caso contrário
   * 
   * Requisito 10.4: Detectar contexto de janela pai
   * Requisito 10.5: Manipular cenário não incorporado graciosamente
   */
  isEmbedded(): boolean {
    try {
      // Verifica se window.parent existe e é diferente da janela atual
      return window.parent !== window;
    } catch (error) {
      // Em caso de restrições de cross-origin, assume não incorporado
      console.warn('[IframeMessenger] Unable to determine iframe status:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      return false;
    }
  }

  /**
   * Envia status de conclusão para janela pai
   * 
   * @param success - true para reconhecimento bem-sucedido, false para tentativas máximas excedidas
   * 
   * Requisito 10.1: Enviar mensagem "True" em reconhecimento bem-sucedido
   * Requisito 10.2: Enviar mensagem "False" quando tentativas máximas excedidas
   * Requisito 10.5: Manipular cenário não incorporado graciosamente
   */
  sendCompletionStatus(success: boolean): void {
    // Apenas envia mensagem se incorporado em iframe
    if (!this.isEmbedded()) {
      console.log('[IframeMessenger] Not embedded in iframe, skipping postMessage');
      return;
    }

    try {
      // Envia mensagem para janela pai
      const message = success ? 'True' : 'False';
      this.postMessageToParent(message);
    } catch (error) {
      // Manipula casos onde janela pai não existe ou está inacessível
      console.error('[IframeMessenger] Failed to send message to parent window:', {
        success,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      // Não lança exceção - isso não é crítico para a experiência do usuário
    }
  }

  /**
   * Envia mensagem para janela pai usando API postMessage
   * 
   * @param message - String de mensagem para enviar
   * 
   * Requisito 10.3: Usar API postMessage para comunicação com pai
   */
  postMessageToParent(message: string): void {
    try {
      // Usa '*' como origem alvo para máxima compatibilidade
      // Em produção, isso deveria ser restrito a origem específica
      // ex: 'http://personal-zx6yray0.outsystemscloud.com'
      window.parent.postMessage(message, '*');
      console.log(`[IframeMessenger] Message sent to parent: ${message}`);
    } catch (error) {
      console.error('[IframeMessenger] Failed to post message to parent:', {
        message,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }
}

// Exporta instância singleton
export const iframeMessenger = new IframeMessenger();
