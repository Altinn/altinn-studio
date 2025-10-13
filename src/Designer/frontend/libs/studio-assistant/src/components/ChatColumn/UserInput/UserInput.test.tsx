import React from 'react';
import { UserInput } from './UserInput';
import { render, screen } from '@testing-library/react';
import type { UserInputProps } from './UserInput';
import { mockTexts } from '../../../mocks/mockTexts';
import userEvent from '@testing-library/user-event';

// Test data
const onSubmitMessage = jest.fn();

describe('UserInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render textarea with placeholder', () => {
    renderUserInput();
    const textarea = screen.getByPlaceholderText(mockTexts.textareaPlaceholder);

    expect(textarea).toBeInTheDocument();
  });

  it('should render send button', () => {
    renderUserInput();
    const sendButton = screen.getByRole('button', { name: mockTexts.send });

    expect(sendButton).toBeInTheDocument();
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

  it('should not "allow app changes" switch when enableCompactInterface is true', () => {
    renderUserInput({ enableCompactInterface: true });
    const allowAppChangesSwitch = screen.queryByLabelText(mockTexts.allowAppChangesSwitch);

    expect(allowAppChangesSwitch).not.toBeInTheDocument();
  });

  it('should disable send button when textarea is empty', () => {
    renderUserInput();
    const sendButton = screen.getByRole('button', { name: mockTexts.send });

    expect(sendButton).toBeDisabled();
  });

  it('should enable send button when textarea has content', async () => {
    const user = userEvent.setup();
    renderUserInput();
    const textarea = screen.getByPlaceholderText(mockTexts.textareaPlaceholder);
    const sendButton = screen.getByRole('button', { name: mockTexts.send });

    await user.type(textarea, 'Test message');

    expect(sendButton).toBeEnabled();
  });

  it('should call onSubmitMessage when send button is clicked', async () => {
    const user = userEvent.setup();
    renderUserInput();
    const textarea = screen.getByPlaceholderText(mockTexts.textareaPlaceholder);
    const sendButton = screen.getByRole('button', { name: mockTexts.send });

    await user.type(textarea, 'Test message');
    await user.click(sendButton);

    expect(onSubmitMessage).toHaveBeenCalledTimes(1);
    expect(onSubmitMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        content: 'Test message',
      }),
    );
  });

  it('should clear textarea after submitting message', async () => {
    const user = userEvent.setup();
    renderUserInput();
    const textarea = screen.getByPlaceholderText(mockTexts.textareaPlaceholder);
    const sendButton = screen.getByRole('button', { name: mockTexts.send });

    await user.type(textarea, 'Test message');
    await user.click(sendButton);

    expect(textarea).toHaveValue('');
  });

  it('should submit message on Enter key press', async () => {
    const user = userEvent.setup();
    renderUserInput();
    const textarea = screen.getByPlaceholderText(mockTexts.textareaPlaceholder);

    await user.type(textarea, 'Test message{Enter}');

    expect(onSubmitMessage).toHaveBeenCalledTimes(1);
  });

  it('should not submit message on Shift+Enter key press', async () => {
    const user = userEvent.setup();
    renderUserInput();
    const textarea = screen.getByPlaceholderText(mockTexts.textareaPlaceholder);

    await user.type(textarea, 'Test message{Shift>}{Enter}');

    expect(onSubmitMessage).not.toHaveBeenCalled();
  });

  it('should not submit empty or whitespace-only messages', async () => {
    const user = userEvent.setup();
    renderUserInput();
    const textarea = screen.getByPlaceholderText(mockTexts.textareaPlaceholder);
    const sendButton = screen.getByRole('button', { name: mockTexts.send });

    await user.type(textarea, '   ');
    await user.click(sendButton);

    expect(onSubmitMessage).not.toHaveBeenCalled();
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
