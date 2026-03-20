// server/src/services/ai/providers/gemini.ts

import {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai';
import type { ChatMessage, BaseProviderConfig, AiProvider } from '../types.js';
import { parseJsonFromAiResponse } from '../utils.js';

// --- Config ---

export interface GeminiConfig extends BaseProviderConfig {
  apiKey: string; // Required
  model: string;
  maxTokens: number;
}

export const GEMINI_PROVIDER_ID = 'gemini';

// --- Provider Implementation ---

function createClient(config: GeminiConfig): GoogleGenerativeAI {
  return new GoogleGenerativeAI(config.apiKey);
}

export const geminiProvider: AiProvider<GeminiConfig> = {
  async testConfig(config) {
    try {
      const client = createClient(config);
      const model = client.getGenerativeModel({ model: config.model || 'gemini-2.0-flash' });
      await model.generateContent('Hi');
      return { ok: true };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Invalid configuration' };
    }
  },

  async *streamChat(config, messages, systemPrompt) {
    const client = createClient(config);
    const model = client.getGenerativeModel({
      model: config.model,
      systemInstruction: systemPrompt,
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
      ],
    });

    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const lastMessage = messages[messages.length - 1];

    const stream = await model.generateContentStream({
      contents: [
        ...history,
        {
          role: 'user',
          parts: [{ text: lastMessage?.content || '' }],
        },
      ],
      generationConfig: {
        maxOutputTokens: config.maxTokens,
      },
    });

    for await (const chunk of stream.stream) {
      const text = chunk.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        yield text;
      }
    }
  },

  async analyzeTask(config, projectContext, taskTitle, existingDescription) {
    const client = createClient(config);
    const model = client.getGenerativeModel({
      model: config.model,
      systemInstruction: `You are a developer improving task descriptions. Project context: ${projectContext}

Respond ONLY with JSON: { "title": "concise action-oriented title", "description": "what needs to be done", "prompt": "technical details, files, approach" }
No markdown fences. Keep it concise.`,
    });

    const userMessage = existingDescription
      ? `Improve this task:
Title: ${taskTitle}
Description: ${existingDescription}

Return improved title, description, and technical prompt.`
      : `Analyze this task:
Title: ${taskTitle}

Return improved title, description, and technical prompt.`;

    try {
      const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        generationConfig: { maxOutputTokens: 1024 },
      });

      const text = response.response.text();
      const parsed = parseJsonFromAiResponse<{ title: string; description: string; prompt: string }>(text);
      return {
        title: parsed.title || taskTitle,
        description: parsed.description || '',
        prompt: parsed.prompt || '',
      };
    } catch (err: any) {
      // Gemini may reject some prompts due to safety filters
      return {
        title: taskTitle,
        description: `[Safety filter applied: ${err.message}]`,
        prompt: '',
      };
    }
  },

  async bulkOrganizeTasks(config, projectContext, rawText) {
    const client = createClient(config);
    const model = client.getGenerativeModel({
      model: config.model,
      systemInstruction: `You are a senior developer organizing tasks for a project. ${projectContext}

Parse the raw text below into structured tasks. The text may be a list (one per line), CSV, bullet points, or free-form notes.

For each task, generate:
- title: Clean, concise task title
- description: User-facing explanation of what needs to be done
- prompt: Technical analysis with implementation details, relevant files, possible approaches
- priority: "urgent", "high", "medium", or "low" (infer from context)
- status: "todo" (default), "in_progress", or "done" (if the text implies it's already resolved)

Respond ONLY with valid JSON array, no markdown fences. Example:
[{"title":"...","description":"...","prompt":"...","priority":"medium","status":"todo"}]`,
    });

    try {
      const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: rawText }] }],
        generationConfig: { maxOutputTokens: config.maxTokens },
      });

      const text = response.response.text();
      const parsed = parseJsonFromAiResponse<any[]>(text);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },

  async manageTasks(config, systemInstructions, rawText) {
    const client = createClient(config);
    const model = client.getGenerativeModel({
      model: config.model,
      systemInstruction: systemInstructions,
    });

    try {
      const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: rawText }] }],
        generationConfig: { maxOutputTokens: config.maxTokens },
      });

      const text = response.response.text();
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
    const model = client.getGenerativeModel({
      model: config.model,
      systemInstruction: 'Write a concise git commit message for this diff. Subject line under 72 chars. If multiple changes, add bullet points in body. Output ONLY the message, no quotes, no markdown fences, no explanation.',
    });

    try {
      const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: diff }] }],
        generationConfig: { maxOutputTokens: 256 },
      });

      return response.response.text().trim();
    } catch (err: any) {
      return `Diff too large or safety filter: ${err.message}`;
    }
  },
};
