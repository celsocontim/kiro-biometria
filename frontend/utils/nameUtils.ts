/**
 * Utilitários para manipulação e validação de nomes
 * 
 * Garante segurança contra SQL injection e XSS através de:
 * - Validação de caracteres alfanuméricos apenas
 * - Limite de tamanho máximo
 * - Sanitização de entrada
 */

/**
 * Valida e sanitiza um nome de usuário
 * 
 * @param name - Nome a ser validado
 * @returns Nome sanitizado ou string vazia se inválido
 * 
 * Regras:
 * - Apenas caracteres alfanuméricos e espaços
 * - Máximo 200 caracteres
 * - Remove caracteres especiais que poderiam ser usados em ataques
 */
export function sanitizeName(name: string | null): string {
  if (!name) return '';
  
  // Remove qualquer caractere que não seja alfanumérico, espaço ou hífen
  // Isso previne SQL injection e XSS
  const sanitized = name
    .replace(/[^a-zA-Z0-9\s\-]/g, '')
    .trim()
    .substring(0, 200);
  
  return sanitized;
}

/**
 * Valida se um nome é válido
 * 
 * @param name - Nome a ser validado
 * @returns true se válido, false caso contrário
 */
export function isValidName(name: string | null): boolean {
  if (!name) return false;
  
  const sanitized = sanitizeName(name);
  
  // Nome deve ter pelo menos 1 caractere após sanitização
  return sanitized.length > 0 && sanitized.length <= 200;
}

/**
 * Extrai o primeiro nome de um nome completo
 * 
 * @param fullName - Nome completo
 * @returns Primeiro nome
 */
export function getFirstName(fullName: string): string {
  if (!fullName) return '';
  
  const parts = fullName.trim().split(/\s+/);
  return parts[0] || '';
}

/**
 * Formata nome para exibição responsiva
 * 
 * @param fullName - Nome completo
 * @param isMobile - Se está em resolução mobile
 * @returns Nome formatado (primeiro nome em mobile, nome completo em desktop)
 */
export function formatNameForDisplay(fullName: string, isMobile: boolean): string {
  if (!fullName) return '';
  
  const sanitized = sanitizeName(fullName);
  
  if (isMobile) {
    return getFirstName(sanitized);
  }
  
  return sanitized;
}
