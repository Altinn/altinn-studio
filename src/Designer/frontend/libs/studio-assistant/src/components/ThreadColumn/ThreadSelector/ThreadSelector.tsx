import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactElement, RefCallback } from 'react';
import cn from 'classnames';
import { StudioDeleteButton } from '@studio/components';
import type { ChatThread } from '../../../types/ChatThread';
import type { ThreadSelectorTexts } from '../../../types/AssistantTexts';
import type { WorkflowStatus } from '../../../types/WorkflowStatus';
import { findThreadIdForKey, orderThreadIdsByDistance } from './utils';
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
  const [focusedThreadId, setFocusedThreadId] = useState<string>();
  const threadButtonsRef = useRef(new Map<string, HTMLButtonElement>());
  const deletionRef = useRef<Deletion>(undefined);

  const threadIds = chatThreads.map((thread) => thread.id);
  // All threads have one Tab stop. The user moves between the threads with the arrow keys.
  const tabbableThreadId =
    [focusedThreadId, selectedThreadId].find((id) => id && threadIds.includes(id)) ?? threadIds[0];

  // The list removes the thread when the list loads again. This is after the user confirms the deletion.
  useEffect(() => {
    const deletion = deletionRef.current;
    if (!deletion || chatThreads.some((thread) => thread.id === deletion.threadId)) return;
    deletionRef.current = undefined;
    if (!isFocusLost()) return;
    const threadButtons = threadButtonsRef.current;
    const nextThreadId = deletion.nextThreadIds.find((threadId) => threadButtons.has(threadId));
    if (nextThreadId) threadButtons.get(nextThreadId)?.focus();
    else onLastThreadDeleted?.();
  }, [chatThreads, onLastThreadDeleted]);

  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, threadId: string): void => {
    const targetThreadId = findThreadIdForKey(threadIds, threadId, event.key);
    if (!targetThreadId) return;
    event.preventDefault();
    threadButtonsRef.current.get(targetThreadId)?.focus();
  };

  const deleteThread = (threadId: string): void => {
    deletionRef.current = {
      threadId,
      nextThreadIds: orderThreadIdsByDistance(threadIds, threadId),
    };
    onDeleteThread?.(threadId);
  };

  const createThreadButtonRef =
    (threadId: string): RefCallback<HTMLButtonElement> =>
    (button) => {
      if (!button) return;
      threadButtonsRef.current.set(threadId, button);
      return () => {
        threadButtonsRef.current.delete(threadId);
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
            isTabbable={thread.id === tabbableThreadId}
            isBusy={workflowStatusByThread?.[thread.id]?.isActive === true}
            threadButtonRef={createThreadButtonRef(thread.id)}
            onSelect={() => onSelectThread(thread.id)}
            onDelete={onDeleteThread && ((): void => deleteThread(thread.id))}
            onFocus={() => setFocusedThreadId(thread.id)}
            onKeyDown={(event) => moveFocus(event, thread.id)}
          />
        ))}
      </ul>
    </nav>
  );
}

type Deletion = {
  threadId: string;
  nextThreadIds: string[];
};

function isFocusLost(): boolean {
  return !document.activeElement || document.activeElement === document.body;
}

type ThreadItemProps = {
  thread: ChatThread;
  texts: ThreadSelectorTexts;
  isSelected: boolean;
  isTabbable: boolean;
  isBusy: boolean;
  threadButtonRef: RefCallback<HTMLButtonElement>;
  onSelect: () => void;
  onDelete?: () => void;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
};

function ThreadItem({
  thread,
  texts,
  isSelected,
  isTabbable,
  isBusy,
  threadButtonRef,
  onSelect,
  onDelete,
  onFocus,
  onKeyDown,
}: ThreadItemProps): ReactElement {
  const tabIndex = isTabbable ? 0 : -1;
  const deleteLabel = `${texts.deleteThread} ${thread.title}`;

  return (
    <li className={cn(classes.item, { [classes.selected]: isSelected })}>
      <button
        type='button'
        ref={threadButtonRef}
        className={classes.threadButton}
        tabIndex={tabIndex}
        aria-current={isSelected ? 'true' : undefined}
        title={thread.title}
        onClick={onSelect}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
      >
        <span className={classes.title}>{thread.title}</span>
      </button>
      {onDelete && (
        <StudioDeleteButton
          variant='tertiary'
          data-size='sm'
          className={classes.deleteButton}
          tabIndex={tabIndex}
          aria-label={deleteLabel}
          title={deleteLabel}
          confirmMessage={isBusy ? texts.deleteBusyThreadConfirm : texts.deleteThreadConfirm}
          onDelete={onDelete}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
        />
      )}
    </li>
  );
}
