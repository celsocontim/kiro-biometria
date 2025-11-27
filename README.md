# Aplicação de Captura de Reconhecimento Facial

Uma aplicação web full-stack para capturar imagens faciais com detecção de vivacidade em tempo real e identificação de usuário. Apresenta feed de câmera ao vivo, design responsivo e parâmetros de reconhecimento configuráveis com integração a APIs de reconhecimento facial.

## Funcionalidades

- 📷 Feed de câmera ao vivo em tela cheia com guia de posicionamento facial
- 🎯 Detecção de vivacidade em tempo real (anti-fraude)
- 👤 Identificação de usuário com pontuação de confiança
- 🔄 Rastreamento de tentativas configurável (ilimitado ou limitado)
- 📱 Design totalmente responsivo (móvel, tablet, desktop)
- 🔌 Suporte a incorporação em iframe com API PostMessage
- ⚙️ Configuração em tempo de execução sem implantação
- 🧪 Modo mock para desenvolvimento/testes

## Estrutura do Projeto

```
.
├── frontend/              # Aplicação frontend Next.js 14
│   ├── app/              # Diretório app do Next.js (páginas)
│   ├── components/       # Componentes React
│   │   ├── CameraFeed.tsx
│   │   ├── FaceOvalGuide.tsx
│   │   ├── CaptureButton.tsx
│   │   ├── FeedbackMessage.tsx
│   │   └── SuccessScreen.tsx
│   ├── services/         # Serviços frontend
│   │   ├── CameraService.ts
│   │   ├── APIClient.ts
│   │   └── IframeMessenger.ts
│   └── types/            # Definições de tipos TypeScript
│
├── backend/              # API backend Express
│   ├── src/
│   │   ├── index.ts      # Ponto de entrada da aplicação Express
│   │   ├── routes/       # Manipuladores de rotas da API
│   │   └── services/     # Serviços de lógica de negócio
│   │       ├── ConfigurationService.ts
│   │       ├── FailureTrackingService.ts
│   │       └── RecognitionService.ts
│   └── types/            # Definições de tipos TypeScript
│
└── .kiro/                # Configuração e especificações do Kiro IDE
```

## Pré-requisitos

- Node.js 18.17+ (necessário para Next.js 14)
- npm ou yarn
- Navegador moderno com suporte a câmera

## Início Rápido

### 1. Instalar Dependências

```bash
# Instalar dependências do frontend
cd frontend
npm install

# Instalar dependências do backend
cd ../backend
npm install
```

### 2. Configurar Ambiente

**Backend** (`backend/.env`):
```bash
cp backend/.env.example backend/.env
```

Editar `backend/.env`:
```env
PORT=4000
FRONTEND_URL=http://localhost:3000
MAX_FAILURE_ATTEMPTS=0
RECOGNITION_THRESHOLD=70
USE_MOCK=false
FACE_API_URL=sua-url-da-api-facial-aqui
FACE_API_KEY=sua-chave-da-api-facial-aqui
```

**Frontend** (`frontend/.env.local`):
```bash
cp frontend/.env.local.example frontend/.env.local
```

