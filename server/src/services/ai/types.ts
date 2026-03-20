// This file defines the common interfaces and types for all AI providers.

/** A message in a chat conversation. */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

/** Basic configuration required for any AI provider. */
export interface BaseProviderConfig {
  apiKey?: string; // Not all providers need a key (e.g., local Ollama)
  model?: string;
  maxTokens?: number;
}

/** Represents the capabilities and configuration of a registered AI provider. */
export interface AiProviderDefinition<T extends BaseProviderConfig> {
  /** Unique identifier for the provider (e.g., 'claude', 'openai', 'gemini'). */
  id: string;
  /** Human-readable name (e.g., 'Anthropic Claude', 'OpenAI'). */
  name: string;
  /** Implements the provider's functionality. */
  implementation: AiProvider<T>;
  /** Default configuration values. */
  defaultConfig: T;
  /** Supported models. */
  models: string[];
}

/** The core interface that every AI provider must implement. */
export interface AiProvider<T extends BaseProviderConfig> {
  /**
   * Tests the validity of the provided API key or configuration.
   */
  testConfig(config: T): Promise<{ ok: boolean; error?: string }>;

  /**
   * Streams a chat response.
   */
  streamChat(
    config: T,
    messages: ChatMessage[],
    systemPrompt: string,
  ): AsyncGenerator<string>;

  /**
   * Analyzes a task to improve its title, description, and technical prompt.
   */
  analyzeTask(
    config: T,
    projectContext: string,
    taskTitle: string,
    existingDescription?: string,
  ): Promise<{ title: string; description: string; prompt: string }>;

  /**
   * Parses unstructured text into a list of structured tasks.
   */
  bulkOrganizeTasks(
    config: T,
    projectContext: string,
    rawText: string,
  ): Promise<Array<{ title: string; description: string; prompt: string; priority: string; status: string }>>;

  /**
   * Analyzes user text to determine actions on existing tasks (create, update, skip).
   */
  manageTasks(
    config: T,
    systemInstructions: string,
    rawText: string,
  ): Promise<{ actions: any[]; summary: string }>;

  /**
   * Generates a Git commit message based on the provided diff.
   */
  generateCommitMessage(
    config: T,
    diff: string,
  ): Promise<string>;
}
