export type ThreadPart = 'thread' | 'delete';

export type FocusTarget = {
  threadId: string;
  part: ThreadPart;
};

const navigationKeys = ['ArrowDown', 'ArrowUp', 'Home', 'End', 'ArrowRight', 'ArrowLeft'];

export function isNavigationKey(key: string): boolean {
  return navigationKeys.includes(key);
}

/**
 * Gives the button that a navigation key moves the focus to. The up and down keys keep the part of the row, and the
 * right and left keys move between the thread and its delete button.
 */
export function findFocusTargetForKey(
  threadIds: string[],
  current: FocusTarget,
  key: string,
  canDelete: boolean,
): FocusTarget | undefined {
  const position = threadIds.indexOf(current.threadId);
  const inSamePart = (threadId: string | undefined): FocusTarget | undefined =>
    threadId === undefined ? undefined : { threadId, part: current.part };
  switch (key) {
    case 'ArrowDown':
      return inSamePart(threadIds[position + 1]);
    case 'ArrowUp':
      return inSamePart(threadIds[position - 1]);
    case 'Home':
      return inSamePart(threadIds[0]);
    case 'End':
      return inSamePart(threadIds.at(-1));
    case 'ArrowRight':
      return canDelete && current.part === 'thread' ? { ...current, part: 'delete' } : undefined;
    case 'ArrowLeft':
      return current.part === 'delete' ? { ...current, part: 'thread' } : undefined;
    default:
      return undefined;
  }
}
