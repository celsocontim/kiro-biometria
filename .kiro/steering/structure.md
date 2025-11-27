# Estrutura do Projeto

## Layout do Monorepo

```
.
├── frontend/              # Next.js frontend application
├── backend/               # Express backend API
├── .kiro/                 # Kiro configuration and specs
├── .vscode/               # VS Code settings
├── package.json           # Root package.json with workspace scripts
├── README.md              # Project documentation
├── ERROR_HANDLING.md      # Comprehensive error handling guide
├── PERFORMANCE_OPTIMIZATIONS.md  # Performance implementation details
└── SETUP_VERIFICATION.md  # Setup and verification guide
```

## Estrutura do Frontend

```
frontend/
├── app/                   # Next.js App Router
│   ├── page.tsx          # Main page component
│   ├── layout.tsx        # Root layout
│   ├── globals.css       # Global styles
│   └── __tests__/        # Page tests
├── components/            # React components
│   ├── CameraFeed.tsx
│   ├── CameraSwitchButton.tsx
│   ├── CaptureButton.tsx
│   ├── ErrorBoundary.tsx
│   ├── FaceOvalGuide.tsx
│   ├── FeedbackMessage.tsx
│   ├── SuccessScreen.tsx
│   └── __tests__/        # Component tests
├── services/              # Frontend services
│   ├── APIClient.ts      # Backend API communication
│   ├── CameraService.ts  # Camera access and capture
│   ├── IframeMessenger.ts # PostMessage communication
│   ├── README.md         # Services documentation
│   └── __tests__/        # Service tests
├── types/                 # TypeScript type definitions
│   ├── api.types.ts      # API request/response types
│   └── camera.types.ts   # Camera-related types
├── .env.local            # Environment variables (gitignored)
├── .env.local.example    # Environment template
├── jest.config.js        # Jest configuration
├── next.config.js        # Next.js configuration
├── tailwind.config.ts    # Tailwind CSS configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Frontend dependencies
```

## Estrutura do Backend

```
backend/
├── src/
│   ├── index.ts          # Express app entry point
│   ├── routes/           # API route handlers
│   ├── services/         # Business logic services
│   │   ├── ConfigurationService.ts
│   │   ├── FailureTrackingService.ts
│   │   ├── RecognitionService.ts
│   │   └── __tests__/   # Service tests
│   └── types/            # TypeScript type definitions
│       ├── api.types.ts
│       ├── config.types.ts
│       ├── failure.types.ts
│       └── recognition.types.ts
├── dist/                 # Compiled output (gitignored)
├── .env                  # Environment variables (gitignored)
├── .env.example          # Environment template
├── jest.config.js        # Jest configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Backend dependencies
```

## Padrões Arquiteturais

### Frontend

- **Organização de Componentes**: Componentes são auto-contidos com testes co-localizados em diretórios `__tests__/`
- **Camada de Serviço**: Lógica de negócio separada em classes de serviço (CameraService, APIClient, IframeMessenger)
- **Segurança de Tipos**: Definições de tipos compartilhadas no diretório `types/`, espelhando tipos do backend
- **Componentes Cliente**: Todos os componentes interativos usam diretiva `'use client'`
- **Limites de Erro**: Componente ErrorBoundary de nível superior captura erros do React
- **Hooks Personalizados**: Hooks reutilizáveis como `useViewportDimensions()` para comportamento responsivo

### Backend

- **Camada de Serviço**: Lógica de negócio encapsulada em classes de serviço
  - `ConfigurationService`: Gerencia configuração da aplicação com observação de arquivo
  - `FailureTrackingService`: Rastreia tentativas de usuário e bloqueios
  - `RecognitionService`: Manipula chamadas da API de reconhecimento facial
- **Definições de Tipos**: Contratos de requisição/resposta fortemente tipados
- **Middleware**: Middleware Express para CORS, análise de corpo, tratamento de erros
- **Tratamento de Erros**: Tratamento de erros centralizado com formato de resposta consistente

## Convenções de Nomenclatura

### Arquivos
- Componentes: PascalCase (ex: `CameraFeed.tsx`)
- Serviços: PascalCase (ex: `CameraService.ts`)
- Tipos: camelCase com sufixo `.types.ts` (ex: `api.types.ts`)
- Testes: Mesmo nome do fonte com sufixo `.test.ts` ou `.test.tsx`
- Arquivos de config: kebab-case ou nomes padrão (ex: `jest.config.js`)

### Código
- Componentes: PascalCase (ex: `CameraFeed`)
- Funções/métodos: camelCase (ex: `requestCameraAccess`)
- Interfaces/Tipos: PascalCase (ex: `CaptureRequest`)
- Constantes: UPPER_SNAKE_CASE (ex: `MAX_FAILURE_ATTEMPTS`)
- Métodos privados: camelCase com prefixo underscore (ex: `_handleError`)

## Organização de Testes

- Testes são co-localizados com arquivos fonte em diretórios `__tests__/`
- Arquivos de teste espelham a estrutura dos arquivos fonte
- Testes baseados em propriedades usam biblioteca fast-check
- Testes unitários para serviços, testes de integração para componentes
- Nomenclatura de testes: `describe('ComponentName', () => { it('should...', () => {}) })`

## Documentação

- Comentários JSDoc inline para funções e serviços complexos
- Props de componentes documentadas com interfaces TypeScript
- Requisitos referenciados em comentários (ex: `// Requisito 1.1: Exibir feed de câmera ao vivo`)
- Guias abrangentes em arquivos markdown no nível raiz:
  - `ERROR_HANDLING.md`: Padrões e estratégias de tratamento de erros
  - `PERFORMANCE_OPTIMIZATIONS.md`: Detalhes de implementação de performance
  - `SETUP_VERIFICATION.md`: Etapas de configuração e verificação

## Arquivos de Configuração

- **TypeScript**: Modo strict habilitado, aliases de caminho configurados
- **Jest**: Configurações separadas para frontend (jsdom) e backend (node)
- **Next.js**: Cabeçalhos CSP para incorporação em iframe, integração Tailwind
- **Tailwind**: Breakpoints personalizados para design responsivo
- **ESLint**: Regras recomendadas do Next.js (apenas frontend)

## Princípios Chave

1. **Separação de Responsabilidades**: Componentes de UI, lógica de negócio (serviços) e tipos são claramente separados
2. **Segurança de Tipos**: TypeScript strict com definições de tipos compartilhadas entre frontend e backend
3. **Testabilidade**: Serviços e componentes projetados para testes fáceis com testes co-localizados
4. **Tratamento de Erros**: Tratamento abrangente de erros em todas as camadas com mensagens amigáveis ao usuário
5. **Performance**: Otimizações para compressão de imagem, eficiência de rede e responsividade da UI
6. **Documentação**: Código é auto-documentado com nomenclatura clara e comentários inline
