// server/src/services/ai/index.ts

import { AiProviderDefinition, BaseProviderConfig } from './types.js';
import { loadEncryptedConfig, saveEncryptedConfig, deleteEncryptedConfig } from './security.js';

// --- Provider Imports ---
import { CLAUDE_PROVIDER_ID, claudeProvider, ClaudeConfig } from './providers/claude.js';

// --- Provider Registry ---

/**
 * Define all available AI providers here.
 * This registry is used to look up provider implementations and their default settings.
 */
const providerDefinitions: AiProviderDefinition<any>[] = [
  {
    id: CLAUDE_PROVIDER_ID,
    name: 'Anthropic Claude',
    implementation: claudeProvider,
    defaultConfig: {
      apiKey: '',
      model: 'claude-3-sonnet-20240229',
      maxTokens: 4096,
    } as ClaudeConfig,
    models: [
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'claude-3-haiku-20240307',
    ]
  },
  // Other providers (Gemini, OpenAI, Ollama) will be added here.
];

const providersById = new Map<string, AiProviderDefinition<any>>(
  providerDefinitions.map(p => [p.id, p])
);

// --- Public API ---

/**
 * Retrieves the full definition of an AI provider by its ID.
 */
export function getProviderDefinition(providerId: string): AiProviderDefinition<any> | undefined {
  return providersById.get(providerId);
}

/**
 * Returns a list of all available provider definitions.
 */
export function getAvailableProviders(): AiProviderDefinition<any>[] {
  return Array.from(providersById.values());
}

/**
 * Loads the configuration for a specific provider.
 * If no saved config exists, returns the provider's default config.
 */
export async function loadProviderConfig<T extends BaseProviderConfig>(providerId: string): Promise<T> {
  const definition = getProviderDefinition(providerId);
  if (!definition) {
    throw new Error(`Provider '${providerId}' not found.`);
  }

  const savedConfig = await loadEncryptedConfig<T>(providerId);
  return savedConfig || (definition.defaultConfig as T);
}

/**
 * Saves the configuration for a specific provider.
 */
export async function saveProviderConfig<T extends BaseProviderConfig>(
  providerId: string,
  config: T,
): Promise<void> {
  const definition = getProviderDefinition(providerId);
  if (!definition) {
    throw new Error(`Provider '${providerId}' not found.`);
  }
  
  // If the API key is a placeholder, load the existing key.
  if (config.apiKey === '__keep__') {
    const existing = await loadProviderConfig<T>(providerId);
    config.apiKey = existing.apiKey;
  }

  await saveEncryptedConfig(providerId, config);
}

/**
 * Deletes the configuration for a specific provider.
 */
export async function deleteProviderConfig(providerId: string): Promise<void> {
  await deleteEncryptedConfig(providerId);
}
