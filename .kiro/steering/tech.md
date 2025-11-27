# Stack Tecnológico

## Frontend

- **Framework**: Next.js 14+ (React 18+)
- **Linguagem**: TypeScript 5.0+ com modo strict habilitado
- **Estilização**: Tailwind CSS 3.4+
- **Testes**: Jest 30+ com React Testing Library e fast-check para testes baseados em propriedades
- **Ferramenta de Build**: Bundler integrado do Next.js
- **Versão do Node**: 18.17+ necessária

### Configuração do Frontend

- Alias de caminho: `@/*` mapeia para raiz do projeto
- Resolução de módulo: bundler
- JSX: preserve (manipulado pelo Next.js)
- Target: ES2017

## Backend

- **Runtime**: Node.js 18+
- **Framework**: Express 4.18+
- **Linguagem**: TypeScript 5.0+ com modo strict habilitado
- **Testes**: Jest 30+ com ts-jest e fast-check
- **Servidor Dev**: ts-node-dev com auto-restart
- **Sistema de Módulos**: CommonJS

### Configuração do Backend

- Target: ES2020
- Diretório de saída: `./dist`
- Source maps e declarações habilitadas
- Resolução de módulo: node

## Dependências Principais

### Frontend
- `next`: ^14.2.0
- `react`: ^18.3.0
- `react-dom`: ^18.3.0
- `tailwindcss`: ^3.4.0

### Backend
- `express`: ^4.18.0
- `cors`: ^2.8.5
- `dotenv`: ^16.4.0

### Dependências de Dev Compartilhadas
- `typescript`: ^5.0.0
- `jest`: ^30.2.0
- `fast-check`: ^4.3.0 (testes baseados em propriedades)

## Comandos Comuns

### Nível Raiz
```bash
# Desenvolvimento frontend
npm run dev:frontend

# Desenvolvimento backend
npm run dev:backend

# Build frontend
npm run build:frontend

# Build backend
npm run build:backend

# Iniciar frontend de produção
npm run start:frontend

# Iniciar backend de produção
npm run start:backend
```

### Frontend (cd frontend)
```bash
# Servidor de desenvolvimento (http://localhost:3000)
npm run dev

# Build de produção
npm run build

# Iniciar servidor de produção
npm start

# Executar testes
npm test

# Executar testes em modo watch
npm run test:watch

# Lint do código
npm run lint
```

### Backend (cd backend)
```bash
# Development server with auto-restart (http://localhost:4000)
npm run dev

# Production build (outputs to dist/)
npm run build

# Start production server
npm start

# Run tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Environment Variables

### Frontend (.env.local)
```
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

### Backend (.env)
```
PORT=4000
FRONTEND_URL=http://localhost:3000
MAX_FAILURE_ATTEMPTS=0
RECOGNITION_THRESHOLD=70
USE_MOCK=false
FACE_API_URL=your-face-api-url-here
FACE_API_KEY=your-face-api-key-here
```

## Saída de Build

- **Frontend**: diretório `.next/` (saída de build do Next.js)
- **Backend**: diretório `dist/` (JavaScript compilado)

## Testes

- Arquivos de teste localizados em diretórios `__tests__/` adjacentes aos arquivos fonte
- Nomenclatura de arquivo de teste: `*.test.ts` ou `*.test.tsx`
- Execute testes com flag `--runInBand` para evitar problemas de concorrência
- Testes baseados em propriedades com fast-check para validação robusta
