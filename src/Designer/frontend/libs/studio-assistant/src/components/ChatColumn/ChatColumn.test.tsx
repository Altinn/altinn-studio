import React from 'react';
import { ChatColumn } from './ChatColumn';
import { render, screen } from '@testing-library/react';
import type { ChatColumnProps } from './ChatColumn';
import { MessageAuthor } from '../../types/MessageAuthor';
import type { Message } from '../../types/ChatThread';
import { mockTexts } from '../../mocks/mockTexts';

// Test data
const onSubmitMessage = jest.fn();

const userMessageContent = 'User message';
const assistantMessageContent = 'Assistant response';
const mockMessages: Message[] = [
  {
    author: MessageAuthor.User,
    content: userMessageContent,
    timestamp: new Date(),
  },
  {
    author: MessageAuthor.Assistant,
    content: assistantMessageContent,
    timestamp: new Date(),
  },
];

describe('ChatColumn', () => {
  it('should render messages and user input', () => {
    renderChatColumn({ messages: mockMessages });

    const userMessage = screen.getByText(userMessageContent);
    const assistantMessage = screen.getByText(assistantMessageContent);
    const textarea = screen.getByPlaceholderText(mockTexts.textareaPlaceholder);
    const sendButton = screen.getByRole('button', { name: mockTexts.send });

    expect(userMessage).toBeInTheDocument();
    expect(assistantMessage).toBeInTheDocument();
    expect(textarea).toBeInTheDocument();
    expect(sendButton).toBeInTheDocument();
  });

  it('should render attachment button when flag is enabled', () => {
    renderChatColumn({ flags: { attachmentButton: true, agentModeSwitch: false } });

    const attachmentButton = screen.getByTitle(mockTexts.addAttachment);
    expect(attachmentButton).toBeInTheDocument();
  });

  it('should not render attachment button when flag is disabled', () => {
    renderChatColumn({ flags: { attachmentButton: false, agentModeSwitch: false } });

    const attachmentButton = screen.queryByTitle(mockTexts.addAttachment);
    expect(attachmentButton).not.toBeInTheDocument();
  });

  it('should render agent mode switch when flag is enabled', () => {
    renderChatColumn({ flags: { attachmentButton: false, agentModeSwitch: true } });

    const agentModeSwitch = screen.getByLabelText(mockTexts.agentModeSwitch);
    expect(agentModeSwitch).toBeInTheDocument();
  });

  it('should not render agent mode switch when flag is disabled', () => {
    renderChatColumn({ flags: { attachmentButton: false, agentModeSwitch: false } });

    const agentModeSwitch = screen.queryByLabelText(mockTexts.agentModeSwitch);
    expect(agentModeSwitch).not.toBeInTheDocument();
  });

  it('should render empty messages list', () => {
    renderChatColumn({ messages: [] });

    expect(screen.queryByText(userMessageContent)).not.toBeInTheDocument();
    expect(screen.getByPlaceholderText(mockTexts.textareaPlaceholder)).toBeInTheDocument();
  });
});

const defaultProps: ChatColumnProps = {
  texts: mockTexts,
  messages: [],
  onSubmitMessage,
  flags: {
    attachmentButton: false,
    agentModeSwitch: false,
  },
};

const renderChatColumn = (props?: Partial<ChatColumnProps>): void => {
  render(<ChatColumn {...defaultProps} {...props} />);
};
