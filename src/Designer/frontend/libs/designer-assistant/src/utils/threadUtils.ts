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
 * Gives the thread that takes the place of a removed thread: the nearest remaining thread after it, or else the
 * nearest remaining thread before it.
 */
export function findNearestRemainingThreadId(
  previousThreadIds: string[],
  currentThreadIds: string[],
  removedThreadId: string,
): string | undefined {
  const position = previousThreadIds.indexOf(removedThreadId);
  if (position === -1) return undefined;
  const candidates = [
    ...previousThreadIds.slice(position + 1),
    ...previousThreadIds.slice(0, position).reverse(),
  ];
  return candidates.find((threadId) => currentThreadIds.includes(threadId));
}
