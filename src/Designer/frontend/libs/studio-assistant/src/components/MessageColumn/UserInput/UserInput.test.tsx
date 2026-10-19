import { describe, expect, it, vi } from 'vitest';
import { UserInput } from './UserInput';
import { render, screen } from '@testing-library/react';
import type { UserInputProps } from './UserInput';
import type { CostOrgSelection } from '../../../types/CostOrgSelection';
import { mockTexts } from '../../../mocks/mockTexts';
import userEvent from '@testing-library/user-event';

// Test data
const onSubmitMessage = vi.fn();

describe('UserInput', () => {
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

  it('should restrict the file input to the allowed attachment file types', () => {
    renderUserInput({ enableCompactInterface: false });
    const fileInput = screen.getByLabelText(mockTexts.addAttachment, { selector: 'input' });

    expect(fileInput).toHaveAttribute('accept', '.pdf,.md,.txt,.png,.jpg,.jpeg,.gif,.webp');
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

  it('should not render the cost org select without a cost org selection', () => {
    renderUserInput();

    expect(
      screen.queryByRole('combobox', { name: mockTexts.costOrgSelect }),
    ).not.toBeInTheDocument();
  });

  it('should render the cost org select with the selected organization', () => {
    renderUserInput({ costOrgSelection: createCostOrgSelection() });

    expect(screen.getByRole('combobox', { name: mockTexts.costOrgSelect })).toHaveValue('ttd');
    expect(screen.getByRole('option', { name: 'Testdepartementet' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'nfk' })).toBeInTheDocument();
  });

  it('should call onChange when the user selects another cost org', async () => {
    const user = userEvent.setup();
    const costOrgSelection = createCostOrgSelection();
    renderUserInput({ costOrgSelection });

    await user.selectOptions(
      screen.getByRole('combobox', { name: mockTexts.costOrgSelect }),
      'nfk',
    );

    expect(costOrgSelection.onChange).toHaveBeenCalledWith('nfk');
  });

  it('should disable the cost org select while a workflow is active', () => {
    renderUserInput({ costOrgSelection: createCostOrgSelection(), workflowIsActive: true });

    expect(screen.getByRole('combobox', { name: mockTexts.costOrgSelect })).toBeDisabled();
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
});

const createCostOrgSelection = (): CostOrgSelection => ({
  options: [
    { value: 'ttd', label: 'Testdepartementet' },
    { value: 'nfk', label: 'nfk' },
  ],
  selected: 'ttd',
  onChange: vi.fn(),
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
