# Scripts do Backend

## Verificar Banco de Dados SQLite

### Opção 1: Script Node.js (Recomendado) ⭐

```bash
cd backend
npm run db:check
```

**Output:**
```
╔════════════════════════════════════════════════════════════╗
║              BANCO DE DADOS - FAILURES                     ║
╚════════════════════════════════════════════════════════════╝

📊 Total de registros: 3

📋 TODOS OS REGISTROS:

────────────────────────────────────────────────────────────────────────────────────────────────────
USER_ID             FALHAS    BLOQUEADO ATÉ            ÚLTIMA FALHA             STATUS
────────────────────────────────────────────────────────────────────────────────────────────────────
12345               5         27/11/2025 19:00:00      27/11/2025 18:58:00      🔒 BLOQUEADO
67890               3         -                        27/11/2025 18:55:00      ✓ Liberado
99999               1         -                        27/11/2025 18:50:00      ✓ Liberado
────────────────────────────────────────────────────────────────────────────────────────────────────

📈 ESTATÍSTICAS:

   Usuários bloqueados: 1
   Usuários liberados: 2
   Média de falhas: 3.00
```

### Opção 2: SQLite CLI

```bash
# Instalar SQLite (se não tiver)
choco install sqlite

# Abrir banco
cd backend
sqlite3 data/failures.db

# Comandos úteis:
.tables                           # Listar tabelas
.schema user_failures             # Ver estrutura
SELECT * FROM user_failures;      # Ver todos os registros

# Ver com formatação
.mode column
.headers on
SELECT 
  user_id,
  failure_count,
  datetime(locked_until/1000, 'unixepoch') as locked_until,
  datetime(last_failure/1000, 'unixepoch') as last_failure
FROM user_failures;

# Sair
.exit
```

### Opção 3: DB Browser for SQLite (GUI)

1. Baixar: https://sqlitebrowser.org/dl/
2. Instalar
3. File → Open Database → `backend/data/failures.db`
4. Navegar pelas abas "Browse Data" e "Execute SQL"

### Opção 4: VS Code Extension

1. Instalar extensão "SQLite Viewer"
2. Clicar com botão direito em `backend/data/failures.db`
3. "Open Database"

## Queries Úteis

### Ver usuários bloqueados
```sql
SELECT 
  user_id,
  failure_count,
  datetime(locked_until/1000, 'unixepoch', 'localtime') as locked_until
FROM user_failures 
WHERE locked_until > strftime('%s', 'now') * 1000;
```

### Ver registros antigos (>24h)
```sql
SELECT 
  user_id,
  datetime(last_failure/1000, 'unixepoch', 'localtime') as last_failure
FROM user_failures 
WHERE last_failure < strftime('%s', 'now') * 1000 - (24 * 60 * 60 * 1000);
```

### Limpar usuário específico
```sql
DELETE FROM user_failures WHERE user_id = '12345';
```

### Limpar todos os registros
```sql
DELETE FROM user_failures;
```

### Desbloquear usuário
```sql
UPDATE user_failures 
SET locked_until = NULL, failure_count = 0 
WHERE user_id = '12345';
```

## Backup do Banco

```bash
# Copiar arquivo
cp backend/data/failures.db backend/data/failures.db.backup

# Ou com SQLite CLI
sqlite3 backend/data/failures.db ".backup backup.db"
```

## Restaurar Backup

```bash
# Parar servidor primeiro
# Depois copiar backup
cp backend/data/failures.db.backup backend/data/failures.db
```
