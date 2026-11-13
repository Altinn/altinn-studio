import type { AssistantMessageData } from '@designer/assistant';

export type RejectionTexts = {
  heading: string;
  suggestionsLabel: string;
};

export function formatRejectedEventMessage(
  data: { message?: string; suggestions?: string[] },
  texts: RejectionTexts,
): string {
  const parts: string[] = [texts.heading];
  if (data.message) parts.push(data.message);
  if (data.suggestions?.length) {
    parts.push(`${texts.suggestionsLabel}\n` + data.suggestions.join('\n'));
  }
  return parts.join('\n\n');
}

export function getAssistantMessageTimestamp(assistantMessage: AssistantMessageData): Date {
  return new Date(assistantMessage.timestamp || Date.now());
}
