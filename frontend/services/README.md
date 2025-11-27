# Frontend Services

Este diretório contém classes de serviço que manipulam funcionalidades específicas para a aplicação de captura de reconhecimento facial.

## CameraService

O `CameraService` fornece uma interface abrangente para operações de câmera.

### Funcionalidades

- **Acesso à Câmera**: Solicita acesso à câmera com suporte para seleção de câmera frontal/traseira
- **Captura de Quadro**: Captura quadros de vídeo como imagens codificadas em base64
- **Detecção de Dispositivo**: Detecta dispositivos móveis vs desktop
- **Enumeração de Câmeras**: Lista dispositivos de câmera disponíveis
- **Gerenciamento de Recursos**: Para e limpa streams de câmera adequadamente

### Exemplo de Uso

```typescript
import { cameraService } from '@/services/CameraService';

// Solicita acesso à câmera frontal
const stream = await cameraService.requestCameraAccess('user');

// Captura um quadro do elemento de vídeo
const videoElement = document.querySelector('video');
const imageData = cameraService.captureFrame(videoElement);

// Verifica se o dispositivo é móvel
const isMobile = cameraService.isMobileDevice();

// Obtém câmeras disponíveis
const cameras = await cameraService.getAvailableCameras();

// Para o stream quando terminar
cameraService.stopStream(stream);
```

### Requisitos Atendidos

- **1.1**: Exibir feed de câmera ao vivo
- **1.4**: Solicitar permissões de câmera do dispositivo do usuário
- **2.2**: Capturar quadro atual da câmera como imagem
- **7.2**: Alternar entre câmeras frontal e traseira

### Tratamento de Erros

O serviço fornece mensagens de erro detalhadas para problemas comuns de acesso à câmera:
- Permissão negada
- Nenhuma câmera encontrada
- Câmera já em uso
- Outros erros de câmera

## APIClient

O `APIClient` manipula toda a comunicação com o backend.

### Funcionalidades

- **Verificação de Cadastro**: Verifica se usuário está cadastrado
- **Cadastro de Usuário**: Cadastra novo usuário com dados faciais e nome (opcional)
- **Identificação**: Processa reconhecimento facial
- **Retry Automático**: Retry com backoff exponencial para erros de rede
- **Timeout**: Timeout de 30 segundos para todas as requisições

## IframeMessenger

O `IframeMessenger` manipula comunicação com janela pai quando incorporado em iframe.

### Funcionalidades

- **Detecção de Iframe**: Detecta se aplicação está incorporada
- **PostMessage**: Envia mensagens de sucesso/falha para janela pai
- **Tratamento Gracioso**: Manipula cenários não incorporados sem erros
