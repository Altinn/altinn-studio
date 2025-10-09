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

  it('should render attachment button and agent mode switch when "enableCompactInterface" is false', () => {
    renderChatColumn({ enableCompactInterface: false });
    const attachmentButton = screen.getByTitle(mockTexts.addAttachment);
    const agentModeSwitch = screen.getByLabelText(mockTexts.agentModeSwitch);
    expect(attachmentButton).toBeInTheDocument();
    expect(agentModeSwitch).toBeInTheDocument();
  });

  it('should not render attachment button and agent mode switch when "enableCompactInterface" is true', () => {
    renderChatColumn({ enableCompactInterface: true });
    const attachmentButton = screen.queryByTitle(mockTexts.addAttachment);
    const agentModeSwitch = screen.queryByLabelText(mockTexts.agentModeSwitch);
    expect(attachmentButton).not.toBeInTheDocument();
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
  enableCompactInterface: false,
};

const renderChatColumn = (props?: Partial<ChatColumnProps>): void => {
  render(<ChatColumn {...defaultProps} {...props} />);
};
