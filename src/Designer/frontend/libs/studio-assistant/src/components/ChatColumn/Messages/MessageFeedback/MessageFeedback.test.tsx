import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MessageFeedback } from './MessageFeedback';
import type { MessageFeedbackProps } from './MessageFeedback';
import type { MessageFeedbackTexts } from '../../../../types/AssistantTexts';

const mockTexts: MessageFeedbackTexts = {
  thumbsUp: 'Nyttig svar',
  thumbsDown: 'Ikke nyttig svar',
  heading: 'Tilbakemelding',
  body: 'Tilbakemeldingen er mottatt! Ønsker du å utdype?',
  submit: 'Send',
};

describe('MessageFeedback', () => {
  beforeAll(() => {
    if (!HTMLDialogElement.prototype.showModal) {
      HTMLDialogElement.prototype.showModal = function showModal() {
        this.setAttribute('open', '');
      };
    }
    if (!HTMLDialogElement.prototype.close) {
      HTMLDialogElement.prototype.close = function close() {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      };
    }
  });

  it('renders both thumb buttons enabled by default', () => {
    renderMessageFeedback();

    expect(getThumbsUpButton()).toBeEnabled();
    expect(getThumbsDownButton()).toBeEnabled();
  });

  it('marks the chosen button as pressed and opens the dialog after the first vote, without firing onSubmit yet', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    renderMessageFeedback({ onSubmit });

    await user.click(getThumbsUpButton());

    expect(getThumbsUpButton()).toHaveAttribute('aria-pressed', 'true');
    expect(getThumbsDownButton()).toBeEnabled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('fires onSubmit once with no comment when the dialog is dismissed without typing', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    renderMessageFeedback({ onSubmit });

    await user.click(getThumbsUpButton());
    closeDialogViaEscape();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('up', undefined);
  });

  it('fires onSubmit once with the comment when the user submits the textarea', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    renderMessageFeedback({ onSubmit });

    await user.click(getThumbsDownButton());
    await user.type(screen.getByRole('textbox'), 'Svaret traff ikke helt.');
    await user.click(screen.getByRole('button', { name: mockTexts.submit }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('down', 'Svaret traff ikke helt.');
  });

  it('does not fire onSubmit a second time if the dialog close fires twice', async () => {
    const user = userEvent.setup();
    const onSubmit = jest.fn();
    renderMessageFeedback({ onSubmit });

    await user.click(getThumbsUpButton());
    const dialogElement = screen.getByRole('dialog');
    dialogElement.dispatchEvent(new Event('close'));
    dialogElement.dispatchEvent(new Event('close'));

    expect(onSubmit).toHaveBeenCalledTimes(1);
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

const closeDialogViaEscape = (): void => {
  const dialogElement = screen.getByRole('dialog') as HTMLDialogElement;
  dialogElement.close();
};
