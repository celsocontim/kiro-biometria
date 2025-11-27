# SQLite Implementation - Failure Tracking

## Visão Geral

O sistema de rastreamento de falhas foi migrado de cache em memória para **SQLite** para garantir persistência de dados entre reinicializações do servidor.

## Características

### ✅ Persistência
- Dados sobrevivem a restarts do servidor
- Arquivo de banco: `backend/data/failures.db`
- Modo WAL (Write-Ahead Logging) para melhor concorrência

### ✅ Limpeza Automática
- Executa a cada 1 hora
- Remove registros com mais de 24 horas
- Mantém apenas registros ativos ou bloqueados

### ✅ Performance
- Índices em `locked_until` e `last_failure`
- Queries otimizadas com prepared statements
- Suporta milhares de operações por segundo

### ✅ Graceful Shutdown
- Fecha conexão do banco corretamente ao desligar servidor
- Suporta sinais SIGTERM e SIGINT

## Schema do Banco

```sql
CREATE TABLE user_failures (
  user_id TEXT PRIMARY KEY,
  failure_count INTEGER DEFAULT 0,
  locked_until INTEGER,           -- Timestamp Unix em ms
  last_failure INTEGER NOT NULL,  -- Timestamp da última falha
  created_at INTEGER NOT NULL     -- Timestamp de criação
);

CREATE INDEX idx_locked_until ON user_failures(locked_until);
CREATE INDEX idx_last_failure ON user_failures(last_failure);
```

## Como Funciona

### 1. Registro de Falha
```typescript
await failureTrackingService.recordFailure(userId);
```
- Incrementa contador de falhas
- Se atingir limite → Define `locked_until` = now + TTL

### 2. Verificação de Bloqueio
```typescript
const isLocked = await failureTrackingService.isUserLocked(userId);
```
- Query: `SELECT locked_until WHERE locked_until > now`
- Retorna `true` se usuário ainda está bloqueado

### 3. Liberação Automática
- **Não precisa de job/cron**
- Verifica dinamicamente na leitura
- Se `locked_until < now` → Usuário liberado

### 4. Limpeza de Registros Antigos
- Executa automaticamente a cada 1 hora
- Remove registros com `last_failure > 24h` e não bloqueados
- Mantém banco limpo e performático

## Configuração

### Variáveis de Ambiente (.env)
```bash
MAX_FAILURE_ATTEMPTS=5        # 0 = ilimitado
FAILURE_RECORD_TTL=2          # Minutos de bloqueio
```

### Localização do Banco
```
backend/
  └── data/
      ├── failures.db          # Banco principal
      ├── failures.db-shm      # Shared memory (WAL)
      └── failures.db-wal      # Write-ahead log
```

## Backup

Para fazer backup do banco:
```bash
# Copiar arquivo do banco
cp backend/data/failures.db backend/data/failures.db.backup

# Ou usar SQLite CLI
sqlite3 backend/data/failures.db ".backup backup.db"
```

## Migração Futura

Se precisar migrar para PostgreSQL/MySQL:
1. A interface `IFailureTrackingService` permanece a mesma
2. Criar nova implementação (ex: `FailureTrackingServicePostgres`)
3. Trocar no `index.ts`
4. Queries SQL são similares

## Monitoramento

### Ver registros no banco
```bash
sqlite3 backend/data/failures.db

# Listar todos os usuários
SELECT * FROM user_failures;

# Ver usuários bloqueados
SELECT user_id, failure_count, 
       datetime(locked_until/1000, 'unixepoch') as locked_until
FROM user_failures 
WHERE locked_until > strftime('%s', 'now') * 1000;

# Contar registros
SELECT COUNT(*) FROM user_failures;
```

### Logs
```
[FailureTrackingServiceSQLite] Initialized with database at: /path/to/failures.db
[FailureTrackingServiceSQLite] Cleaned up 5 old records
[FailureTrackingServiceSQLite] User locked: { userId: '123', failureCount: 5 }
```

## Vantagens vs Cache em Memória

| Aspecto | Cache (Anterior) | SQLite (Atual) |
|---------|------------------|----------------|
| **Persistência** | ❌ Perde ao reiniciar | ✅ Mantém dados |
| **Múltiplas instâncias** | ❌ Não suporta | ⚠️ Requer file locking |
| **Performance** | ✅ Muito rápido | ✅ Rápido |
| **Backup** | ❌ Difícil | ✅ Copiar arquivo |
| **Debugging** | ❌ Difícil | ✅ Query SQL |
| **Escalabilidade** | ❌ Limitado | ✅ Milhares de usuários |

## Troubleshooting

### Banco corrompido
```bash
# Verificar integridade
sqlite3 backend/data/failures.db "PRAGMA integrity_check;"

# Reconstruir banco
rm backend/data/failures.db*
# Reiniciar servidor (cria novo banco)
```

### Performance lenta
```bash
# Analisar queries
sqlite3 backend/data/failures.db "EXPLAIN QUERY PLAN SELECT * FROM user_failures WHERE user_id = '123';"

# Recriar índices
sqlite3 backend/data/failures.db "REINDEX;"
```

### Limpar todos os dados
```bash
# Deletar arquivo do banco
rm backend/data/failures.db*
# Servidor criará novo banco vazio ao iniciar
```
