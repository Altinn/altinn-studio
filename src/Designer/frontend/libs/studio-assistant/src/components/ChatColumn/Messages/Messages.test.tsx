import React from 'react';
import { Messages, type MessagesProps } from './Messages';
import { render, screen } from '@testing-library/react';
import type { Message } from '../../../types/ChatThread';
import { MessageAuthor } from '../../../types/MessageAuthor';

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
    filesChanged: [],
  },
];

describe('Messages', () => {
  it('should render all messages', () => {
    renderMessages({ messages: mockMessages });
    const userMessage = screen.getByText(userMessageContent);
    const assistantMessage = screen.getByText(assistantMessageContent);

    expect(userMessage).toBeInTheDocument();
    expect(assistantMessage).toBeInTheDocument();
  });
});

const renderMessages = (props: MessagesProps): void => {
  render(<Messages {...props} />);
};
