import type { AgentResponse, AssistantMessageData } from '@studio/assistant';

// AssistantProxyHub.AttachmentNotFoundError. SignalR puts the hub's message at the end of the error message.
const ATTACHMENT_NOT_FOUND_ERROR = 'ATTACHMENT_NOT_FOUND';

export function isAttachmentNotFoundError(error: unknown): boolean {
  return error instanceof Error && error.message.includes(ATTACHMENT_NOT_FOUND_ERROR);
}

export type RejectionTexts = {
  heading: string;
  suggestionsLabel: string;
};

export function formatRejectionMessage(result: AgentResponse, texts: RejectionTexts): string {
  return formatRejectedEventMessage(
    { message: result.message, suggestions: result.parsed_intent?.suggestions },
    texts,
  );
}

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
