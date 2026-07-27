import { UserMessage, type UserMessageProps } from './UserMessage';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { UserAttachment } from '../../../../types/ChatThread';
import { MessageAuthor } from '../../../../types/MessageAuthor';

const userMessageContent = 'User message';
const imageAttachment: UserAttachment = {
  name: 'screenshot.png',
  mimeType: 'image/png',
  dataBase64: 'data:image/png;base64,abc',
};
const fileAttachment: UserAttachment = { name: 'notes.txt', mimeType: 'text/plain' };

const createUserMessage = (attachments?: UserAttachment[]): UserMessageProps['message'] => ({
  role: MessageAuthor.User,
  content: userMessageContent,
  createdAt: new Date().toISOString(),
  allowAppChanges: false,
  attachments,
});

describe('UserMessage', () => {
  it('renders the message content', () => {
    renderUserMessage();

    expect(screen.getByText(userMessageContent)).toBeInTheDocument();
  });

  it('renders the file name for an image attachment', () => {
    renderUserMessage({ message: createUserMessage([imageAttachment]) });

    expect(screen.getByText(imageAttachment.name)).toBeInTheDocument();
  });

  it('renders the file name for a non-image attachment', () => {
    renderUserMessage({ message: createUserMessage([fileAttachment]) });

    expect(screen.getByText(fileAttachment.name)).toBeInTheDocument();
  });

  it('renders an image element for image attachments using its name as alt text', () => {
    renderUserMessage({ message: createUserMessage([imageAttachment]) });

    expect(screen.getByRole('img', { name: imageAttachment.name })).toBeInTheDocument();
  });
});

const defaultProps: UserMessageProps = {
  message: createUserMessage(),
};

const renderUserMessage = (props: Partial<UserMessageProps> = {}): RenderResult =>
  render(<UserMessage {...defaultProps} {...props} />);
