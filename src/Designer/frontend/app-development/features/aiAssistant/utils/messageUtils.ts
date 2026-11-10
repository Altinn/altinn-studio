import type { AgentResponse, AssistantMessageData } from '@studio/assistant';

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

export function shouldSkipBranchOps(assistantMessage: AssistantMessageData): boolean {
  return assistantMessage.mode === 'chat' || assistantMessage.no_branch_operations === true;
}
