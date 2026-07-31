import { Messages, type MessagesProps } from './Messages';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('renders the activity trail with the workflow message when the workflow is active', () => {
    const workflowMessage = 'Working on it';
    renderMessages({
      messages: [],
      workflowStatus: { isActive: true, message: workflowMessage },
    });

    expect(screen.getByText(workflowMessage)).toBeInTheDocument();
  });

  it('renders every step of the trail when steps are provided', () => {
    renderMessages({
      messages: [],
      workflowStatus: {
        isActive: true,
        steps: [
          { id: 'a', message: 'Tenker på oppgaven', offsetMs: 0 },
          { id: 'b', message: 'Leser FormSpec', offsetMs: 2400 },
        ],
      },
    });

    expect(screen.getByText('Tenker på oppgaven')).toBeInTheDocument();
    expect(screen.getByText('Leser FormSpec')).toBeInTheDocument();
  });

  it('does not render the activity trail when the workflow is inactive', () => {
    const workflowMessage = 'Should not appear';
    renderMessages({
      messages: [],
      workflowStatus: { isActive: false, message: workflowMessage },
    });

    expect(screen.queryByText(workflowMessage)).not.toBeInTheDocument();
  });

  it('renders the permission prompt and forwards the user response with the request id', async () => {
    const user = userEvent.setup();
    const onPermissionResponse = jest.fn();
    renderMessages({
      messages: [],
      workflowStatus: {
        isActive: true,
        permissionRequest: { requestId: 'req-1', message: 'write_file: App/ui/Side1.json' },
      },
      onPermissionResponse,
    });

    expect(screen.getByText('write_file: App/ui/Side1.json')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: mockTexts.permissionPrompt.allow }));

    expect(onPermissionResponse).toHaveBeenCalledWith('req-1', true);
  });

  it('does not render the permission prompt when the workflow is inactive', () => {
    renderMessages({
      messages: [],
      workflowStatus: {
        isActive: false,
        permissionRequest: { requestId: 'req-1', message: 'write_file: App/ui/Side1.json' },
      },
      onPermissionResponse: jest.fn(),
    });

    expect(screen.queryByText('write_file: App/ui/Side1.json')).not.toBeInTheDocument();
  });
});

const defaultProps: MessagesProps = {
  messages: mockMessages,
  texts: mockTexts,
};

const renderMessages = (props: Partial<MessagesProps> = {}): RenderResult =>
  render(<Messages {...defaultProps} {...props} />);
