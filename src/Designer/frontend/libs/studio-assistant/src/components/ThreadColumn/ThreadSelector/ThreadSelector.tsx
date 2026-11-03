import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, ReactElement, RefCallback } from 'react';
import cn from 'classnames';
import { StudioDeleteButton } from '@studio/components';
import type { ChatThread } from '../../../types/ChatThread';
import type { ThreadSelectorTexts } from '../../../types/AssistantTexts';
import type { WorkflowStatus } from '../../../types/WorkflowStatus';
import { findNearestRemainingThreadId } from '../../../utils/threadUtils';
import { findFocusTargetForKey } from './utils';
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
    const nextThreadId = findNearestRemainingThreadId(
      previousThreadIds,
      currentThreadIds,
      removedTarget.threadId,
    );
    if (nextThreadId) focusButton(buttonsRef.current, { threadId: nextThreadId, part: 'thread' });
    else onLastThreadDeleted?.();
  }, [chatThreads, onLastThreadDeleted]);

  // One stable callback for all buttons, so React calls it only when a button mounts or unmounts.
  const registerButton = useCallback((button: HTMLButtonElement | null) => {
    if (!button) return;
    const target = readFocusTarget(button);
    const buttonKey = toButtonKey(target);
    buttonsRef.current.set(buttonKey, button);
    return (): void => {
      buttonsRef.current.delete(buttonKey);
      // React calls this before it removes the button, so the button still has the focus here.
      if (button === document.activeElement) removedFocusTargetRef.current = target;
    };
  }, []);

  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, current: FocusTarget): void => {
    const target = findFocusTargetForKey(threadIds, current, event.key, canDelete);
    if (!target) return;
    // The list can scroll. Without this, a key at the end of the list scrolls the list.
    event.preventDefault();
    focusButton(buttonsRef.current, target);
  };

  const getButtonProps = (target: FocusTarget): ThreadButtonProps => ({
    ref: registerButton,
    'data-thread-id': target.threadId,
    'data-part': target.part,
    tabIndex: tabbableTarget && toButtonKey(tabbableTarget) === toButtonKey(target) ? 0 : -1,
    onFocus: () => setFocusTarget(target),
    onKeyDown: (event) => moveFocus(event, target),
  });

  return (
    <nav aria-labelledby={headingId}>
      <ul className={classes.list}>
        {chatThreads.map((thread) => (
          <ThreadItem
            key={thread.id}
            thread={thread}
            texts={texts}
            isSelected={thread.id === selectedThreadId}
            isBusy={workflowStatusByThread?.[thread.id]?.isActive === true}
            getButtonProps={(part) => getButtonProps({ threadId: thread.id, part })}
            onSelect={() => onSelectThread(thread.id)}
            onDelete={onDeleteThread && ((): void => onDeleteThread(thread.id))}
          />
        ))}
      </ul>
    </nav>
  );
}

type ThreadButtonProps = {
  ref: RefCallback<HTMLButtonElement>;
  'data-thread-id': string;
  'data-part': ThreadPart;
  tabIndex: number;
  onFocus: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLButtonElement>) => void;
};

function findDefaultTarget(
  threadIds: string[],
  selectedThreadId: string | undefined,
): FocusTarget | undefined {
  const threadId =
    selectedThreadId && threadIds.includes(selectedThreadId) ? selectedThreadId : threadIds[0];
  return threadId === undefined ? undefined : { threadId, part: 'thread' };
}

function readFocusTarget(button: HTMLButtonElement): FocusTarget {
  return {
    threadId: button.dataset.threadId ?? '',
    part: button.dataset.part === 'delete' ? 'delete' : 'thread',
  };
}

function toButtonKey({ threadId, part }: FocusTarget): string {
  return `${part}:${threadId}`;
}

function focusButton(buttons: Map<string, HTMLButtonElement>, target: FocusTarget): void {
  buttons.get(toButtonKey(target))?.focus();
}

type ThreadItemProps = {
  thread: ChatThread;
  texts: ThreadSelectorTexts;
  isSelected: boolean;
  isBusy: boolean;
  getButtonProps: (part: ThreadPart) => ThreadButtonProps;
  onSelect: () => void;
  onDelete?: () => void;
};

function ThreadItem({
  thread,
  texts,
  isSelected,
  isBusy,
  getButtonProps,
  onSelect,
  onDelete,
}: ThreadItemProps): ReactElement {
  const deleteLabel = `${texts.deleteThread} ${thread.title}`;

  return (
    <li className={cn(classes.item, { [classes.selected]: isSelected })}>
      <button
        type='button'
        {...getButtonProps('thread')}
        className={classes.threadButton}
        aria-current={isSelected ? 'true' : undefined}
        title={thread.title}
        onClick={onSelect}
      >
        <span className={classes.title}>{thread.title}</span>
      </button>
      {onDelete && (
        <StudioDeleteButton
          {...getButtonProps('delete')}
          variant='tertiary'
          data-size='sm'
          className={classes.deleteButton}
          aria-label={deleteLabel}
          title={deleteLabel}
          confirmMessage={isBusy ? texts.deleteBusyThreadConfirm : texts.deleteThreadConfirm}
          onDelete={onDelete}
        />
      )}
    </li>
  );
}
