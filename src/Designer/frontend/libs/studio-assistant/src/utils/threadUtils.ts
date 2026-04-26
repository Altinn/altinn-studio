import type { ChatThread } from '../types/ChatThread';

export function createNewChatThread(title: string): ChatThread {
  return {
    id: crypto.randomUUID(),
    title,
    messages: [],
  };
}

export function findThreadById(
  chatThreads: ChatThread[],
  threadId: string,
): ChatThread | undefined {
  return chatThreads.find((t) => t.id === threadId);
}
