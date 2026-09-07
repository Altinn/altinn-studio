import type { AgentResponse, AssistantMessageData, Message } from '@studio/assistant';
import { MessageAuthor } from '@studio/assistant';

export function decorateMessagesWithTraceIds(
  messages: Message[],
  traceIdsByMessageId: Record<string, string>,
): Message[] {
  return messages.map((message) => {
    if (message.role !== MessageAuthor.Assistant || !message.id) return message;
    const traceId = traceIdsByMessageId[message.id];
    return traceId ? { ...message, traceId } : message;
  });
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

export function getAssistantMessageContent(assistantMessage: AssistantMessageData): string {
  return assistantMessage.response || assistantMessage.message || assistantMessage.content || '';
}

export function getAssistantMessageTimestamp(assistantMessage: AssistantMessageData): Date {
  return new Date(assistantMessage.timestamp || Date.now());
}

export function shouldSkipBranchOps(assistantMessage: AssistantMessageData): boolean {
  return assistantMessage.mode === 'chat' || assistantMessage.no_branch_operations === true;
}
