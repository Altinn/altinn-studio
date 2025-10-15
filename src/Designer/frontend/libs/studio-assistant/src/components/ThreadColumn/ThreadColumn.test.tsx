import React from 'react';
import { ThreadColumn } from './ThreadColumn';
import { render, screen } from '@testing-library/react';
import type { ChatHistorySidebarProps } from './ThreadColumn';
import { mockTexts } from '../../mocks/mockTexts';
import type { ChatThread } from '../../types/ChatThread';

// Test data
const onSelectThread = jest.fn();
const onToggleCollapse = jest.fn();

const mockChatThreads: ChatThread[] = [
  {
    id: '1',
    title: 'Thread 1',
    messages: [],
  },
  {
    id: '2',
    title: 'Thread 2',
    messages: [],
  },
  {
    id: '3',
    title: 'Thread 3',
    messages: [],
  },
];

describe('ThreadColumn', () => {
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
    const aboutButton = screen.getByRole('button', { name: mockTexts.aboutAssistant });

    expect(aboutButton).toBeInTheDocument();
  });

  it('should render all chat threads', () => {
    renderThreadColumn({ chatThreads: mockChatThreads });
    const thread1 = screen.getByRole('tab', { name: 'Thread 1' });
    const thread2 = screen.getByRole('tab', { name: 'Thread 2' });
    const thread3 = screen.getByRole('tab', { name: 'Thread 3' });

    expect(thread1).toBeInTheDocument();
    expect(thread2).toBeInTheDocument();
    expect(thread3).toBeInTheDocument();
  });

  it('should render no threads when chatThreads is empty', () => {
    renderThreadColumn({ chatThreads: [] });
    const tabs = screen.queryAllByRole('tab');

    expect(tabs).toHaveLength(0);
  });
});

const defaultProps: ChatHistorySidebarProps = {
  texts: mockTexts,
  chatThreads: [],
  onSelectThread,
  onToggleCollapse,
};

const renderThreadColumn = (props?: Partial<ChatHistorySidebarProps>): void => {
  render(<ThreadColumn {...defaultProps} {...props} />);
};
