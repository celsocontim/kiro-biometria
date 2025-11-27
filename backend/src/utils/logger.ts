/**
 * Utilitário de logging com suporte a modo debug condicional
 */

/**
 * Verifica se logging de debug está habilitado (verificado dinamicamente)
 */
function isDebugEnabled(): boolean {
  return process.env.DEBUG_LOGGING === 'true';
}

/**
 * Registra informações de debug apenas se DEBUG_LOGGING estiver habilitado
 */
export function debugLog(message: string, data?: any): void {
  if (isDebugEnabled()) {
    const timestamp = new Date().toISOString();
    if (data) {
      console.log(`[${timestamp}] ${message}`, JSON.stringify(data, null, 2));
    } else {
      console.log(`[${timestamp}] ${message}`);
    }
  }
}

/**
 * Sempre registra informações importantes (erros, avisos, eventos de segurança)
 * Usa formato simplificado quando DEBUG_LOGGING é false
 */
export function infoLog(message: string): void {
  if (isDebugEnabled()) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  } else {
    // Simplified log without timestamp
    console.log(message);
  }
}

/**
 * Sempre registra avisos
 * Usa formato simplificado quando DEBUG_LOGGING é false
 */
export function warnLog(message: string): void {
  if (isDebugEnabled()) {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] ${message}`);
  } else {
    // Simplified log without timestamp
    console.warn(`⚠️  ${message}`);
  }
}

/**
 * Sempre registra erros
 * Usa formato simplificado quando DEBUG_LOGGING é false
 */
export function errorLog(message: string, data?: any): void {
  if (isDebugEnabled()) {
    const timestamp = new Date().toISOString();
    if (data) {
      console.error(`[${timestamp}] ${message}`, JSON.stringify(data, null, 2));
    } else {
      console.error(`[${timestamp}] ${message}`);
    }
  } else {
    // Log simplificado sem timestamp e dados
    console.error(`❌ ${message}`);
  }
}
