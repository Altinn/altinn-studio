import { Assistant } from './Assistant';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AssistantProps } from '../Assistant/Assistant';
import { mockTexts } from '../mocks/mockTexts';
import { MessageAuthor } from '../types/MessageAuthor';

// Test data
const onSubmitMessage = jest.fn();

describe('Assistant', () => {
  it('should render the complete chat interface by default', () => {
    renderAssistant();
    const assistantHeading = screen.getByRole('heading', { name: mockTexts.heading });
    const previewToggle = screen.getByRole('radio', { name: mockTexts.preview });
    const newThreadButton = screen.getByRole('button', { name: mockTexts.newThread });
    const sendButton = screen.getByRole('button', { name: mockTexts.send });

    expect(assistantHeading).toBeInTheDocument();
    expect(previewToggle).toBeInTheDocument();
    expect(newThreadButton).toBeInTheDocument();
    expect(sendButton).toBeInTheDocument();
  });

  it('should render the simplified chat interface when enableCompactInterface is true', () => {
    renderAssistant({ enableCompactInterface: true });
    const assistantHeading = screen.getByRole('heading', { name: mockTexts.heading });
    const previewToggle = screen.queryByRole('radio', { name: mockTexts.preview });
    const newThreadButton = screen.queryByRole('button', { name: mockTexts.newThread });
    const sendButton = screen.getByRole('button', { name: mockTexts.send });

    expect(assistantHeading).toBeInTheDocument();
    expect(previewToggle).not.toBeInTheDocument();
    expect(newThreadButton).not.toBeInTheDocument();
    expect(sendButton).toBeInTheDocument();
  });

  it('wires the feedback handlers through every layer down to the thumbs', async () => {
    const user = userEvent.setup();
    const onClearMessageFeedback = jest.fn();
    renderAssistant({
      messages: [
        {
          id: 'msg-1',
          role: MessageAuthor.Assistant,
          content: 'Svar',
          createdAt: '2026-01-01T00:00:00Z',
          traceId: 'trace-1',
          feedbackThumbsUp: true,
        },
      ],
      onMessageFeedback: jest.fn(),
      onClearMessageFeedback,
    });

    await user.click(screen.getByRole('button', { name: mockTexts.feedback.thumbsUp }));

    expect(onClearMessageFeedback).toHaveBeenCalledWith('trace-1');
    expect(
      screen.queryByRole('heading', { name: mockTexts.feedback.heading }),
    ).not.toBeInTheDocument();
  });
});

const defaultProps: AssistantProps = {
  onSubmitMessage,
  texts: mockTexts,
  chatThreads: [],
  activeThreadId: '',
  connectionStatus: 'error',
  workflowStatusByThread: {},
  previewContent: <p>Preview placeholder</p>,
};

const renderAssistant = (props?: Partial<AssistantProps>): void => {
  render(<Assistant {...defaultProps} {...props} />);
};
