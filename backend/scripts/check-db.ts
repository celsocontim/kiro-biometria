/**
 * Script para verificar dados do banco SQLite
 * 
 * Uso:
 *   npx ts-node scripts/check-db.ts
 */

import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '..', 'data', 'failures.db');

try {
  const db = new Database(dbPath, { readonly: true });
  
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║              BANCO DE DADOS - FAILURES                     ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');
  
  // Contar total de registros
  const countStmt = db.prepare('SELECT COUNT(*) as total FROM user_failures');
  const { total } = countStmt.get() as { total: number };
  
  console.log(`📊 Total de registros: ${total}\n`);
  
  if (total === 0) {
    console.log('✓ Banco vazio - nenhum usuário com falhas registradas\n');
    db.close();
    process.exit(0);
  }
  
  // Listar todos os registros
  console.log('📋 TODOS OS REGISTROS:\n');
  console.log('─'.repeat(100));
  console.log('USER_ID'.padEnd(20) + 'FALHAS'.padEnd(10) + 'BLOQUEADO ATÉ'.padEnd(25) + 'ÚLTIMA FALHA'.padEnd(25) + 'STATUS');
  console.log('─'.repeat(100));
  
  const allStmt = db.prepare(`
    SELECT 
      user_id,
      failure_count,
      locked_until,
      last_failure
    FROM user_failures
    ORDER BY last_failure DESC
  `);
  
  const now = Date.now();
  const records = allStmt.all() as Array<{
    user_id: string;
    failure_count: number;
    locked_until: number | null;
    last_failure: number;
  }>;
  
  records.forEach(record => {
    const userId = record.user_id.padEnd(20);
    const failures = String(record.failure_count).padEnd(10);
    
    const lockedUntil = record.locked_until 
      ? new Date(record.locked_until).toLocaleString('pt-BR')
      : '-';
    const lockedUntilStr = lockedUntil.padEnd(25);
    
    const lastFailure = new Date(record.last_failure).toLocaleString('pt-BR');
    const lastFailureStr = lastFailure.padEnd(25);
    
    const isLocked = record.locked_until && record.locked_until > now;
    const status = isLocked ? '🔒 BLOQUEADO' : '✓ Liberado';
    
    console.log(userId + failures + lockedUntilStr + lastFailureStr + status);
  });
  
  console.log('─'.repeat(100));
  
  // Estatísticas
  console.log('\n📈 ESTATÍSTICAS:\n');
  
  const lockedStmt = db.prepare(`
    SELECT COUNT(*) as count 
    FROM user_failures 
    WHERE locked_until > ?
  `);
  const { count: lockedCount } = lockedStmt.get(now) as { count: number };
  
  const avgFailuresStmt = db.prepare('SELECT AVG(failure_count) as avg FROM user_failures');
  const { avg: avgFailures } = avgFailuresStmt.get() as { avg: number };
  
  console.log(`   Usuários bloqueados: ${lockedCount}`);
  console.log(`   Usuários liberados: ${total - lockedCount}`);
  console.log(`   Média de falhas: ${avgFailures.toFixed(2)}`);
  
  // Registros antigos (> 24h)
  const twentyFourHoursAgo = now - (24 * 60 * 60 * 1000);
  const oldStmt = db.prepare(`
    SELECT COUNT(*) as count 
    FROM user_failures 
    WHERE last_failure < ? 
      AND (locked_until IS NULL OR locked_until < ?)
  `);
  const { count: oldCount } = oldStmt.get(twentyFourHoursAgo, now) as { count: number };
  
  if (oldCount > 0) {
    console.log(`\n⚠️  ${oldCount} registro(s) antigo(s) (>24h) aguardando limpeza`);
  }
  
  console.log('\n');
  
  db.close();
} catch (error) {
  if ((error as any).code === 'SQLITE_CANTOPEN') {
    console.error('\n❌ Banco de dados não encontrado!');
    console.error(`   Caminho esperado: ${dbPath}`);
    console.error('   O banco será criado automaticamente quando o servidor iniciar.\n');
  } else {
    console.error('\n❌ Erro ao acessar banco:', (error as Error).message, '\n');
  }
  process.exit(1);
}
