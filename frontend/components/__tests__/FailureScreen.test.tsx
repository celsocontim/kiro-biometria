import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import FailureScreen from '../FailureScreen';

describe('FailureScreen', () => {
  const mockOnRetry = jest.fn();
  const defaultProps = {
    userId: 'test-user-123',
    errorMessage: 'Rosto não reconhecido',
    attemptsRemaining: 3,
    onRetry: mockOnRetry
  };

  beforeEach(() => {
    mockOnRetry.mockClear();
  });

  it('deve renderizar corretamente com tentativas restantes', () => {
    render(<FailureScreen {...defaultProps} />);
    
    expect(screen.getByTestId('failure-screen')).toBeInTheDocument();
    expect(screen.getByTestId('failure-title')).toHaveTextContent('Reconhecimento Falhou');
    expect(screen.getByTestId('failure-message')).toHaveTextContent('Rosto não reconhecido');
    expect(screen.getByTestId('attempts-remaining-count')).toHaveTextContent('3');
    expect(screen.getByTestId('failure-user-id')).toHaveTextContent('test-user-123');
  });

  it('deve renderizar botão habilitado quando há tentativas restantes', () => {
    render(<FailureScreen {...defaultProps} />);
    
    const retryButton = screen.getByTestId('retry-button');
    expect(retryButton).toBeEnabled();
    expect(retryButton).toHaveTextContent('Tentar Novamente');
  });

  it('deve chamar onRetry quando botão é clicado', () => {
    render(<FailureScreen {...defaultProps} />);
    
    const retryButton = screen.getByTestId('retry-button');
    fireEvent.click(retryButton);
    
    expect(mockOnRetry).toHaveBeenCalledTimes(1);
  });

  it('deve renderizar estado bloqueado quando attemptsRemaining é 0', () => {
    render(<FailureScreen {...defaultProps} attemptsRemaining={0} />);
    
    expect(screen.getByTestId('failure-title')).toHaveTextContent('Tentativas Esgotadas');
    expect(screen.getByText(/esgotou todas as tentativas/i)).toBeInTheDocument();
    expect(screen.getByText(/tente novamente mais tarde/i)).toBeInTheDocument();
    
    const retryButton = screen.getByTestId('retry-button');
    expect(retryButton).toBeDisabled();
    expect(retryButton).toHaveTextContent('Tentativas Esgotadas');
  });

  it('não deve chamar onRetry quando botão está desabilitado', () => {
    render(<FailureScreen {...defaultProps} attemptsRemaining={0} />);
    
    const retryButton = screen.getByTestId('retry-button');
    fireEvent.click(retryButton);
    
    expect(mockOnRetry).not.toHaveBeenCalled();
  });

  it('deve renderizar mensagem de tentativas ilimitadas quando attemptsRemaining é 99', () => {
    render(<FailureScreen {...defaultProps} attemptsRemaining={99} />);
    
    expect(screen.getByText(/tentativas ilimitadas disponíveis/i)).toBeInTheDocument();
    expect(screen.getByText(/pode tentar novamente quantas vezes precisar/i)).toBeInTheDocument();
    
    const retryButton = screen.getByTestId('retry-button');
    expect(retryButton).toBeEnabled();
  });

  it('deve renderizar imagem capturada quando fornecida', () => {
    const capturedImage = 'data:image/jpeg;base64,/9j/4AAQSkZJRg...';
    render(<FailureScreen {...defaultProps} capturedImage={capturedImage} />);
    
    const image = screen.getByTestId('captured-image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', capturedImage);
    expect(image).toHaveAttribute('alt', 'Imagem capturada');
  });

  it('não deve renderizar imagem quando não fornecida', () => {
    render(<FailureScreen {...defaultProps} />);
    
    expect(screen.queryByTestId('captured-image')).not.toBeInTheDocument();
  });

  it('deve ter atributos de acessibilidade corretos', () => {
    render(<FailureScreen {...defaultProps} />);
    
    const screen_element = screen.getByTestId('failure-screen');
    expect(screen_element).toHaveAttribute('role', 'alert');
    expect(screen_element).toHaveAttribute('aria-live', 'assertive');
  });

  it('deve renderizar dica para usuários não bloqueados', () => {
    render(<FailureScreen {...defaultProps} attemptsRemaining={3} />);
    
    expect(screen.getByText(/certifique-se de estar em um ambiente bem iluminado/i)).toBeInTheDocument();
  });

  it('não deve renderizar dica para usuários bloqueados', () => {
    render(<FailureScreen {...defaultProps} attemptsRemaining={0} />);
    
    expect(screen.queryByText(/certifique-se de estar em um ambiente bem iluminado/i)).not.toBeInTheDocument();
  });

  it('deve aplicar classes CSS corretas para botão desabilitado', () => {
    render(<FailureScreen {...defaultProps} attemptsRemaining={0} />);
    
    const retryButton = screen.getByTestId('retry-button');
    expect(retryButton).toHaveClass('bg-gray-400');
    expect(retryButton).toHaveClass('cursor-not-allowed');
    expect(retryButton).toHaveClass('opacity-50');
  });

  it('deve aplicar classes CSS corretas para botão habilitado', () => {
    render(<FailureScreen {...defaultProps} attemptsRemaining={3} />);
    
    const retryButton = screen.getByTestId('retry-button');
    expect(retryButton).toHaveClass('bg-blue-600');
    expect(retryButton).toHaveClass('cursor-pointer');
  });
});
