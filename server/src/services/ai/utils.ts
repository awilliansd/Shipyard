// server/src/services/ai/utils.ts

/**
 * Robustly extracts and parses a JSON object or array from a string,
 * which may be an AI model's imperfect output.
 * Handles markdown fences, leading/trailing text, and some common JSON errors.
 */
export function parseJsonFromAiResponse<T = any>(text: string): T {
  const trimmed = text.trim();
  try { return JSON.parse(trimmed) as T; } catch {}

  // Strip markdown fences
  const fenceStripped = trimmed.replace(/^```(?:json)?\s*
?/gim, '').replace(/
?```\s*$/gim, '').trim();
  try { return JSON.parse(fenceStripped) as T; } catch {}

  // Extract from code fences
  const fenceMatch = trimmed.match(/```(?:json)?\s*
([\s\S]*?)
\s*```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()) as T; } catch {}
  }

  // Find first { or [ and match to last } or ] (greedy extraction)
  for (let i = 0; i < trimmed.length; i++) {
    if (trimmed[i] === '{' || trimmed[i] === '[') {
      const closingChar = trimmed[i] === '{' ? '}' : ']';
      const lastClose = trimmed.lastIndexOf(closingChar);
      if (lastClose > i) {
        try { return JSON.parse(trimmed.substring(i, lastClose + 1)) as T; } catch {}
      }
    }
  }

  // Try bracket-depth extraction + fix common issues (trailing commas, unquoted keys)
  const jsonCandidate = extractBracketedJson(trimmed);
  if (jsonCandidate) {
    const fixed = jsonCandidate
      // Fix trailing commas
      .replace(/,\s*([}\]])/g, '$1')
      // Fix unquoted keys (simple cases)
      .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');
    try { return JSON.parse(fixed) as T; } catch {}
  }

  const snippet = trimmed.length > 200 ? trimmed.substring(0, 200) + '...' : trimmed;
  throw new Error(`Could not parse JSON from AI response. Response starts with: ${snippet}`);
}

/**
 * Extracts the outermost `{ ... }` or `[ ... ]` from a string using
 * bracket depth counting, correctly handling nested structures and strings.
 */
function extractBracketedJson(text: string): string | null {
  let start = -1;
  let openChar = '';
  let closeChar = '';
  let depth = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (start === -1) {
      if (ch === '{' || ch === '[') {
        start = i;
        openChar = ch;
        closeChar = ch === '{' ? '}' : ']';
        depth = 1;
      }
      continue;
    }

    // Naively skip characters inside strings
    if (ch === '"') {
      i++;
      while (i < text.length && text[i] !== '"') {
        // Handle escaped quotes
        if (text[i] === '') {
          i++;
        }
        i++;
      }
      continue;
    }

    if (ch === openChar) depth++;
    else if (ch === closeChar) {
      depth--;
      if (depth === 0) {
        return text.substring(start, i + 1);
      }
    }
  }
  return null; // Unbalanced brackets
}
