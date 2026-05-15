import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageFeedback } from './MessageFeedback';
import type { MessageFeedbackProps } from './MessageFeedback';
import { messageFeedbackTexts as feedbackTexts } from '../../../../mocks/mockTexts';

const traceId = 'trace-123';

describe('MessageFeedback', () => {
  it('renders thumbs up and thumbs down buttons', () => {
    renderMessageFeedback();

    expect(getThumbsUpButton()).toBeInTheDocument();
    expect(getThumbsDownButton()).toBeInTheDocument();
  });

  it('opens feedback dialog when pressing either thumb button', async () => {
    const user = userEvent.setup();
    renderMessageFeedback();

    await user.click(getThumbsUpButton());

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('calls onSubmit without comment when there is no comment', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    renderMessageFeedback({ onSubmit });

    await user.click(getThumbsUpButton());
    await user.click(getSendButton());

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      traceId,
      thumbsUp: true,
      comment: undefined,
    });
  });

  it('calls onSubmit with comment when there is a comment', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    renderMessageFeedback({ onSubmit });

    await user.click(getThumbsDownButton());
    await user.type(screen.getByRole('textbox'), 'Svaret traff ikke helt.');
    await user.click(getSendButton());

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      traceId,
      thumbsUp: false,
      comment: 'Svaret traff ikke helt.',
    });
  });

  it('closes the dialog without calling onSubmit when pressing cancel', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    renderMessageFeedback({ onSubmit });

    await user.click(getThumbsUpButton());
    await user.click(getCancelButton());

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('closes the dialog after submitting feedback', async () => {
    const user = userEvent.setup();
    renderMessageFeedback();

    await user.click(getThumbsUpButton());
    await user.click(getSendButton());

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

const defaultProps: MessageFeedbackProps = {
  texts: feedbackTexts,
  traceId,
  onSubmit: jest.fn(),
};

const renderMessageFeedback = (props: Partial<MessageFeedbackProps> = {}): void => {
  render(<MessageFeedback {...defaultProps} {...props} />);
};

const getThumbsUpButton = (): HTMLElement =>
  screen.getByRole('button', { name: feedbackTexts.thumbsUp });

const getThumbsDownButton = (): HTMLElement =>
  screen.getByRole('button', { name: feedbackTexts.thumbsDown });

const getSendButton = (): HTMLElement => screen.getByRole('button', { name: feedbackTexts.submit });

const getCancelButton = (): HTMLElement =>
  screen.getByRole('button', { name: feedbackTexts.cancel });
