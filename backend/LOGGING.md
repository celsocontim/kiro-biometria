# Sistema de Logging

## Visão Geral

O backend possui dois modos de logging controlados pela variável de ambiente `DEBUG_LOGGING`:

## Modo Simplificado (DEBUG_LOGGING=false) - Padrão

### Requisições HTTP
```
→ POST /api/capture
← ✓ 200 POST /api/capture (125ms)
```

### Logs de Aplicação
```
user_id: 12345, registration: false, recognized: true
Spoof attempted! User_id: 67890
⚠️  Aviso importante
❌ Erro ao processar
```

**Características:**
- Sem timestamps
- Sem JSON detalhado
- Apenas informações essenciais
- Emojis para status visual

## Modo Detalhado (DEBUG_LOGGING=true)

### Requisições HTTP
```
========== INCOMING REQUEST ==========
[2025-11-27T18:56:15.391Z] POST /api/capture
Headers: {
  "content-type": "application/json",
  "user-agent": "Mozilla/5.0..."
}
Body: {
  "userId": "12345",
  "imageData": "[IMAGE_DATA: data:image/jpeg;base64,/9j/4AAQSkZJRg... (109503 chars)]"
}
======================================

========== OUTGOING RESPONSE ==========
[2025-11-27T18:56:18.120Z] POST /api/capture
Status: 200
Duration: 2730ms
Response: {
  "success": true,
  "data": {
    "recognized": true,
    "confidence": 95,
    "userId": "12345"
  }
}
=======================================
```

### Logs de Aplicação
```
[2025-11-27T18:56:15.391Z] [Capture] Processing recognition request: {"userId": "12345","threshold": 70}
[2025-11-27T18:56:18.119Z] [RecognitionService] Face API response: {"status": 200,"errorCode": 0}
[2025-11-27T18:56:18.120Z] user_id: 12345, registration: false, recognized: true
```

**Características:**
- Timestamps ISO 8601
- JSON formatado
- Headers e body completos
- Contexto detalhado

## Configuração

### .env
```bash
# Modo simplificado (produção)
DEBUG_LOGGING=false

# Modo detalhado (desenvolvimento/debug)
DEBUG_LOGGING=true
```

## Funções de Logging

### debugLog(message, data?)
- **Quando usar**: Informações de debug/desenvolvimento
- **Comportamento**: 
  - `DEBUG_LOGGING=true`: Exibe com timestamp e JSON
  - `DEBUG_LOGGING=false`: Não exibe nada

```typescript
debugLog('[Service] Processing request', { userId, threshold });
```

### infoLog(message)
- **Quando usar**: Informações importantes (sempre exibidas)
- **Comportamento**:
  - `DEBUG_LOGGING=true`: `[2025-11-27T18:56:15.391Z] message`
  - `DEBUG_LOGGING=false`: `message`

```typescript
infoLog('user_id: 12345, registration: true');
infoLog('Spoof attempted! User_id: 67890');
```

### warnLog(message)
- **Quando usar**: Avisos importantes
- **Comportamento**:
  - `DEBUG_LOGGING=true`: `[2025-11-27T18:56:15.391Z] message`
  - `DEBUG_LOGGING=false`: `⚠️  message`

```typescript
warnLog('Configuration file not found, using defaults');
```

### errorLog(message, data?)
- **Quando usar**: Erros e exceções
- **Comportamento**:
  - `DEBUG_LOGGING=true`: `[2025-11-27T18:56:15.391Z] message` + JSON
  - `DEBUG_LOGGING=false`: `❌ message` (sem JSON)

```typescript
errorLog('[Service] Failed to process', { error: err.message });
```

## Exemplos de Uso

### Fluxo de Captura (Simplificado)
```
→ POST /api/capture
user_id: 12345, registration: false, recognized: true
← ✓ 200 POST /api/capture (2730ms)
```

### Fluxo de Captura (Detalhado)
```
→ POST /api/capture
[2025-11-27T18:56:15.391Z] [Capture] Processing recognition request: {"userId": "12345"}
[2025-11-27T18:56:15.391Z] [RecognitionService] Calling Face API
[2025-11-27T18:56:18.119Z] [RecognitionService] Face API response: {"status": 200}
[2025-11-27T18:56:18.120Z] user_id: 12345, registration: false, recognized: true
← ✓ 200 POST /api/capture (2730ms)
```

### Erro de Fraude (Simplificado)
```
→ POST /api/capture
Spoof attempted! User_id: 67890
← ✗ 400 POST /api/capture (2150ms)
```

### Erro de Fraude (Detalhado)
```
→ POST /api/capture
[2025-11-27T18:56:15.391Z] [Capture] Processing recognition request: {"userId": "67890"}
[2025-11-27T18:56:18.119Z] [RecognitionService] Face API error for user: 67890 {"errorCode": 106}
[2025-11-27T18:56:18.119Z] Spoof attempted! User_id: 67890
[2025-11-27T18:56:18.120Z] [Capture] Face API error mapped: {"errorType": "LIVENESS_CHECK_ERROR"}
← ✗ 400 POST /api/capture (2150ms)
```

## Recomendações

### Produção
```bash
DEBUG_LOGGING=false
```
- Logs limpos e legíveis
- Menor volume de dados
- Melhor performance

### Desenvolvimento
```bash
DEBUG_LOGGING=true
```
- Debugging completo
- Rastreamento de requisições
- Análise de performance

### Troubleshooting
1. Ativar `DEBUG_LOGGING=true`
2. Reproduzir problema
3. Analisar logs detalhados
4. Desativar após resolver
