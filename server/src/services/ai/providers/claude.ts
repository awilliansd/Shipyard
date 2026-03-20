// server/src/services/ai/providers/claude.ts

import Anthropic from '@anthropic-ai/sdk';
import type { ChatMessage, BaseProviderConfig, AiProvider } from '../types.js';
import { parseJsonFromAiResponse } from '../utils.js';

// --- Config ---

export interface ClaudeConfig extends BaseProviderConfig {
  apiKey: string; // Claude requires an API key
  model: string;
  maxTokens: number;
}

export const CLAUDE_PROVIDER_ID = 'claude';

// Fast model for structured output tasks, mapped to a specific Claude model
const FAST_MODEL_NAME = 'claude-3-haiku-20240307';

// --- Provider Implementation ---

function createClient(config: ClaudeConfig, timeout?: number): Anthropic {
  return new Anthropic({ apiKey: config.apiKey, timeout: timeout ?? 120_000 });
}

export const claudeProvider: AiProvider<ClaudeConfig> = {
  async testConfig(config) {
    try {
      const client = new Anthropic({ apiKey: config.apiKey });
      await client.messages.create({
        model: 'claude-3-haiku-20240307', // Use a fast, cheap model for testing
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      });
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Invalid API key' };
    }
  },

  async *streamChat(config, messages, systemPrompt) {
    const client = createClient(config);

    const stream = client.messages.stream({
      model: config.model,
      max_tokens: config.maxTokens,
      system: systemPrompt,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
    }
  },

  async analyzeTask(config, projectContext, taskTitle, existingDescription) {
    const client = createClient(config, 20_000); // Short timeout for this task

    const userMessage = existingDescription
      ? `Improve this task:
Title: ${taskTitle}
Description: ${existingDescription}

Return improved title, description, and technical prompt.`
      : `Analyze this task:
Title: ${taskTitle}

Return improved title, description, and technical prompt.`;

    const response = await client.messages.create({
      model: FAST_MODEL_NAME,
      max_tokens: 1024,
      system: `You are a developer improving task descriptions. Project context: ${projectContext}

Respond ONLY with JSON: { "title": "concise action-oriented title", "description": "what needs to be done", "prompt": "technical details, files, approach" }
No markdown fences. Keep it concise.`,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    try {
      const parsed = parseJsonFromAiResponse<{ title: string; description: string; prompt: string }>(text);
      return {
        title: parsed.title || taskTitle,
        description: parsed.description || '',
        prompt: parsed.prompt || '',
      };
    } catch {
      // If parsing fails, return the raw text in the description
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

    const response = await client.messages.create({
      model: FAST_MODEL_NAME,
      max_tokens: config.maxTokens,
      system: systemPrompt,
      messages: [{ role: 'user', content: rawText }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '[]';
    try {
      const parsed = parseJsonFromAiResponse<any[]>(text);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  async manageTasks(config, systemInstructions, rawText) {
    const client = createClient(config);

    const response = await client.messages.create({
      model: FAST_MODEL_NAME,
      max_tokens: config.maxTokens,
      system: systemInstructions,
      messages: [{ role: 'user', content: rawText }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    try {
      const parsed = parseJsonFromAiResponse<{ actions: any[], summary: string }>(text);
      return {
        actions: Array.isArray(parsed.actions) ? parsed.actions : [],
        summary: parsed.summary || '',
      };
    } catch {
      return { actions: [], summary: 'Failed to parse AI response' };
    }
  },

  async generateCommitMessage(config, diff) {
    const client = createClient(config, 30_000); // 30s timeout

    const systemPrompt = 'Write a concise git commit message for this diff. Subject line under 72 chars. If multiple changes, add bullet points in body. Output ONLY the message, no quotes, no markdown fences, no explanation.';

    const response = await client.messages.create({
      model: FAST_MODEL_NAME,
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: 'user', content: diff }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    return text.trim();
  },
};
