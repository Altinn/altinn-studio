import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactElement, RefCallback } from 'react';
import cn from 'classnames';
import { StudioDeleteButton } from '@studio/components';
import type { ChatThread } from '../../../types/ChatThread';
import type { ThreadSelectorTexts } from '../../../types/AssistantTexts';
import type { WorkflowStatus } from '../../../types/WorkflowStatus';
import { orderThreadIdsByDistance } from '../../../utils/threadUtils';
import { findFocusTargetForKey, isNavigationKey } from './utils';
import type { FocusTarget, ThreadPart } from './utils';
import classes from './ThreadSelector.module.css';

export type ThreadSelectorProps = {
  texts: ThreadSelectorTexts;
  chatThreads: ChatThread[];
  selectedThreadId?: string;
  workflowStatusByThread?: Record<string, WorkflowStatus>;
  headingId: string;
  onSelectThread: (threadId: string) => void;
  onDeleteThread?: (threadId: string) => void;
  onLastThreadDeleted?: () => void;
};

export function ThreadSelector({
  texts,
  chatThreads,
  selectedThreadId,
  workflowStatusByThread,
  headingId,
  onSelectThread,
  onDeleteThread,
  onLastThreadDeleted,
}: ThreadSelectorProps): ReactElement {
  const [focusTarget, setFocusTarget] = useState<FocusTarget>();
  const buttonsRef = useRef(new Map<string, HTMLButtonElement>());
  const removedFocusTargetRef = useRef<FocusTarget>(undefined);
  const previousThreadIdsRef = useRef<string[]>([]);

  const canDelete = onDeleteThread !== undefined;
  const threadIds = chatThreads.map((thread) => thread.id);
  const isAvailable = (target: FocusTarget | undefined): boolean =>
    !!target && threadIds.includes(target.threadId) && (target.part === 'thread' || canDelete);
  // The list has one Tab stop. The user moves in the list with the arrow keys.
  const tabbableTarget: FocusTarget | undefined = isAvailable(focusTarget)
    ? focusTarget
    : findDefaultTarget(threadIds, selectedThreadId);

  // When the list removes the row that has the focus, the focus goes to the nearest thread that remains.
  useEffect(() => {
    const currentThreadIds = chatThreads.map((thread) => thread.id);
    const previousThreadIds = previousThreadIdsRef.current;
    previousThreadIdsRef.current = currentThreadIds;
    const removedTarget = removedFocusTargetRef.current;
    removedFocusTargetRef.current = undefined;
    if (!removedTarget || currentThreadIds.includes(removedTarget.threadId)) return;
    const nextThreadId = orderThreadIdsByDistance(previousThreadIds, removedTarget.threadId).find(
      (threadId) => currentThreadIds.includes(threadId),
    );
    if (nextThreadId) buttonsRef.current.get(toButtonKey(nextThreadId, 'thread'))?.focus();
    else onLastThreadDeleted?.();
  }, [chatThreads, onLastThreadDeleted]);

  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, current: FocusTarget): void => {
    if (!isNavigationKey(event.key)) return;
    // The list can scroll. Without this, a key at the end of the list scrolls the list.
    event.preventDefault();
    const target = findFocusTargetForKey(threadIds, current, event.key, canDelete);
    if (target) buttonsRef.current.get(toButtonKey(target.threadId, target.part))?.focus();
  };

  const createButtonRef =
    (target: FocusTarget): RefCallback<HTMLButtonElement> =>
    (button) => {
      if (!button) return;
      const buttonKey = toButtonKey(target.threadId, target.part);
      buttonsRef.current.set(buttonKey, button);
      if (removedFocusTargetRef.current?.threadId === target.threadId) {
        removedFocusTargetRef.current = undefined;
      }
      return () => {
        buttonsRef.current.delete(buttonKey);
        // React calls this before it removes the button, so the button still has the focus here.
        if (button === document.activeElement) removedFocusTargetRef.current = target;
      };
    };

  return (
    <nav aria-labelledby={headingId}>
      <ul className={classes.list}>
        {chatThreads.map((thread) => (
          <ThreadItem
            key={thread.id}
            thread={thread}
            texts={texts}
            isSelected={thread.id === selectedThreadId}
            tabbablePart={tabbableTarget?.threadId === thread.id ? tabbableTarget.part : undefined}
            isBusy={workflowStatusByThread?.[thread.id]?.isActive === true}
            createButtonRef={(part) => createButtonRef({ threadId: thread.id, part })}
            onSelect={() => onSelectThread(thread.id)}
            onDelete={onDeleteThread && ((): void => onDeleteThread(thread.id))}
            onFocus={(part) => setFocusTarget({ threadId: thread.id, part })}
            onKeyDown={(event, part) => moveFocus(event, { threadId: thread.id, part })}
          />
        ))}
      </ul>
    </nav>
  );
}

function findDefaultTarget(
  threadIds: string[],
  selectedThreadId: string | undefined,
): FocusTarget | undefined {
  const threadId =
    selectedThreadId && threadIds.includes(selectedThreadId) ? selectedThreadId : threadIds[0];
  return threadId === undefined ? undefined : { threadId, part: 'thread' };
}

function toButtonKey(threadId: string, part: ThreadPart): string {
  return `${part}:${threadId}`;
}

type ThreadItemProps = {
  thread: ChatThread;
  texts: ThreadSelectorTexts;
  isSelected: boolean;
  tabbablePart?: ThreadPart;
  isBusy: boolean;
  createButtonRef: (part: ThreadPart) => RefCallback<HTMLButtonElement>;
  onSelect: () => void;
  onDelete?: () => void;
  onFocus: (part: ThreadPart) => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>, part: ThreadPart) => void;
};

function ThreadItem({
  thread,
  texts,
  isSelected,
  tabbablePart,
  isBusy,
  createButtonRef,
  onSelect,
  onDelete,
  onFocus,
  onKeyDown,
}: ThreadItemProps): ReactElement {
  const tabIndexOf = (part: ThreadPart): number => (part === tabbablePart ? 0 : -1);
  const deleteLabel = `${texts.deleteThread} ${thread.title}`;

  return (
    <li className={cn(classes.item, { [classes.selected]: isSelected })}>
      <button
        type='button'
        ref={createButtonRef('thread')}
        className={classes.threadButton}
        tabIndex={tabIndexOf('thread')}
        aria-current={isSelected ? 'true' : undefined}
        title={thread.title}
        onClick={onSelect}
        onFocus={() => onFocus('thread')}
        onKeyDown={(event) => onKeyDown(event, 'thread')}
      >
        <span className={classes.title}>{thread.title}</span>
      </button>
      {onDelete && (
        <StudioDeleteButton
          ref={createButtonRef('delete')}
          variant='tertiary'
          data-size='sm'
          className={classes.deleteButton}
          tabIndex={tabIndexOf('delete')}
          aria-label={deleteLabel}
          title={deleteLabel}
          confirmMessage={isBusy ? texts.deleteBusyThreadConfirm : texts.deleteThreadConfirm}
          onDelete={onDelete}
          onFocus={() => onFocus('delete')}
          onKeyDown={(event) => onKeyDown(event, 'delete')}
        />
      )}
    </li>
  );
}
