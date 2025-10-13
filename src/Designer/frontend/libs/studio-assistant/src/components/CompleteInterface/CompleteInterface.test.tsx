import React from 'react';
import { CompleteInterface } from './CompleteInterface';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockTexts } from '../../mocks/mockTexts';
import type { ChatThread } from '../../types/ChatThread';
import { MessageAuthor } from '../../types/MessageAuthor';

// Test data
const onSubmitMessage = jest.fn();

const threadTitle1 = 'Thread 1';
const threadTitle2 = 'Thread 2';
const mockChatThreads: ChatThread[] = [
  {
    id: '1',
    title: threadTitle1,
    messages: [
      {
        author: MessageAuthor.User,
        content: 'User message',
        timestamp: new Date(),
      },
    ],
  },
  {
    id: '2',
    title: threadTitle2,
    messages: [],
  },
];

describe('CompleteInterface', () => {
  it('should render the heading', () => {
    renderCompleteInterface();
    const heading = screen.getByRole('heading', { name: mockTexts.heading });

    expect(heading).toBeInTheDocument();
  });

  it('should render the tool mode toggle group', () => {
    renderCompleteInterface();
    const previewToggle = screen.getByRole('radio', { name: mockTexts.preview });
    const fileBrowserToggle = screen.getByRole('radio', { name: mockTexts.fileBrowser });

    expect(previewToggle).toBeInTheDocument();
    expect(fileBrowserToggle).toBeInTheDocument();
  });

  it('should render the hide threads button', () => {
    renderCompleteInterface();
    const hideThreadsButton = screen.getByRole('button', { name: mockTexts.hideThreads });

    expect(hideThreadsButton).toBeInTheDocument();
  });

  it('should render the new thread button', () => {
    renderCompleteInterface();
    const newThreadButton = screen.getByRole('button', { name: mockTexts.newThread });

    expect(newThreadButton).toBeInTheDocument();
  });

  it('should render chat threads', () => {
    renderCompleteInterface({ chatThreads: mockChatThreads });
    const thread1 = screen.getByRole('tab', { name: threadTitle1 });
    const thread2 = screen.getByRole('tab', { name: threadTitle2 });

    expect(thread1).toBeInTheDocument();
    expect(thread2).toBeInTheDocument();
  });

  it('should render messages from the first thread by default', () => {
    renderCompleteInterface({ chatThreads: mockChatThreads });
    const userMessage = screen.getByText('User message');

    expect(userMessage).toBeInTheDocument();
  });

  it('should switch current thread when a different thread is selected', async () => {
    const user = userEvent.setup();
    renderCompleteInterface({ chatThreads: mockChatThreads });

    expect(screen.getByText('User message')).toBeInTheDocument();

    const thread2Tab = screen.getByRole('tab', { name: threadTitle2 });
    await user.click(thread2Tab);

    expect(screen.queryByText('User message')).not.toBeInTheDocument();
  });

  it('should render the chat input', () => {
    renderCompleteInterface();
    const textarea = screen.getByPlaceholderText(mockTexts.textareaPlaceholder);

    expect(textarea).toBeInTheDocument();
  });

  it('should render attachment button', () => {
    renderCompleteInterface();
    const attachmentButton = screen.getByRole('button', { name: mockTexts.addAttachment });

    expect(attachmentButton).toBeInTheDocument();
  });

  it('should render "allow app changes" switch', () => {
    renderCompleteInterface();
    const allowAppChangesSwitch = screen.getByLabelText(mockTexts.allowAppChangesSwitch);

    expect(allowAppChangesSwitch).toBeInTheDocument();
  });

  it('should render the send button', () => {
    renderCompleteInterface();
    const sendButton = screen.getByRole('button', { name: mockTexts.send });

    expect(sendButton).toBeInTheDocument();
  });

  it('should render tool column with preview placeholder', () => {
    renderCompleteInterface();
    const previewPlaceholder = screen.getByText('Preview placeholder');

    expect(previewPlaceholder).toBeInTheDocument();
  });
});

const defaultProps = {
  texts: mockTexts,
  chatThreads: [],
  onSubmitMessage,
};

const renderCompleteInterface = (props?: Partial<typeof defaultProps>): void => {
  render(<CompleteInterface {...defaultProps} {...props} />);
};
