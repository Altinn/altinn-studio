import { Messages, type MessagesProps } from './Messages';
import { render, screen } from '@testing-library/react';
import type { Message } from '../../../types/ChatThread';
import { MessageAuthor } from '../../../types/MessageAuthor';

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
const imageAttachment = {
  name: 'screenshot.png',
  mimeType: 'image/png',
  dataBase64: 'data:image/png;base64,abc',
};
const fileAttachment = { name: 'notes.txt', mimeType: 'text/plain' };

describe('Messages', () => {
  it('should render all messages', () => {
    renderMessages({ messages: mockMessages });
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

  it('renders the file name for an image attachment on a user message', () => {
    const userMessageWithImage: Message = {
      role: MessageAuthor.User,
      content: '',
      createdAt: new Date().toISOString(),
      allowAppChanges: false,
      attachments: [imageAttachment],
    };
    renderMessages({ messages: [userMessageWithImage] });

    expect(screen.getByText(imageAttachment.name)).toBeInTheDocument();
  });

  it('renders the file name for a non-image attachment on a user message', () => {
    const userMessageWithFile: Message = {
      role: MessageAuthor.User,
      content: '',
      createdAt: new Date().toISOString(),
      allowAppChanges: false,
      attachments: [fileAttachment],
    };
    renderMessages({ messages: [userMessageWithFile] });

    expect(screen.getByText(fileAttachment.name)).toBeInTheDocument();
  });

  it('renders an image element for image attachments using its name as alt text', () => {
    const userMessageWithImage: Message = {
      role: MessageAuthor.User,
      content: '',
      createdAt: new Date().toISOString(),
      allowAppChanges: false,
      attachments: [imageAttachment],
    };
    renderMessages({ messages: [userMessageWithImage] });

    expect(screen.getByRole('img', { name: imageAttachment.name })).toBeInTheDocument();
  });

  it('renders cited sources with a link when the source URL is safe', () => {
    const safeUrl = 'https://example.com/doc';
    const sourceTitle = 'Cited doc';
    const assistantMessageWithSources: Message = {
      role: MessageAuthor.Assistant,
      content: '',
      createdAt: new Date().toISOString(),
      sources: [{ tool: 'search', title: sourceTitle, url: safeUrl, cited: true }],
    };
    renderMessages({ messages: [assistantMessageWithSources] });

    const link = screen.getByRole('link', { name: new RegExp(sourceTitle) });
    expect(link).toHaveAttribute('href', safeUrl);
  });
});

const renderMessages = (props: MessagesProps): void => {
  render(<Messages {...props} />);
};
