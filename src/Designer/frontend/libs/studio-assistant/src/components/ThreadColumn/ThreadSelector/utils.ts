export function findThreadIdForKey(
  threadIds: string[],
  currentThreadId: string,
  key: string,
): string | undefined {
  const position = threadIds.indexOf(currentThreadId);
  switch (key) {
    case 'ArrowDown':
      return threadIds[position + 1];
    case 'ArrowUp':
      return threadIds[position - 1];
    case 'Home':
      return threadIds[0];
    case 'End':
      return threadIds.at(-1);
    default:
      return undefined;
  }
}

/**
 * Gives the threads that can get the focus after the user deletes a thread. The threads after the deleted thread are
 * first. The threads before it are next, in reverse order.
 */
export function orderThreadIdsByDistance(threadIds: string[], deletedThreadId: string): string[] {
  const position = threadIds.indexOf(deletedThreadId);
  return [...threadIds.slice(position + 1), ...threadIds.slice(0, position).reverse()];
}
