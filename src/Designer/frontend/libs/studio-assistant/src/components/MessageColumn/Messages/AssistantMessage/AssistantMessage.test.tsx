import { AssistantMessage, type AssistantMessageProps } from './AssistantMessage';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import { MessageAuthor } from '../../../../types/MessageAuthor';
import {
  messageFeedbackTexts,
  mockTexts,
  criticalFileAlertTexts,
  securityNoticeAlertTexts,
} from '../../../../mocks/mockTexts';

const assistantMessageContent = 'Assistant response';

const createAssistantMessage = (
  overrides: Partial<AssistantMessageProps['message']> = {},
): AssistantMessageProps['message'] => ({
  role: MessageAuthor.Assistant,
  content: assistantMessageContent,
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe('AssistantMessage', () => {
  it('renders the message content', () => {
    renderAssistantMessage();

    expect(screen.getByText(assistantMessageContent)).toBeInTheDocument();
  });

  it('renders the source list when the message has sources', () => {
    const sourceTitle = 'Some source';
    renderAssistantMessage({
      message: createAssistantMessage({
        sources: [{ tool: 'search', title: sourceTitle, cited: true }],
      }),
    });

    expect(screen.getByText(new RegExp(sourceTitle))).toBeInTheDocument();
  });

  it('renders the files changed list when the message has changed files', () => {
    const fileName = 'layout.json';
    renderAssistantMessage({
      message: createAssistantMessage({ filesChanged: [`App/ui/${fileName}`] }),
    });

    expect(screen.getByRole('button', { name: new RegExp(fileName) })).toBeInTheDocument();
  });

  it('renders the critical file alert when a critical file is changed', () => {
    renderAssistantMessage({
      message: createAssistantMessage({
        filesChanged: ['App/config/authorization/policy.xml'],
      }),
    });

    expect(
      screen.getByRole('heading', { name: criticalFileAlertTexts.heading }),
    ).toBeInTheDocument();
  });

  it('does not render the critical file alert when no critical file is changed', () => {
    renderAssistantMessage({
      message: createAssistantMessage({ filesChanged: ['App/ui/layouts/layout.json'] }),
    });

    expect(
      screen.queryByRole('heading', { name: criticalFileAlertTexts.heading }),
    ).not.toBeInTheDocument();
  });

  it('renders feedback buttons when the message has a traceId', () => {
    renderAssistantMessage({ message: createAssistantMessage({ traceId: 'trace-123' }) });

    expect(screen.getByRole('button', { name: messageFeedbackTexts.thumbsUp })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: messageFeedbackTexts.thumbsDown }),
    ).toBeInTheDocument();
  });

  it('renders the security notice alert when the message is flagged', () => {
    renderAssistantMessage({
      message: createAssistantMessage({ attachmentInstructionFlagged: true }),
    });

    expect(
      screen.getByRole('heading', { name: securityNoticeAlertTexts.heading }),
    ).toBeInTheDocument();
    expect(screen.getByText(securityNoticeAlertTexts.description)).toBeInTheDocument();
  });

  it('does not render the security notice alert on an ordinary message', () => {
    renderAssistantMessage();

    expect(
      screen.queryByRole('heading', { name: securityNoticeAlertTexts.heading }),
    ).not.toBeInTheDocument();
  });

  it('marks the stored vote', () => {
    renderAssistantMessage({
      message: createAssistantMessage({ traceId: 'trace-123', feedbackThumbsUp: true }),
      onClearMessageFeedback: jest.fn(),
    });

    expect(screen.getByRole('button', { name: messageFeedbackTexts.thumbsUp })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('clears the vote with the traceId when the chosen thumb is pressed again', async () => {
    const user = userEvent.setup();
    const onClearMessageFeedback = jest.fn();
    renderAssistantMessage({
      message: createAssistantMessage({ traceId: 'trace-123', feedbackThumbsUp: false }),
      onClearMessageFeedback,
    });

    await user.click(screen.getByRole('button', { name: messageFeedbackTexts.thumbsDown }));

    expect(onClearMessageFeedback).toHaveBeenCalledWith('trace-123');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('does not render feedback buttons when traceId is missing', () => {
    renderAssistantMessage();

    expect(
      screen.queryByRole('button', { name: messageFeedbackTexts.thumbsUp }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: messageFeedbackTexts.thumbsDown }),
    ).not.toBeInTheDocument();
  });
});

const defaultProps: AssistantMessageProps = {
  message: createAssistantMessage(),
  texts: mockTexts,
  onMessageFeedback: jest.fn(),
};

const renderAssistantMessage = (props: Partial<AssistantMessageProps> = {}): RenderResult =>
  render(<AssistantMessage {...defaultProps} {...props} />);
