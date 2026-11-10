import { afterEach, describe, expect, it, vi } from 'vitest';
import { ThreadColumn } from './ThreadColumn';
import { render, screen, within } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ThreadColumnProps } from './ThreadColumn';
import { mockTexts } from '../../mocks/mockTexts';
import { mockChatThreads } from '../../mocks/mockChatThreads';

// Test data
const onSelectThread = vi.fn();
const onToggleCollapse = vi.fn();
const onDeleteThread = vi.fn();

describe('ThreadColumn', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render the hide threads button', () => {
    renderThreadColumn();
    const hideThreadsButton = screen.getByRole('button', { name: mockTexts.hideThreads });

    expect(hideThreadsButton).toBeInTheDocument();
  });

  it('should render the new thread button', () => {
    renderThreadColumn();
    const newThreadButton = screen.getByRole('button', { name: mockTexts.newThread });

    expect(newThreadButton).toBeInTheDocument();
  });

  it('should render the previous threads heading', () => {
    renderThreadColumn();
    const heading = screen.getByRole('heading', { name: mockTexts.previousThreads });

    expect(heading).toBeInTheDocument();
  });

  it('should render the about assistant button', () => {
    renderThreadColumn();
    const aboutButton = screen.getByRole('button', {
      name: mockTexts.aboutAssistantDialog.heading,
    });

    expect(aboutButton).toBeInTheDocument();
  });

  it('should render all chat threads in the navigation named by the heading', () => {
    renderThreadColumn({ chatThreads: mockChatThreads });
    const navigation = screen.getByRole('navigation', { name: mockTexts.previousThreads });
    const thread1 = within(navigation).getByRole('button', { name: mockChatThreads[0].title });
    const thread2 = within(navigation).getByRole('button', { name: mockChatThreads[1].title });

    expect(thread1).toBeInTheDocument();
    expect(thread2).toBeInTheDocument();
  });

  it('should render no threads when chatThreads is empty', () => {
    renderThreadColumn({ chatThreads: [] });
    const navigation = screen.getByRole('navigation', { name: mockTexts.previousThreads });

    expect(within(navigation).queryAllByRole('listitem')).toHaveLength(0);
  });

  it('should move the focus to the new thread button when the last thread is deleted', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const [thread] = mockChatThreads;
    const { rerender } = renderThreadColumn({ chatThreads: [thread], onDeleteThread });

    const deleteLabel = `${mockTexts.threadSelector.deleteThread} ${thread.title}`;
    await user.click(screen.getByRole('button', { name: deleteLabel }));
    rerender(<ThreadColumn {...defaultProps} chatThreads={[]} onDeleteThread={onDeleteThread} />);

    expect(screen.getByRole('button', { name: mockTexts.newThread })).toHaveFocus();
  });
});

const defaultProps: ThreadColumnProps = {
  texts: mockTexts,
  chatThreads: [],
  onSelectThread,
  onToggleCollapse,
};

const renderThreadColumn = (props?: Partial<ThreadColumnProps>): RenderResult =>
  render(<ThreadColumn {...defaultProps} {...props} />);
