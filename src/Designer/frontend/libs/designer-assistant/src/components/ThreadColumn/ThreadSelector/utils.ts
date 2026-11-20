export type ThreadPart = 'thread' | 'delete';

export type FocusTarget = {
  threadId: string;
  part: ThreadPart;
};

/**
 * Gives the button that a navigation key moves the focus to. Gives the current button when the key cannot move the
 * focus, and undefined when the key does not navigate. The up and down keys keep the part of the row, and the right
 * and left keys move between the thread and its delete button.
 */
export function findFocusTargetForKey(
  threadIds: string[],
  current: FocusTarget,
  key: string,
  canDelete: boolean,
): FocusTarget | undefined {
  const position = threadIds.indexOf(current.threadId);
  const inSamePart = (threadId: string | undefined): FocusTarget =>
    threadId === undefined ? current : { threadId, part: current.part };
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
      return canDelete ? { ...current, part: 'delete' } : current;
    case 'ArrowLeft':
      return { ...current, part: 'thread' };
    default:
      return undefined;
  }
}
