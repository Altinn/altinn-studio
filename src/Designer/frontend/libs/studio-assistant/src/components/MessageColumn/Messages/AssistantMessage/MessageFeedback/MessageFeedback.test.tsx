import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageFeedback } from './MessageFeedback';
import type { MessageFeedbackProps } from './MessageFeedback';
import { messageFeedbackTexts as feedbackTexts } from '../../../../../mocks/mockTexts';

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

  describe('with a stored vote', () => {
    it('marks the stored vote as pressed', () => {
      renderMessageFeedback({ currentVote: true });

      expect(getThumbsUpButton()).toHaveAttribute('aria-pressed', 'true');
      expect(getThumbsDownButton()).toHaveAttribute('aria-pressed', 'false');
    });

    it('clears the vote without a dialog when the chosen thumb is pressed again', async () => {
      const user = userEvent.setup();
      const onClear = jest.fn();
      renderMessageFeedback({ currentVote: true, onClear });

      await user.click(getThumbsUpButton());

      expect(onClear).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('opens the dialog when the opposite thumb is pressed', async () => {
      const user = userEvent.setup();
      const onClear = jest.fn();
      const onSubmit = jest.fn();
      renderMessageFeedback({ currentVote: true, onClear, onSubmit });

      await user.click(getThumbsDownButton());
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(onClear).not.toHaveBeenCalled();

      await user.click(getSendButton());
      expect(onSubmit).toHaveBeenCalledWith({ thumbsUp: false, comment: undefined });
    });

    it('labels the chosen thumb with what pressing it does', () => {
      renderMessageFeedback({ currentVote: false, onClear: jest.fn() });

      expect(getThumbsDownButton()).toHaveAttribute('title', feedbackTexts.clear);
      expect(getThumbsUpButton()).toHaveAttribute('title', feedbackTexts.thumbsUp);
    });

    it('still opens the dialog when no clear handler is given', async () => {
      const user = userEvent.setup();
      renderMessageFeedback({ currentVote: true });

      await user.click(getThumbsUpButton());

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});

const defaultProps: MessageFeedbackProps = {
  texts: feedbackTexts,
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
