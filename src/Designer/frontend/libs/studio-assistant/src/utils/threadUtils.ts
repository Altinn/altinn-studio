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

/**
 * Gives the threads that can take the place of a removed thread. The threads after the removed thread are first. The
 * threads before it are next, in reverse order.
 */
export function orderThreadIdsByDistance(threadIds: string[], removedThreadId: string): string[] {
  const position = threadIds.indexOf(removedThreadId);
  if (position === -1) return [];
  return [...threadIds.slice(position + 1), ...threadIds.slice(0, position).reverse()];
}
