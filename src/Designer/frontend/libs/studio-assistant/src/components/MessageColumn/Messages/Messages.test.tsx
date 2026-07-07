import { Messages, type MessagesProps } from './Messages';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { Message } from '../../../types/ChatThread';
import { MessageAuthor } from '../../../types/MessageAuthor';
import { mockTexts } from '../../../mocks/mockTexts';

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
  },
];

describe('Messages', () => {
  it('should render all messages', () => {
    renderMessages();
    const userMessage = screen.getByText(userMessageContent);
    const assistantMessage = screen.getByText(assistantMessageContent);

    expect(userMessage).toBeInTheDocument();
    expect(assistantMessage).toBeInTheDocument();
  });

  it('renders the loading bubble with the workflow message when the workflow is active', () => {
    const workflowMessage = 'Working on it';
    renderMessages({
      messages: [],
      workflowStatus: { isActive: true, message: workflowMessage },
    });

    expect(screen.getByText(workflowMessage)).toBeInTheDocument();
  });

  it('does not render the loading bubble when the workflow is inactive', () => {
    const workflowMessage = 'Should not appear';
    renderMessages({
      messages: [],
      workflowStatus: { isActive: false, message: workflowMessage },
    });

    expect(screen.queryByText(workflowMessage)).not.toBeInTheDocument();
  });
});

const defaultProps: MessagesProps = {
  messages: mockMessages,
  texts: mockTexts,
};

const renderMessages = (props: Partial<MessagesProps> = {}): RenderResult =>
  render(<Messages {...defaultProps} {...props} />);
