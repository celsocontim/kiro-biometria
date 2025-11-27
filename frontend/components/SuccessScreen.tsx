/**
 * Componente SuccessScreen
 * 
 * Exibe UI de confirmação de sucesso após reconhecimento facial bem-sucedido.
 * Oculta feed da câmera e controles, previne tentativas adicionais de captura.
 * 
 * Requisitos: 9.1, 9.2, 9.3, 9.4, 9.5
 */

'use client';

import React from 'react';

interface SuccessScreenProps {
  userName: string;
  onComplete?: () => void;
  isRegistration?: boolean;  // true if this is a registration success, false for identification
}

export default function SuccessScreen({
  userName,
  onComplete,
  isRegistration = false
}: SuccessScreenProps) {
  // Requisito 9.1: Exibir tela de sucesso em reconhecimento bem-sucedido
  // Requisito 9.2: Mostrar mensagem de confirmação
  // Requisito 9.3: Ocultar feed da câmera e controles
  // Requisito 9.4: Fornecer feedback visual indicando conclusão
  // Requisito 9.5: Prevenir tentativas adicionais de captura

  React.useEffect(() => {
    // Chama callback onComplete se fornecido
    if (onComplete) {
      onComplete();
    }
  }, [onComplete]);

  return (
    <div 
      className="fixed inset-0 bg-white flex items-center justify-center z-50 p-4"
      data-testid="success-screen"
      role="alert"
      aria-live="polite"
    >
      <div className="text-center px-6 py-8 max-w-md w-full">
        {/* Success Icon - Visual Feedback */}
        <div 
          className="mb-6 flex justify-center"
          data-testid="success-icon-container"
        >
          <div 
            className="w-24 h-24 md:w-32 md:h-32 lg:w-36 lg:h-36 rounded-full flex items-center justify-center animate-scale-in shadow-lg"
            style={{ backgroundColor: '#00995D' }}
          >
            <svg
              className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              data-testid="success-icon"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        </div>

        {/* Success Message - Confirmation */}
        <h1 
          className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4"
          style={{ color: '#003D25' }}
          data-testid="success-title"
        >
          {isRegistration ? 'Cadastro Realizado!' : 'Reconhecimento Bem-Sucedido!'}
        </h1>

        <p 
          className="text-base md:text-lg lg:text-xl mb-2"
          style={{ color: '#005C38' }}
          data-testid="success-message"
        >
          {isRegistration 
            ? 'Seu rosto foi cadastrado com sucesso.' 
            : 'Seu rosto foi reconhecido com sucesso.'}
        </p>

        <p 
          className="text-sm md:text-base text-gray-600 break-all"
          data-testid="success-user-name"
        >
          {userName}
        </p>

        {/* Additional visual feedback */}
        <div 
          className="mt-8 flex justify-center"
          data-testid="success-checkmark-animation"
        >
          <div 
            className="w-16 h-1 rounded-full animate-pulse"
            style={{ backgroundColor: '#00995D' }}
          />
        </div>
      </div>
    </div>
  );
}
