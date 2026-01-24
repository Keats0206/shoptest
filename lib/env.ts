/**
 * Environment variable validation
 * Validates that all required environment variables are set at startup
 */

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'ANTHROPIC_API_KEY',
  'CHANNEL3_API_KEY',
] as const;

const optionalEnvVars = [
  'CHANNEL3_API_URL',
  'NEXT_PUBLIC_SITE_URL',
] as const;

export function validateEnv(): void {
  const missing: string[] = [];
  
  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env.local file and ensure all required variables are set.'
    );
  }
}

/**
 * Get an environment variable with validation
 */
export function getEnv(key: typeof requiredEnvVars[number]): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Required environment variable ${key} is not set`);
  }
  return value;
}

/**
 * Get an optional environment variable with a default value
 */
export function getOptionalEnv(
  key: typeof optionalEnvVars[number],
  defaultValue: string
): string {
  return process.env[key] || defaultValue;
}
