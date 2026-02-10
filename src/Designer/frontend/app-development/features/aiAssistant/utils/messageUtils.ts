import type { AgentResponse, AssistantMessageData } from '@studio/assistant';
import { ErrorMessages } from '@studio/assistant';

// To do: Improve message formatting code.

export function formatRejectionMessage(result: AgentResponse): string {
  const suggestions = result.parsed_intent?.suggestions
    ? 'Suggestions:\n' + result.parsed_intent.suggestions.join('\n')
    : '';

  return `${ErrorMessages.REQUEST_REJECTED}\n\n${result.message}\n\n${suggestions}`;
}

export function formatErrorMessage(error: unknown): string {
  const errorMessage = error instanceof Error ? error.message : ErrorMessages.UNKNOWN_ERROR;
  return `${ErrorMessages.REQUEST_FAILED}\n\n${errorMessage}`;
}

export function parseBackendErrorContent(error: Error): string {
  let errorContent = formatErrorMessage(error);

  try {
    const responseBody = JSON.parse(error.message);
    if (responseBody.detail) {
      const detail = responseBody.detail;
      if (typeof detail === 'string') {
        const colonIndex = detail.indexOf(': ');
        if (colonIndex !== -1) {
          const jsonPart = detail.substring(colonIndex + 2);
          const messageMatch = jsonPart.match(/'message':\s*'([^']*)'/);

          if (messageMatch) {
            errorContent = `${ErrorMessages.REQUEST_REJECTED}\n\n${messageMatch[1]}`;
            const suggestions = parseSuggestions(jsonPart);
            if (suggestions.length > 0) {
              errorContent += `\n\n**Suggestions:**\n${suggestions
                .map((suggestion) => `• ${suggestion}`)
                .join('\n')}`;
            }
          } else {
            errorContent = `${ErrorMessages.REQUEST_REJECTED}\n\n${detail}`;
          }
        }
      }
    }
  } catch (parseError) {
    console.warn('Failed to parse error response:', parseError);
  }

  return errorContent;
}

export function getAssistantMessageContent(assistantMessage: AssistantMessageData): string {
  return assistantMessage.response || assistantMessage.message || assistantMessage.content || '';
}

export function getAssistantMessageTimestamp(assistantMessage: AssistantMessageData): Date {
  return new Date(assistantMessage.timestamp || Date.now());
}

export function shouldSkipBranchOps(assistantMessage: AssistantMessageData): boolean {
  return assistantMessage.mode === 'chat' || assistantMessage.no_branch_operations === true;
}

function parseSuggestions(jsonPart: string): string[] {
  const suggestionsStart = jsonPart.indexOf("'suggestions':");
  if (suggestionsStart === -1) return [];

  const arrayStart = jsonPart.indexOf('[', suggestionsStart);
  const arrayEnd = jsonPart.lastIndexOf(']');
  if (arrayStart === -1 || arrayEnd === -1 || arrayEnd <= arrayStart) return [];

  const arrayContent = jsonPart.substring(arrayStart + 1, arrayEnd);
  const suggestions: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';

  for (let i = 0; i < arrayContent.length; i++) {
    const char = arrayContent[i];

    if (!inQuotes && (char === "'" || char === '"')) {
      inQuotes = true;
      quoteChar = char;
    } else if (inQuotes && char === quoteChar && arrayContent[i - 1] !== '\\') {
      inQuotes = false;
      quoteChar = '';
    } else if (!inQuotes && char === ',') {
      const normalized = normalizeSuggestion(current);
      if (normalized) {
        suggestions.push(normalized);
      }
      current = '';
      continue;
    }

    if (inQuotes || (char !== "'" && char !== '"')) {
      current += char;
    }
  }

  const lastSuggestion = normalizeSuggestion(current);
  if (lastSuggestion) {
    suggestions.push(lastSuggestion);
  }

  return suggestions;
}

function normalizeSuggestion(raw: string): string {
  const normalized = raw
    .trim()
    .replace(/^['"]|['"]$/g, '')
    .replace(/\\(['"])/g, '$1');
  return normalized ? normalized : '';
}
