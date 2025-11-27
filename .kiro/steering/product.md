# Visão Geral do Produto

Uma aplicação full-stack de captura de reconhecimento facial que permite aos usuários capturar imagens faciais através de uma interface web com orientação visual e feedback em tempo real.

## Funcionalidade Principal

- Feed de câmera ao vivo com guia de posicionamento facial (sobreposição oval)
- Captura de imagem com compressão e otimização automáticas
- Processamento de reconhecimento facial via API backend
- Rastreamento de falhas com persistência SQLite e bloqueio de usuário após tentativas máximas
- Suporte a incorporação em iframe com comunicação PostMessage
- Design responsivo para dispositivos móveis, tablets e desktops
- Identidade visual customizável (cor primária #00995D)

## Recursos Principais

- Troca de câmera (frontal/traseira em dispositivos móveis)
- Feedback visual para sucesso/falha de captura
- Rastreamento de tentativas com exibição de tentativas restantes
- Tratamento abrangente de erros para problemas de câmera e rede
- Otimizações de performance para tamanho de imagem e eficiência de rede
- Parâmetro "nome" com validação e sanitização de segurança
- Sistema de logging simplificado vs detalhado (DEBUG_LOGGING)
- Mapeamento específico de códigos de erro da FACE_API (106, 107, 108, 109)
- Persistência de dados de falhas com SQLite (sobrevive a restarts do servidor)

## Fluxo do Usuário

### Carregamento Inicial
1. Aplicação verifica se o usuário está cadastrado via API backend
2. Usuário concede permissões de câmera
3. Feed da câmera é exibido com guia de posicionamento facial

### Fluxo de Cadastro (Usuários Não Cadastrados)
1. Usuário posiciona o rosto dentro da guia oval
2. Usuário captura imagem via botão (com nome opcional exibido)
3. Imagem e nome (se fornecido) são enviados para o backend para cadastro
4. Backend cria usuário na API de reconhecimento facial e adiciona credencial facial (template)
5. Detecção de vivacidade realizada durante criação da credencial
6. Em caso de sucesso: Tela de sucesso exibida e janela pai notificada
7. Em caso de detecção de fraude: Mensagem de erro específica mostrada (códigos 106-109), falha registrada no SQLite, usuário pode tentar novamente
8. Em caso de falha: Mensagem de erro mostrada, falha registrada no SQLite, usuário pode tentar novamente
9. Em caso de tentativas máximas excedidas: Usuário é bloqueado temporariamente (se MAX_FAILURE_ATTEMPTS > 0), registro persistido no SQLite

### Fluxo de Identificação (Usuários Cadastrados)
1. Usuário posiciona o rosto dentro da guia oval
2. Usuário captura imagem via botão (nome exibido se fornecido via parâmetro URL)
3. Imagem é processada pela API de reconhecimento facial com verificação em duas etapas:
   - Etapa 1: Detecção de Vivacidade (Extract) - Detecta tentativas de fraude
   - Etapa 2: Identificação de Usuário (Identify) - Compara com usuário cadastrado
4. Em caso de sucesso: Tela de sucesso exibida com nome (se fornecido) e janela pai notificada
5. Em caso de detecção de fraude: Mensagem de erro específica mostrada (códigos 106-109), falha registrada no SQLite, usuário pode tentar novamente
6. Em caso de falha: Falha registrada no SQLite, usuário pode tentar novamente (até máximo de tentativas se configurado)
7. Em caso de tentativas máximas excedidas: Usuário é bloqueado temporariamente (se MAX_FAILURE_ATTEMPTS > 0), registro persistido no SQLite, tela de bloqueio exibida com tempo restante

## Integração

A aplicação é projetada para ser incorporada em um iframe e se comunica com a janela pai usando a API PostMessage para notificar sobre sucesso/falha de captura.

### Parâmetros de URL

- `userId` (obrigatório): Identificador único do usuário
- `name` (opcional): Nome do usuário para exibição e cadastro

Exemplo: `http://localhost:3000?userId=12345&name=João Silva`

## Persistência de Dados

### SQLite Database
- Localização: `backend/data/failures.db`
- Modo WAL (Write-Ahead Logging) para melhor concorrência
- Limpeza automática de registros antigos (24h+) a cada 1 hora
- Sobrevive a restarts do servidor
- Suporta milhares de operações por segundo

### Schema
```sql
CREATE TABLE user_failures (
  user_id TEXT PRIMARY KEY,
  failure_count INTEGER DEFAULT 0,
  locked_until INTEGER,
  last_failure INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
```

## Sistema de Logging

### Modo Simplificado (DEBUG_LOGGING=false) - Padrão
- Logs limpos sem timestamps
- Apenas informações essenciais
- Emojis para status visual
- Ideal para produção

### Modo Detalhado (DEBUG_LOGGING=true)
- Timestamps ISO 8601
- JSON formatado
- Headers e body completos
- Contexto detalhado
- Ideal para desenvolvimento/debug
