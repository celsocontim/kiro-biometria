/**
 * Componente FailureScreen
 * 
 * Exibe tela de falha após tentativa de reconhecimento não bem-sucedida.
 * Mostra imagem capturada, mensagem de erro, tentativas restantes e botão de retry.
 * 
 * Requisitos: 6.3, 8.2
 */

'use client';

import React from 'react';

interface FailureScreenProps {
  userName: string;
  errorMessage: string;
  attemptsRemaining: number;
  capturedImage?: string;
  minutesRemaining?: number;
  onRetry: () => void;
}

export default function FailureScreen({
  userName,
  errorMessage,
  attemptsRemaining,
  capturedImage,
  minutesRemaining,
  onRetry
}: FailureScreenProps) {
  const isLocked = attemptsRemaining === 0;
  const isUnlimited = attemptsRemaining === 99;
  
  // Detecta se é erro de fraude (liveness check) - apenas este é destacado
  const isFraudError = errorMessage.toLowerCase().includes('fraude') || 
                       errorMessage.toLowerCase().includes('spoof') ||
                       errorMessage.toLowerCase().includes('liveness');

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-red-50 to-red-100 z-50 overflow-y-auto"
      data-testid="failure-screen"
      role="alert"
      aria-live="assertive"
    >
      {/* User Name Display - Top Left */}
      <div className="absolute top-4 left-4 z-20 max-w-[50vw]">
        <p 
          className="font-bold break-words"
          style={{
            color: '#003D25',
            fontSize: 'clamp(1rem, 4vw, 2rem)'
          }}
          data-testid="failure-user-name"
        >
          {userName}
        </p>
      </div>

      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-6xl mx-auto py-4 md:py-8">
          {/* Ícone de Erro e Título */}
          <div className="text-center mb-6">
          <div 
            className="mb-4 flex justify-center"
            data-testid="failure-icon-container"
          >
            <div className="w-20 h-20 md:w-24 md:h-24 bg-red-500 rounded-full flex items-center justify-center animate-scale-in shadow-lg">
              <svg
                className="w-12 h-12 md:w-16 md:h-16 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                data-testid="failure-icon"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>

          <h1 
            className="text-2xl md:text-3xl font-bold text-red-800"
            data-testid="failure-title"
          >
            {isLocked ? 'Tentativas Esgotadas' : 'Reconhecimento Falhou'}
          </h1>
        </div>

        {/* Layout Responsivo: Coluna em mobile, Grid em desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 mb-6 lg:items-start">
          {/* Coluna Esquerda: Imagem */}
          {capturedImage && (
            <div className="bg-white rounded-lg shadow-md p-4">
              <p className="text-sm text-gray-600 mb-2 text-center font-semibold">Imagem Capturada</p>
              <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-gray-100">
                <img 
                  src={capturedImage} 
                  alt="Imagem capturada"
                  className="w-full h-full object-cover"
                  data-testid="captured-image"
                />
              </div>
            </div>
          )}

          {/* Coluna Direita: Informações */}
          <div className="flex flex-col space-y-4 lg:h-full">
            {/* Mensagem de Erro - Flex grow para ocupar espaço disponível */}
            <div className="bg-white rounded-lg shadow-md p-4 lg:flex-grow lg:flex lg:flex-col">
              <p className="text-sm text-gray-600 mb-2 font-semibold">Mensagem</p>
              <p 
                className={`text-red-700 lg:flex-grow lg:flex lg:items-center ${
                  isFraudError ? 'text-xl md:text-2xl font-bold' : 'text-base'
                }`}
                data-testid="failure-message"
              >
                {errorMessage}
              </p>
            </div>

            {/* Informação de Tentativas */}
            <div className="bg-white rounded-lg shadow-md p-4 lg:flex-shrink-0">
              {isLocked ? (
                <div>
                  <p className="text-lg font-semibold text-red-700 mb-2">
                    Você esgotou todas as tentativas
                  </p>
                  {minutesRemaining !== undefined && minutesRemaining > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-2">
                      <div className="flex items-center justify-center gap-2">
                        <svg
                          className="w-5 h-5 text-orange-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <p className="text-sm font-semibold text-orange-700">
                          Tente novamente em {minutesRemaining} {minutesRemaining === 1 ? 'minuto' : 'minutos'}
                        </p>
                      </div>
                    </div>
                  )}
                  <p className="text-sm text-gray-600">
                    {minutesRemaining && minutesRemaining > 0 
                      ? 'Aguarde o tempo indicado antes de tentar novamente.' 
                      : 'Por favor, tente novamente mais tarde ou entre em contato com o suporte.'}
                  </p>
                </div>
              ) : isUnlimited ? (
                <div>
                  <p className="text-lg font-semibold text-gray-700 mb-2">
                    Tentativas ilimitadas disponíveis
                  </p>
                  <p className="text-sm text-gray-600">
                    Você pode tentar novamente quantas vezes precisar.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-2 font-semibold">Tentativas Restantes</p>
                  <div className="flex items-center gap-3 mb-2">
                    <div 
                      className="text-5xl font-bold text-orange-600"
                      data-testid="attempts-remaining-count"
                    >
                      {attemptsRemaining}
                    </div>
                    <svg
                      className="w-10 h-10 text-orange-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600">
                    Posicione seu rosto corretamente e tente novamente.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

          {/* Botão Tentar Novamente - Full Width */}
          <div className="max-w-md mx-auto">
            <button
              onClick={onRetry}
              disabled={isLocked}
              className={`
                w-full py-4 px-6 rounded-lg font-semibold text-lg
                transition-all duration-200 shadow-lg
                ${isLocked 
                  ? 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-50' 
                  : 'text-white active:scale-95 cursor-pointer'
                }
              `}
              style={{
                backgroundColor: isLocked ? undefined : '#00995D'
              }}
              onMouseEnter={(e) => {
                if (!isLocked) {
                  e.currentTarget.style.backgroundColor = '#005C38';
                }
              }}
              onMouseLeave={(e) => {
                if (!isLocked) {
                  e.currentTarget.style.backgroundColor = '#00995D';
                }
              }}
              data-testid="retry-button"
              aria-label={isLocked ? 'Tentativas esgotadas' : 'Tentar novamente'}
            >
              {isLocked ? 'Tentativas Esgotadas' : 'Tentar Novamente'}
            </button>

            {/* Dica adicional para usuários não bloqueados */}
            {!isLocked && (
              <div className="mt-3 text-center">
                <p className="text-sm text-gray-600">
                  💡 Dica: Certifique-se de estar em um ambiente bem iluminado
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
