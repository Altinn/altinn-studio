import { UserInput } from './UserInput';
import { render, screen } from '@testing-library/react';
import type { UserInputProps } from './UserInput';
import { mockTexts } from '../../../mocks/mockTexts';
import userEvent from '@testing-library/user-event';

// Test data
const onSubmitMessage = jest.fn();
const onCreateThread = jest.fn();

describe('UserInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render textarea with placeholder', () => {
    renderUserInput();
    expect(getTextarea()).toBeInTheDocument();
  });

  it('should render send button', () => {
    renderUserInput();
    expect(getSendButton()).toBeInTheDocument();
  });

  it('should render attachment button when enableCompactInterface is false', () => {
    renderUserInput({ enableCompactInterface: false });
    const attachmentButton = screen.getByRole('button', { name: mockTexts.addAttachment });

    expect(attachmentButton).toBeInTheDocument();
  });

  it('should not render attachment button when enableCompactInterface is true', () => {
    renderUserInput({ enableCompactInterface: true });
    const attachmentButton = screen.queryByRole('button', { name: mockTexts.addAttachment });

    expect(attachmentButton).not.toBeInTheDocument();
  });

  it('should render "allow app changes" switch when enableCompactInterface is false', () => {
    renderUserInput({ enableCompactInterface: false });
    const allowAppChangesSwitch = screen.getByLabelText(mockTexts.allowAppChangesSwitch);

    expect(allowAppChangesSwitch).toBeInTheDocument();
  });

  it('should not render "allow app changes" switch when enableCompactInterface is true', () => {
    renderUserInput({ enableCompactInterface: true });
    const allowAppChangesSwitch = screen.queryByLabelText(mockTexts.allowAppChangesSwitch);

    expect(allowAppChangesSwitch).not.toBeInTheDocument();
  });

  it('should disable send button when textarea is empty', () => {
    renderUserInput();
    expect(getSendButton()).toBeDisabled();
  });

  it('should disable send button when textarea is empty, even when there is an attachment', async () => {
    const user = userEvent.setup();
    renderUserInput();
    const fileInput = screen.getByLabelText(mockTexts.addAttachment, { selector: 'input' });
    const attachment = new File(['file content'], 'attachment.txt', { type: 'text/plain' });

    await user.upload(fileInput, attachment);

    expect(getSendButton()).toBeDisabled();
  });

  it('should disable send button when entering empty or white-space only message', async () => {
    const user = userEvent.setup();
    renderUserInput();

    await user.type(getTextarea(), '   ');

    expect(getSendButton()).toBeDisabled();
  });

  it('should enable send button when textarea has content', async () => {
    const user = userEvent.setup();
    renderUserInput();

    await user.type(getTextarea(), 'Test message');

    expect(getSendButton()).toBeEnabled();
  });

  it('should call onSubmitMessage when send button is clicked', async () => {
    const user = userEvent.setup();
    renderUserInput();

    await user.type(getTextarea(), 'Test message');
    await user.click(getSendButton());

    expect(onSubmitMessage).toHaveBeenCalledTimes(1);
    expect(onSubmitMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Test message',
      }),
    );
  });

  it('should submit allowAppChanges value according to switch state', async () => {
    const user = userEvent.setup();
    renderUserInput();
    const allowAppChangesSwitch = screen.getByRole('switch', {
      name: mockTexts.allowAppChangesSwitch,
    });

    await user.type(getTextarea(), 'Test message');
    await user.click(getSendButton());

    expect(onSubmitMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ allowAppChanges: false }),
    );

    await user.click(allowAppChangesSwitch);
    await user.type(getTextarea(), 'Another message');
    await user.click(getSendButton());

    expect(onSubmitMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ allowAppChanges: true }),
    );
    expect(onSubmitMessage).toHaveBeenCalledTimes(2);
  });

  it('should clear textarea after submitting message', async () => {
    const user = userEvent.setup();
    renderUserInput();
    const textarea = getTextarea();

    await user.type(textarea, 'Test message');
    await user.click(getSendButton());

    expect(textarea).toHaveValue('');
  });

  it('should submit message on Enter key press', async () => {
    const user = userEvent.setup();
    renderUserInput();

    await user.type(getTextarea(), 'Test message{Enter}');

    expect(onSubmitMessage).toHaveBeenCalledTimes(1);
  });

  it('should not submit message on Enter key press when textarea is empty', async () => {
    const user = userEvent.setup();
    renderUserInput();

    await user.click(getTextarea());
    await user.keyboard('{Enter}');

    expect(onSubmitMessage).not.toHaveBeenCalled();
  });

  it('should not submit message on Shift+Enter key press', async () => {
    const user = userEvent.setup();
    renderUserInput();

    await user.type(getTextarea(), 'Test message{Shift>}{Enter}');

    expect(onSubmitMessage).not.toHaveBeenCalled();
  });

  it('should not call onCreateThread when concurrency is 1', async () => {
    const user = userEvent.setup();
    renderUserInput({ onCreateThread });

    await user.type(getTextarea(), 'Test message');
    await user.click(getSendButton());

    expect(onCreateThread).not.toHaveBeenCalled();
    expect(onSubmitMessage).toHaveBeenCalledTimes(1);
    expect(onSubmitMessage).toHaveBeenCalledWith(
      expect.objectContaining({ content: 'Test message' }),
    );
  });

  it('should fire N load-test sessions when concurrency > 1', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderUserInput({ onCreateThread });

    await user.selectOptions(getConcurrencySelect(), '5');
    await user.click(getSendButton());
    jest.runAllTimers();

    expect(onCreateThread).toHaveBeenCalledTimes(5);
    expect(onSubmitMessage).toHaveBeenCalledTimes(5);
    for (let iteration = 1; iteration <= 5; iteration++) {
      expect(onSubmitMessage).toHaveBeenNthCalledWith(
        iteration,
        expect.objectContaining({ content: `Add a text component named test-${iteration}` }),
      );
    }
    jest.useRealTimers();
  });

  it('should enable send button with empty textarea when concurrency > 1', async () => {
    const user = userEvent.setup();
    renderUserInput();

    await user.selectOptions(getConcurrencySelect(), '5');

    expect(getSendButton()).toBeEnabled();
  });

  it('should clear textarea after a load-test send', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    renderUserInput({ onCreateThread });
    const textarea = getTextarea();

    await user.type(textarea, 'Ignored content');
    await user.selectOptions(getConcurrencySelect(), '5');
    await user.click(getSendButton());

    expect(textarea).toHaveValue('');
    jest.runAllTimers();
    jest.useRealTimers();
  });
});

const defaultProps: UserInputProps = {
  texts: mockTexts,
  onSubmitMessage,
  enableCompactInterface: false,
};

const renderUserInput = (props?: Partial<UserInputProps>): void => {
  render(<UserInput {...defaultProps} {...props} />);
};

const getSendButton = (): HTMLElement => screen.getByRole('button', { name: mockTexts.send });

const getTextarea = (): HTMLElement => screen.getByPlaceholderText(mockTexts.textarea.placeholder);

const getConcurrencySelect = (): HTMLSelectElement =>
  screen.getByRole('combobox', { name: mockTexts.concurrencyLabel }) as HTMLSelectElement;
