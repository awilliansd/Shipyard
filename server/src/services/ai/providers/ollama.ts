// server/src/services/ai/providers/ollama.ts

import type { ChatMessage, BaseProviderConfig, AiProvider } from '../types.js';
import { parseJsonFromAiResponse } from '../utils.js';

// --- Config ---

export interface OllamaConfig extends BaseProviderConfig {
  baseUrl: string; // e.g., http://localhost:11434
  model: string; // User can type any model name (no validation at config level)
  maxTokens: number;
}

export const OLLAMA_PROVIDER_ID = 'ollama';

// --- Provider Implementation ---

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

export const ollamaProvider: AiProvider<OllamaConfig> = {
  async testConfig(config) {
    try {
      const response = await fetchWithTimeout(`${config.baseUrl}/api/tags`, { method: 'GET' }, 5000);
      if (!response.ok) {
        return { ok: false, error: `Ollama server returned ${response.status}` };
      }
      const data = (await response.json()) as any;
      const models = data?.models || [];
      return {
        ok: true,
        // Optional: could also check if config.model is in the list
      };
    } catch (err: any) {
      return {
        ok: false,
        error: `Ollama não está disponível em ${config.baseUrl}. Certifique-se que Ollama está rodando.`,
      };
    }
  },

  async *streamChat(config, messages, systemPrompt) {
    if (!config.model || !config.model.trim()) {
      throw new Error('Selecione um modelo Ollama antes de usar');
    }

    const url = `${config.baseUrl}/api/chat`;

    // Convert system prompt to first message if needed
    const allMessages = [
      { role: 'user' as const, content: systemPrompt },
      ...messages,
    ];

    const response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          messages: allMessages,
          stream: true,
        }),
      },
      120_000
    );

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const parsed = JSON.parse(line);
            if (parsed.message?.content) {
              yield parsed.message.content;
            }
          } catch {
            // Skip invalid JSON lines
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  },

  async analyzeTask(config, projectContext, taskTitle, existingDescription) {
    if (!config.model || !config.model.trim()) {
      throw new Error('Selecione um modelo Ollama antes de usar');
    }

    const systemPrompt = `You are a developer improving task descriptions. Project context: ${projectContext}

Respond ONLY with JSON: { "title": "concise action-oriented title", "description": "what needs to be done", "prompt": "technical details, files, approach" }
No markdown fences. Keep it concise.`;

    const userMessage = existingDescription
      ? `Improve this task:
Title: ${taskTitle}
Description: ${existingDescription}

Return improved title, description, and technical prompt.`
      : `Analyze this task:
Title: ${taskTitle}

Return improved title, description, and technical prompt.`;

    const url = `${config.baseUrl}/api/chat`;

    const response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'user', content: systemPrompt },
            { role: 'user', content: userMessage },
          ],
          stream: false,
        }),
      },
      30_000
    );

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = (await response.json()) as any;
    const text = data?.message?.content || '';

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
    if (!config.model || !config.model.trim()) {
      throw new Error('Selecione um modelo Ollama antes de usar');
    }

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

    const url = `${config.baseUrl}/api/chat`;

    const response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'user', content: systemPrompt },
            { role: 'user', content: rawText },
          ],
          stream: false,
        }),
      },
      120_000
    );

    if (!response.ok) {
      return [];
    }

    const data = (await response.json()) as any;
    const text = data?.message?.content || '[]';

    try {
      const parsed = parseJsonFromAiResponse<any[]>(text);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  async manageTasks(config, systemInstructions, rawText) {
    if (!config.model || !config.model.trim()) {
      throw new Error('Selecione um modelo Ollama antes de usar');
    }

    const url = `${config.baseUrl}/api/chat`;

    const response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'user', content: systemInstructions },
            { role: 'user', content: rawText },
          ],
          stream: false,
        }),
      },
      120_000
    );

    if (!response.ok) {
      return { actions: [], summary: 'Ollama error' };
    }

    const data = (await response.json()) as any;
    const text = data?.message?.content || '{}';

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
    if (!config.model || !config.model.trim()) {
      throw new Error('Selecione um modelo Ollama antes de usar');
    }

    const systemPrompt = 'Write a concise git commit message for this diff. Subject line under 72 chars. If multiple changes, add bullet points in body. Output ONLY the message, no quotes, no markdown fences, no explanation.';

    const url = `${config.baseUrl}/api/chat`;

    const response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'user', content: systemPrompt },
            { role: 'user', content: diff },
          ],
          stream: false,
        }),
      },
      30_000
    );

    if (!response.ok) {
      return `[Error: ${response.status}]`;
    }

    const data = (await response.json()) as any;
    return (data?.message?.content || '').trim();
  },
};
