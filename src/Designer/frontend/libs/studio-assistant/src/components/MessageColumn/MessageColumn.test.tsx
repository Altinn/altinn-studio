import { MessageColumn } from './MessageColumn';
import { render, screen } from '@testing-library/react';
import type { MessageColumnProps } from './MessageColumn';
import { MessageAuthor } from '../../types/MessageAuthor';
import type { Message } from '../../types/ChatThread';
import { mockTexts } from '../../mocks/mockTexts';

// Test data
const userMessageContent = 'User message';
const assistantMessageContent = 'Assistant response';
const mockMessages: Message[] = [
  {
    role: MessageAuthor.User,
    content: userMessageContent,
    createdAt: new Date().toISOString(),
    allowAppChanges: false,
  },
  {
    role: MessageAuthor.Assistant,
    content: assistantMessageContent,
    createdAt: new Date().toISOString(),
    filesChanged: [],
  },
];

describe('MessageColumn', () => {
  it('should render messages and user input', () => {
    renderMessageColumn({ messages: mockMessages });

    const userMessage = screen.getByText(userMessageContent);
    const assistantMessage = screen.getByText(assistantMessageContent);
    const textarea = screen.getByPlaceholderText(mockTexts.textarea.placeholder);
    const sendButton = screen.getByRole('button', { name: mockTexts.send });

    expect(userMessage).toBeInTheDocument();
    expect(assistantMessage).toBeInTheDocument();
    expect(textarea).toBeInTheDocument();
    expect(sendButton).toBeInTheDocument();
  });
});

const defaultProps: MessageColumnProps = {
  texts: mockTexts,
  messages: [],
  onSubmitMessage: jest.fn(),
  enableCompactInterface: false,
};

const renderMessageColumn = (props?: Partial<MessageColumnProps>): void => {
  render(<MessageColumn {...defaultProps} {...props} />);
};
