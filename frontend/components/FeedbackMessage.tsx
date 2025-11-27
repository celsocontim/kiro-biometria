/**
 * Componente FeedbackMessage
 * 
 * Exibe mensagens de feedback aos usuários durante e após o processo de captura.
 * Suporta tipos de mensagem de sucesso e erro com estilo apropriado.
 * Dispensa automaticamente mensagens de sucesso após 3 segundos.
 * Permite dispensa manual de mensagens de erro.
 * Mostra indicador de carregamento durante a captura.
 * Exibe tentativas restantes quando disponível.
 * 
 * Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5
 */

'use client';

import React, { useEffect } from 'react';

export type FeedbackType = 'success' | 'error' | 'loading';

export interface FeedbackMessageProps {
  /** Tipo de mensagem de feedback */
  type: FeedbackType;
  
  /** Texto da mensagem a exibir */
  message: string;
  
  /** Número de tentativas restantes (opcional) */
  attemptsRemaining?: number;
  
  /** Callback quando a mensagem é dispensada */
  onDismiss?: () => void;
  
  /** Se deve mostrar a mensagem */
  visible: boolean;
}

export default function FeedbackMessage({
  type,
  message,
  attemptsRemaining,
  onDismiss,
  visible
}: FeedbackMessageProps) {
  // Dispensa automaticamente mensagens após 10 segundos (sucesso após 3 segundos)
  useEffect(() => {
    if (visible && onDismiss) {
      const timeout = type === 'success' ? 3000 : 10000;
      const timer = setTimeout(() => {
        onDismiss();
      }, timeout);
      
      return () => clearTimeout(timer);
    }
  }, [visible, type, onDismiss]);

  if (!visible) {
    return null;
  }

  // Requisito 6.1: Exibir indicador de carregamento durante captura
  // Requisito 3.1, 3.2, 3.3: Layout responsivo com restrições de largura máxima
  if (type === 'loading') {
    return (
      <div
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center p-4 bg-blue-500 text-white shadow-lg"
        data-testid="feedback-loading"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center space-x-3 w-full md:max-w-[600px] px-4">
          <div 
            className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin"
            data-testid="loading-spinner"
          />
          <span className="text-base md:text-lg font-medium">{message}</span>
        </div>
      </div>
    );
  }

  // Requisito 6.2: Exibir mensagem de sucesso
  if (type === 'success') {
    return (
      <div
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center p-4 bg-green-500 text-white shadow-lg animate-slide-down"
        data-testid="feedback-success"
        role="alert"
        aria-live="polite"
      >
        <div className="flex items-center space-x-3 w-full md:max-w-[600px] px-4">
          <svg
            className="w-6 h-6 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            data-testid="success-icon"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="text-base md:text-lg font-medium flex-grow">{message}</span>
        </div>
      </div>
    );
  }

  // Requisito 6.3: Exibir mensagem de erro com detalhes
  // Requisito 6.5: Permitir dispensa manual de mensagens de erro
  if (type === 'error') {
    return (
      <div
        className="fixed top-0 left-0 right-0 z-40 flex items-center justify-center p-4 bg-red-500 text-white shadow-lg animate-slide-down"
        data-testid="feedback-error"
        role="alert"
        aria-live="assertive"
      >
        <div className="flex items-center space-x-3 w-full md:max-w-[600px] px-4">
          <svg
            className="w-6 h-6 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            data-testid="error-icon"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="flex-grow">
            <p className="text-base md:text-lg font-medium">{message}</p>
            {attemptsRemaining !== undefined && attemptsRemaining >= 0 && attemptsRemaining !== 99 && (
              <p 
                className="text-sm mt-1 opacity-90"
                data-testid="attempts-remaining"
              >
                Tentativas restantes: {attemptsRemaining}
              </p>
            )}
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="flex-shrink-0 p-1 hover:bg-red-600 rounded transition-colors min-w-[44px] min-h-[44px]"
              aria-label="Dismiss message"
              data-testid="dismiss-button"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}