Editar `frontend/.env.local`:
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:4000
```

### 3. Executar Servidores de Desenvolvimento

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 4. Acessar a Aplicação

- Frontend: http://localhost:3000
- API Backend: http://localhost:4000
- Com parâmetro userId: http://localhost:3000?userId=SEU_ID_DE_USUARIO

## Parâmetros de Configuração

### Variáveis de Ambiente do Backend

| Variável | Padrão | Descrição |
|----------|---------|-------------|
| `PORT` | 4000 | Porta do servidor backend |
| `FRONTEND_URL` | http://localhost:3000 | URL do frontend para CORS |
| `MAX_FAILURE_ATTEMPTS` | 0 | Máximo de tentativas falhadas antes do bloqueio (0 = ilimitado) |
| `FAILURE_RECORD_TTL` | 2 | Tempo em minutos para expirar registros de falha |
| `RECOGNITION_THRESHOLD` | 70 | Limiar de confiança (0-100) para reconhecimento |
| `USE_MOCK` | false | Usar reconhecimento mock ao invés da API real |
| `FACE_API_URL` | - | URL do endpoint da API de reconhecimento facial |
| `FACE_API_KEY` | - | Chave de autenticação da API de reconhecimento facial |

### Comportamento da Configuração

- **MAX_FAILURE_ATTEMPTS = 0**: Tentativas ilimitadas, sem bloqueio de usuário, tentativas mostradas como 99
- **RECOGNITION_THRESHOLD**: Pontuações de confiança >= limiar são "reconhecidas"
- **USE_MOCK = true**: Usa API mock com pontuações de confiança aleatórias
- **USE_MOCK = false**: Usa API de reconhecimento facial real
- **Auto-reload**: Configuração recarrega a cada 60 segundos sem reiniciar

## Endpoints da API

### Backend

- `GET /health` - Verificação de saúde
- `GET /api/config` - Obter configuração atual (debug)
- `POST /api/user` - Verificar se usuário está cadastrado
- `POST /api/register` - Cadastrar novo usuário com dados faciais
- `POST /api/capture` - Processar identificação de reconhecimento facial

**Solicitação de Verificação de Usuário:**
```json
{
  "user_id": "string"
}
```

**Resposta de Verificação de Usuário:**
```json
{
  "registered": true,
  "timestamp": "2025-11-27T..."
}
```

**Solicitação de Cadastro:**
```json
{
  "user_id": "string",
  "imageData": "data:image/jpeg;base64,..."
}
```

**Resposta de Cadastro (Sucesso):**
```json
{
  "success": true,
  "timestamp": "2025-11-27T..."
}
```

**Solicitação de Captura:**
```json
{
  "userId": "string",
  "imageData": "data:image/jpeg;base64,..."
}
```

**Resposta de Captura (Sucesso):**
```json
{
  "success": true,
  "data": {
    "recognized": true,
    "confidence": 95,
    "userId": "347313",
    "timestamp": "2025-11-27T...",
    "attemptsRemaining": 99
  }
}
```

**Resposta de Captura (Fraude Detectada):**
```json
{
  "success": false,
  "error": "Tentativa de fraude! Certifique-se de usar um rosto real!",
  "errorCode": "LIVENESS_CHECK_ERROR"
}
```

## Fluxo de Reconhecimento

A aplicação suporta tanto cadastro quanto identificação de usuário com detecção automática:

### No Carregamento da Página: Verificação de Cadastro
1. Frontend chama `POST /api/user` com user_id
2. Backend consulta API de reconhecimento facial para verificar se usuário existe
3. Resultado armazenado no estado local (`isRegistered`)

### Quando a Foto é Capturada

**Para Usuários Não Cadastrados (Fluxo de Cadastro):**
1. Captura imagem da câmera
2. Chama `POST /api/register` com user_id e imagem
3. Backend cria usuário na API de reconhecimento facial
4. Backend adiciona credencial facial (template) ao usuário com detecção de vivacidade
5. Se fraude detectada: Usuário é deletado, erro retornado ao frontend
6. Em caso de sucesso: Mostra tela de sucesso e notifica janela pai
7. Em caso de falha: Mensagem de erro mostrada, usuário pode tentar novamente

**Para Usuários Cadastrados (Fluxo de Identificação):**
1. Captura imagem da câmera
2. Chama `POST /api/capture` com user_id e imagem
3. Backend realiza verificação em duas etapas via API de reconhecimento facial:
   - **Etapa 1: Detecção de Vivacidade (Extract)** - Detecta tentativas de fraude (fotos, vídeos, máscaras)
   - **Etapa 2: Identificação de Usuário (Identify)** - Compara rosto com usuário cadastrado
4. Se fraude detectada: Erro retornado ao frontend
5. Em caso de sucesso: Mostra tela de sucesso e notifica janela pai
6. Em caso de falha: Usuário pode tentar novamente (até máximo de tentativas se configurado)

**Critérios de Sucesso:**
- ✅ Cadastro: Usuário criado e credencial adicionada com sucesso (verificação de vivacidade passa)
- ✅ Identificação: Verificação de vivacidade passa + ID do usuário corresponde + Confiança >= limiar

**Detecção de Fraude:**
- Tanto cadastro quanto identificação incluem detecção de vivacidade
- Previne fotos, vídeos, máscaras e outras tentativas de fraude
- Mensagens de erro claras orientam usuários a usar rostos reais
- Registrado para monitoramento de segurança

## Desenvolvimento

### Desenvolvimento Frontend

```bash
cd frontend
npm run dev      # Servidor de desenvolvimento (porta 3000)
npm run build    # Build de produção
npm run lint     # ESLint
npm test         # Executar testes
```

### Desenvolvimento Backend

```bash
cd backend
npm run dev      # Servidor de desenvolvimento (porta 4000)
npm run build    # Build de produção
npm test         # Executar testes
```

## Funcionalidades em Detalhe

### Feed de Câmera em Tela Cheia
- Feed da câmera preenche toda a viewport
- Guia oval responsiva para posicionamento facial
- ID do usuário exibido no canto superior esquerdo
- Dimensionamento dinâmico de texto baseado no tamanho da tela

### Detecção de Vivacidade
- Detecção de fraude em tempo real
- Previne fotos, vídeos e máscaras
- Mensagens de erro claras para tentativas de fraude
- Avisos registrados para monitoramento de segurança

### Sistema de Feedback
- Mensagens de sucesso dispensadas automaticamente após 3 segundos
- Mensagens de erro dispensadas automaticamente após 10 segundos
- Opção de dispensa manual disponível
- Contador de tentativas (quando habilitado)

### Design Responsivo
- Móvel: Tela cheia com controles otimizados para toque
- Tablet: Tela cheia com botões maiores
- Desktop: Tela cheia com suporte a teclado

## Integração com Iframe

A aplicação suporta incorporação em iframe com comunicação PostMessage:

```html
<iframe src="http://localhost:3000?userId=ID_DO_USUARIO" />
```

**Eventos PostMessage:**
- `facial-recognition-success` - Reconhecimento bem-sucedido
- `facial-recognition-failure` - Tentativas máximas excedidas

## Suporte a Navegadores

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Recursos de Navegador Necessários:**
- API MediaDevices (acesso à câmera)
- JavaScript ES2017+
- CSS Grid e Flexbox

## Solução de Problemas

### Câmera Não Funciona

1. Certifique-se de estar usando HTTPS ou localhost
2. Conceda permissões de câmera no navegador
3. Verifique se outro aplicativo está usando a câmera
4. Verifique se o navegador suporta API MediaDevices

### Erros de CORS

1. Verifique `FRONTEND_URL` no `.env` do backend
2. Certifique-se de que o frontend está rodando na porta configurada
3. Limpe o cache do navegador

### Backend Não Inicia

1. Verifique versão do Node.js >= 18.17
2. Verifique se a porta 4000 está disponível
3. Certifique-se de que o arquivo `.env` existe com valores válidos

### Problemas de Detecção de Fraude

1. Certifique-se de que `USE_MOCK=false` no `.env` do backend
2. Verifique se as credenciais da API de reconhecimento facial estão configuradas
3. Verifique o console do backend para avisos "Spoof attempt!"
4. Certifique-se de iluminação adequada para a câmera

## Recursos de Segurança

- Detecção de vivacidade previne fraudes
- Limites de tentativas configuráveis
- Bloqueio de usuário após tentativas máximas
- Requisito de HTTPS seguro para acesso à câmera
- Proteção CORS
- Validação de requisições
- Registro de erros para monitoramento de segurança

## Documentação

- [Guia de Tratamento de Erros](ERROR_HANDLING.md)
- [Otimizações de Performance](PERFORMANCE_OPTIMIZATIONS.md)
- [Verificação de Configuração](SETUP_VERIFICATION.md)
- [Especificação de Requisitos](.kiro/specs/facial-recognition-capture/requirements.md)
- [Documento de Design](.kiro/specs/facial-recognition-capture/design.md)

## Licença

MIT
