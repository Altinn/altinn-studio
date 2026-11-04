import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ReactElement } from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThreadSelector } from './ThreadSelector';
import type { ThreadSelectorProps } from './ThreadSelector';
import { threadSelectorTexts } from '../../../mocks/mockTexts';
import type { ChatThread } from '../../../types/ChatThread';

const threads: ChatThread[] = ['First thread', 'Second thread', 'Third thread'].map(
  (title, index) => ({ id: `thread-${index + 1}`, title, createdAt: '2026-01-01T00:00:00Z' }),
);
const [firstThread, secondThread, thirdThread] = threads;
const headingId = 'threads-heading';
const headingText = 'Threads';
const onSelectThread = vi.fn();
const onDeleteThread = vi.fn();
const onLastThreadDeleted = vi.fn();

describe('ThreadSelector', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the threads as a list in a navigation landmark named by the heading', () => {
    renderThreadSelector();
    const navigation = screen.getByRole('navigation', { name: headingText });
    expect(within(navigation).getAllByRole('listitem')).toHaveLength(threads.length);
  });

  it('marks only the open thread as current', () => {
    renderThreadSelector({ selectedThreadId: secondThread.id });
    expect(getThreadButton(secondThread)).toHaveAttribute('aria-current', 'true');
    expect(getThreadButton(firstThread)).not.toHaveAttribute('aria-current');
    expect(getThreadButton(thirdThread)).not.toHaveAttribute('aria-current');
  });

  it('opens the thread that the user clicks', async () => {
    const user = userEvent.setup();
    renderThreadSelector();
    await user.click(getThreadButton(secondThread));
    expect(onSelectThread).toHaveBeenCalledWith(secondThread.id);
  });

  it('opens the focused thread with Enter and Space, but not with the arrow keys', async () => {
    const user = userEvent.setup();
    renderThreadSelector();

    await user.tab();
    await user.keyboard('{ArrowDown}');
    expect(onSelectThread).not.toHaveBeenCalled();
    await user.keyboard('{Enter}');
    expect(onSelectThread).toHaveBeenLastCalledWith(secondThread.id);
    await user.keyboard('{ArrowDown}');
    await user.keyboard(' ');
    expect(onSelectThread).toHaveBeenLastCalledWith(thirdThread.id);
  });

  it('puts only the open thread in the tab order', () => {
    renderThreadSelector({ selectedThreadId: secondThread.id });
    threads.forEach((thread) => {
      expect(getThreadButton(thread)).toHaveAttribute(
        'tabindex',
        thread === secondThread ? '0' : '-1',
      );
      expect(getDeleteButton(thread)).toHaveAttribute('tabindex', '-1');
    });
  });

  it('puts the first thread in the tab order when no thread is open', () => {
    renderThreadSelector();
    expect(getThreadButton(firstThread)).toHaveAttribute('tabindex', '0');
    expect(getThreadButton(secondThread)).toHaveAttribute('tabindex', '-1');
  });

  it('moves the focus between the threads with the arrow keys, Home and End', async () => {
    const user = userEvent.setup();
    renderThreadSelector();

    await user.tab();
    expect(getThreadButton(firstThread)).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(getThreadButton(secondThread)).toHaveFocus();
    await user.keyboard('{End}');
    expect(getThreadButton(thirdThread)).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(getThreadButton(thirdThread)).toHaveFocus();
    await user.keyboard('{Home}');
    expect(getThreadButton(firstThread)).toHaveFocus();
    await user.keyboard('{ArrowUp}');
    expect(getThreadButton(firstThread)).toHaveFocus();
  });

  it('moves between a thread and its delete button with the right and left arrow keys', async () => {
    const user = userEvent.setup();
    renderThreadSelector();

    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(getDeleteButton(firstThread)).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    expect(getDeleteButton(firstThread)).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(getThreadButton(firstThread)).toHaveFocus();
  });

  it('moves from a delete button to the delete button of the next thread with the down arrow key', async () => {
    const user = userEvent.setup();
    renderThreadSelector();

    await user.tab();
    await user.keyboard('{ArrowRight}');
    await user.keyboard('{ArrowDown}');
    expect(getDeleteButton(secondThread)).toHaveFocus();
  });

  it('leaves the list with Tab from a thread and from a delete button', async () => {
    const user = userEvent.setup();
    renderThreadSelector();

    await user.tab();
    await user.tab();
    expect(document.body).toHaveFocus();
    await user.tab({ shift: true });
    expect(getThreadButton(firstThread)).toHaveFocus();
    await user.keyboard('{ArrowRight}');
    await user.tab();
    expect(document.body).toHaveFocus();
  });

  it('keeps the last focused button in the tab order', async () => {
    const user = userEvent.setup();
    renderThreadSelector();

    await user.tab();
    await user.keyboard('{ArrowDown}');
    await user.keyboard('{ArrowRight}');
    await user.tab();
    await user.tab({ shift: true });
    expect(getDeleteButton(secondThread)).toHaveFocus();
  });

  it('does not move to a delete button when the threads cannot be deleted', async () => {
    const user = userEvent.setup();
    renderThreadSelector({ onDeleteThread: undefined });

    await user.tab();
    await user.keyboard('{ArrowRight}');
    expect(getThreadButton(firstThread)).toHaveFocus();
  });

  it('stops the arrow keys from scrolling at the ends of the list', () => {
    renderThreadSelector();
    const isDefaultAllowed = fireEvent.keyDown(getThreadButton(thirdThread), { key: 'ArrowDown' });
    expect(isDefaultAllowed).toBe(false);
  });

  it('names each delete button with the title of its thread', () => {
    renderThreadSelector();
    threads.forEach((thread) =>
      expect(getDeleteButton(thread)).toHaveAccessibleName(
        `${threadSelectorTexts.deleteThread} ${thread.title}`,
      ),
    );
  });

  it('shows no delete buttons when the threads cannot be deleted', () => {
    renderThreadSelector({ onDeleteThread: undefined });
    expect(screen.queryByRole('button', { name: /deleteThread/ })).not.toBeInTheDocument();
  });

  it('does not delete the thread when the user cancels', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    renderThreadSelector();
    await user.click(getDeleteButton(secondThread));
    expect(onDeleteThread).not.toHaveBeenCalled();
  });

  it('deletes the thread when the user confirms', async () => {
    const user = userEvent.setup();
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderThreadSelector();
    await user.click(getDeleteButton(secondThread));
    expect(confirm).toHaveBeenCalledWith(threadSelectorTexts.deleteThreadConfirm);
    expect(onDeleteThread).toHaveBeenCalledWith(secondThread.id);
  });

  it('moves the focus to the next thread when the deleted thread disappears', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { rerender } = renderThreadSelector();

    await user.click(getDeleteButton(secondThread));
    rerender({ chatThreads: [firstThread, thirdThread] });

    expect(getThreadButton(thirdThread)).toHaveFocus();
  });

  it('moves the focus to the previous thread when the deleted thread was the last one', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { rerender } = renderThreadSelector();

    await user.click(getDeleteButton(thirdThread));
    rerender({ chatThreads: [firstThread, secondThread] });

    expect(getThreadButton(secondThread)).toHaveFocus();
  });

  it('calls onLastThreadDeleted when the deleted thread was the only one', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { rerender } = renderThreadSelector({ chatThreads: [firstThread] });

    await user.click(getDeleteButton(firstThread));
    rerender({ chatThreads: [] });

    expect(onLastThreadDeleted).toHaveBeenCalledTimes(1);
  });

  it('keeps the focus where the user moved it while the thread was being deleted', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { rerender } = renderThreadSelector();

    await user.click(getDeleteButton(secondThread));
    await user.click(getThreadButton(firstThread));
    rerender({ chatThreads: [firstThread, thirdThread] });

    expect(getThreadButton(firstThread)).toHaveFocus();
  });

  it('does not take the focus when the user clicked outside the list while the thread was being deleted', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { rerender } = renderThreadSelector();

    await user.click(getDeleteButton(secondThread));
    await user.click(document.body);
    rerender({ chatThreads: [firstThread, thirdThread] });

    expect(document.body).toHaveFocus();
  });

  it('keeps the focus on the delete button while the thread is still in the list', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { rerender } = renderThreadSelector();

    await user.click(getDeleteButton(secondThread));
    rerender({ chatThreads: threads });

    expect(getDeleteButton(secondThread)).toHaveFocus();
  });
});

const getThreadButton = (thread: ChatThread): HTMLElement =>
  screen.getByRole('button', { name: thread.title });

const getDeleteButton = (thread: ChatThread): HTMLElement =>
  screen.getByRole('button', { name: `${threadSelectorTexts.deleteThread} ${thread.title}` });

const defaultProps: ThreadSelectorProps = {
  texts: threadSelectorTexts,
  chatThreads: threads,
  headingId,
  onSelectThread,
  onDeleteThread,
  onLastThreadDeleted,
};

type RenderThreadSelectorResult = {
  rerender: (props: Partial<ThreadSelectorProps>) => void;
};

const renderThreadSelector = (
  props: Partial<ThreadSelectorProps> = {},
): RenderThreadSelectorResult => {
  const renderWithHeading = (givenProps: Partial<ThreadSelectorProps>): ReactElement => (
    <>
      <h2 id={headingId}>{headingText}</h2>
      <ThreadSelector {...defaultProps} {...props} {...givenProps} />
    </>
  );
  const { rerender } = render(renderWithHeading({}));
  return { rerender: (newProps) => rerender(renderWithHeading(newProps)) };
};
