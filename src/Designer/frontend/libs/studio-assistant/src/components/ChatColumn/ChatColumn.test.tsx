import React from 'react';
import { ChatColumn } from './ChatColumn';
import { render, screen } from '@testing-library/react';
import type { ChatColumnProps } from './ChatColumn';
import { MessageAuthor } from '../../types/MessageAuthor';
import type { Message } from '../../types/ChatThread';
import { mockTexts } from '../../mocks/mockTexts';

// Test data
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
});

const defaultProps: ChatColumnProps = {
  texts: mockTexts,
  messages: [],
  onSubmitMessage: jest.fn(),
  enableCompactInterface: false,
};

const renderChatColumn = (props?: Partial<ChatColumnProps>): void => {
  render(<ChatColumn {...defaultProps} {...props} />);
};
