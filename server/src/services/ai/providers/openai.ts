// server/src/services/ai/providers/openai.ts

import OpenAI from 'openai';
import type { ChatMessage, BaseProviderConfig, AiProvider } from '../types.js';
import { parseJsonFromAiResponse } from '../utils.js';

// --- Config ---

export interface OpenAIConfig extends BaseProviderConfig {
  apiKey: string; // Required
  model: string;
  maxTokens: number;
  baseUrl?: string; // Optional, for Azure or other endpoints
}

export const OPENAI_PROVIDER_ID = 'openai';

// --- Provider Implementation ---

function createClient(config: OpenAIConfig): OpenAI {
  const options: ConstructorParameters<typeof OpenAI>[0] = {
    apiKey: config.apiKey,
    timeout: 120_000,
  };
  if (config.baseUrl) {
    options.baseURL = config.baseUrl;
  }
  return new OpenAI(options);
}

export const openaiProvider: AiProvider<OpenAIConfig> = {
  async testConfig(config) {
    try {
      const client = createClient(config);
      await client.chat.completions.create({
        model: config.model || 'gpt-4o',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Invalid configuration' };
    }
  },

  async *streamChat(config, messages, systemPrompt) {
    const client = createClient(config);

    const stream = await client.chat.completions.create({
      model: config.model,
      max_tokens: config.maxTokens,
      messages: [
        { role: 'user', content: systemPrompt },
        ...messages,
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      if (chunk.choices?.[0]?.delta?.content) {
        yield chunk.choices[0].delta.content;
      }
    }
  },

  async analyzeTask(config, projectContext, taskTitle, existingDescription) {
    const client = createClient(config);

    const userMessage = existingDescription
      ? `Improve this task:
Title: ${taskTitle}
Description: ${existingDescription}

Return improved title, description, and technical prompt.`
      : `Analyze this task:
Title: ${taskTitle}

Return improved title, description, and technical prompt.`;

    const response = await client.chat.completions.create({
      model: config.model,
      max_tokens: 1024,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: `You are a developer improving task descriptions. Project context: ${projectContext}\n\nRespond ONLY with JSON: { "title": "concise action-oriented title", "description": "what needs to be done", "prompt": "technical details, files, approach" }\nNo markdown fences. Keep it concise.\n\n${userMessage}`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content || '';
    try {
      const parsed = parseJsonFromAiResponse<{ title: string; description: string; prompt: string }>(text);
      return {
        title: parsed.title || taskTitle,
        description: parsed.description || '',
        prompt: parsed.prompt || '',
      };
    } catch {
      return { title: taskTitle, description: text.trim(), prompt: '' };
    }
  },

  async bulkOrganizeTasks(config, projectContext, rawText) {
    const client = createClient(config);

    const systemPrompt = `You are a senior developer organizing tasks for a project. ${projectContext}

Parse the raw text below into structured tasks. The text may be a list (one per line), CSV, bullet points, or free-form notes.

For each task, generate:
- title: Clean, concise task title
- description: User-facing explanation of what needs to be done
- prompt: Technical analysis with implementation details, relevant files, possible approaches
- priority: "urgent", "high", "medium", or "low" (infer from context)
- status: "todo" (default), "in_progress", or "done" (if the text implies it's already resolved)

Respond ONLY with valid JSON array, no markdown fences. Example:
[{"title":"...","description":"...","prompt":"...","priority":"medium","status":"todo"}]`;

    const response = await client.chat.completions.create({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: 0,
      messages: [
        { role: 'user', content: systemPrompt + '\n\n' + rawText },
      ],
    });

    const text = response.choices[0]?.message?.content || '[]';
    try {
      const parsed = parseJsonFromAiResponse<any[]>(text);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  async manageTasks(config, systemInstructions, rawText) {
    const client = createClient(config);

    const response = await client.chat.completions.create({
      model: config.model,
      max_tokens: config.maxTokens,
      temperature: 0,
      messages: [
        { role: 'user', content: systemInstructions + '\n\n' + rawText },
      ],
    });

    const text = response.choices[0]?.message?.content || '{}';
    try {
      const parsed = parseJsonFromAiResponse<{ actions: any[], summary: string }>(text);
      return {
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
        summary: parsed.summary || '',
      };
    } catch {
      return { actions: [], summary: 'Failed to parse response' };
    }
  },

  async generateCommitMessage(config, diff) {
    const client = createClient(config);

    const systemPrompt = 'Write a concise git commit message for this diff. Subject line under 72 chars. If multiple changes, add bullet points in body. Output ONLY the message, no quotes, no markdown fences, no explanation.';

    const response = await client.chat.completions.create({
      model: config.model,
      max_tokens: 256,
      messages: [
        { role: 'user', content: systemPrompt + '\n\n' + diff },
      ],
    });

    const text = response.choices[0]?.message?.content || '';
    return text.trim();
  },
};

