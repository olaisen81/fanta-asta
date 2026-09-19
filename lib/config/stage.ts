export type AppStage = 'development' | 'staging' | 'production';

/**
 * Recupera lo stage attuale dell'applicazione configurato:
 * 1. Variabile esplicita: NEXT_PUBLIC_APP_STAGE (es. 'production', 'staging', 'development')
 * 2. Alias: NEXT_PUBLIC_APP_ENV
 * 3. Fallback standard: process.env.NODE_ENV ('production' o 'development')
 */
export function getAppStage(): AppStage {
  const envStage = (
    process.env.NEXT_PUBLIC_APP_STAGE ||
    process.env.NEXT_PUBLIC_APP_ENV ||
    ''
  )
    .trim()
    .toLowerCase();

  if (envStage === 'production' || envStage === 'prod') {
    return 'production';
  }
  if (
    envStage === 'staging' ||
    envStage === 'stage' ||
    envStage === 'preview' ||
    envStage === 'test'
  ) {
    return 'staging';
  }
  if (
    envStage === 'development' ||
    envStage === 'dev' ||
    envStage === 'local'
  ) {
    return 'development';
  }

  return process.env.NODE_ENV === 'production' ? 'production' : 'development';
}

/**
 * Restituisce true se lo stage configurato è 'production'
 */
export function isProductionStage(): boolean {
  return getAppStage() === 'production';
}

/**
 * Determina se la sezione 'Test Rapido' deve essere visualizzata nella schermata di login:
 * - Se NEXT_PUBLIC_ENABLE_TEST_LOGIN è impostata su 'true' o 'false', ha precedenza assoluta.
 * - Altrimenti, è attiva solo negli stage diversi da 'production' (development, staging/preview).
 */
export function isTestLoginEnabled(): boolean {
  const explicitFlag = process.env.NEXT_PUBLIC_ENABLE_TEST_LOGIN;
  if (explicitFlag !== undefined && explicitFlag !== '') {
    return explicitFlag.trim().toLowerCase() === 'true';
  }

  return !isProductionStage();
}
