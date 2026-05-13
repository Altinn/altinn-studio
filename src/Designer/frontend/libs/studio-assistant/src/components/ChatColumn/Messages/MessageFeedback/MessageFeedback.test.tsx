import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageFeedback } from './MessageFeedback';
import type { MessageFeedbackProps } from './MessageFeedback';
import type { MessageFeedbackTexts } from '../../../../types/AssistantTexts';

const mockTexts: MessageFeedbackTexts = {
  thumbsUp: 'Nyttig svar',
  thumbsDown: 'Ikke nyttig svar',
  heading: 'Tilbakemelding',
  body: 'Takk for tilbakemeldingen. Vil du utdype?',
  submit: 'Send',
};

describe('MessageFeedback', () => {
  it('renders thumbs up and thumbs down buttons', () => {
    renderMessageFeedback();

    expect(getThumbsUpButton()).toBeInTheDocument();
    expect(getThumbsDownButton()).toBeInTheDocument();
  });

  it('opens feedback dialog when pressing either thumb button', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    renderMessageFeedback({ onSubmit });

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
    expect(onSubmit).toHaveBeenCalledWith('up');
  });

  it('calls onSubmit with comment when there is a comment', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    renderMessageFeedback({ onSubmit });

    await user.click(getThumbsDownButton());
    await user.type(screen.getByRole('textbox'), 'Svaret traff ikke helt.');
    await user.click(getSendButton());

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('down', 'Svaret traff ikke helt.');
  });
});

const defaultProps: MessageFeedbackProps = {
  texts: mockTexts,
  onSubmit: jest.fn(),
};

const renderMessageFeedback = (props: Partial<MessageFeedbackProps> = {}): void => {
  render(<MessageFeedback {...defaultProps} {...props} />);
};

const getThumbsUpButton = (): HTMLElement =>
  screen.getByRole('button', { name: mockTexts.thumbsUp });

const getThumbsDownButton = (): HTMLElement =>
  screen.getByRole('button', { name: mockTexts.thumbsDown });

const getSendButton = (): HTMLElement => screen.getByRole('button', { name: mockTexts.submit });
