import type { ChatThread } from '../types/ChatThread';

export function createNewChatThread(title: string): ChatThread {
  return {
    id: crypto.randomUUID(),
    title,
    createdAt: new Date().toISOString(),
  };
}

export function findThreadById(
  chatThreads: ChatThread[],
  threadId: string,
): ChatThread | undefined {
  return chatThreads.find((t) => t.id === threadId);
}
