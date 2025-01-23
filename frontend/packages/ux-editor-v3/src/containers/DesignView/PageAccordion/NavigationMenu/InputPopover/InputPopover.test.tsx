import React from 'react';
import { render, screen } from '@testing-library/react';
import type { InputPopoverProps } from './InputPopover';
import { InputPopover } from './InputPopover';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';

const mockOldName: string = 'layout1';
const mockNewValue: string = '1';
const mockNewName: string = `${mockOldName}${mockNewValue}`;

const mockLayoutName1: string = mockOldName;
const mockLayoutName2: string = 'layout2';
const mockLayoutName3: string = 'layout13';
const mockLayoutOrder: string[] = [mockLayoutName1, mockLayoutName2, mockLayoutName3];

const mockSaveNewName = jest.fn();
const mockOnClose = jest.fn();

const defaultProps: InputPopoverProps = {
  disabled: false,
  oldName: mockOldName,
  layoutOrder: mockLayoutOrder,
  saveNewName: mockSaveNewName,
  onClose: mockOnClose,
};

describe('InputPopover', () => {
  afterEach(jest.clearAllMocks);

  it('does hides dropdown menu item by default when not open', () => {
    render(<InputPopover {...defaultProps} />);

    const input = screen.queryByLabelText(textMock('ux_editor.input_popover_label'));
    expect(input).not.toBeInTheDocument();
  });

  it('opens the popover when the dropdown menu item is clicked', async () => {
    render(<InputPopover {...defaultProps} />);

    const input = screen.queryByLabelText(textMock('ux_editor.input_popover_label'));
    expect(input).not.toBeInTheDocument();

    await openDropdownMenuItem();

    const inputAfter = screen.getByLabelText(textMock('ux_editor.input_popover_label'));
    expect(inputAfter).toBeInTheDocument();
  });

  it('saves the new name on Enter key press', async () => {
    const user = userEvent.setup();
    render(<InputPopover {...defaultProps} />);

    await openDropdownMenuItem();

    const input = screen.getByLabelText(textMock('ux_editor.input_popover_label'));
    expect(input).toHaveValue(mockOldName);

    await user.type(input, mockNewValue);
    await user.keyboard('{Enter}');

    expect(mockSaveNewName).toHaveBeenCalledTimes(1);
    expect(mockSaveNewName).toHaveBeenCalledWith(mockNewName);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls the "saveNewName" function when the confirm button is clicked', async () => {
    const user = userEvent.setup();
    render(<InputPopover {...defaultProps} />);
    await openDropdownMenuItem();

    const input = screen.getByLabelText(textMock('ux_editor.input_popover_label'));
    expect(input).toHaveValue(mockOldName);

    await user.type(input, mockNewValue);

    const inputAfter = screen.getByLabelText(textMock('ux_editor.input_popover_label'));
    expect(inputAfter).toHaveValue(mockNewName);

    const confirmButton = screen.getByRole('button', {
      name: textMock('ux_editor.input_popover_save_button'),
    });
    await user.click(confirmButton);

    expect(mockSaveNewName).toHaveBeenCalledTimes(1);
    expect(mockSaveNewName).toHaveBeenCalledWith(mockNewName);
  });

  it('does not call "saveNewName" when input is same as old value', async () => {
    const user = userEvent.setup();
    render(<InputPopover {...defaultProps} />);
    await openDropdownMenuItem();

    const input = screen.getByLabelText(textMock('ux_editor.input_popover_label'));
    expect(input).toHaveValue(mockOldName);

    await user.tab();
    expect(mockSaveNewName).toHaveBeenCalledTimes(0);
  });

  it('cancels the new name on Escape key press', async () => {
    const user = userEvent.setup();
    render(<InputPopover {...defaultProps} />);
    await openDropdownMenuItem();

    const input = screen.getByLabelText(textMock('ux_editor.input_popover_label'));
    expect(input).toHaveValue(mockOldName);

    await user.type(input, mockNewValue);
    await user.keyboard('{Escape}');

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockSaveNewName).toHaveBeenCalledTimes(0);
  });

  it('displays error message if new name is not unique', async () => {
    const user = userEvent.setup();
    render(<InputPopover {...defaultProps} />);
    await openDropdownMenuItem();

    const input = screen.getByLabelText(textMock('ux_editor.input_popover_label'));
    expect(input).toHaveValue(mockOldName);

    const errorMessage = screen.queryByText(textMock('ux_editor.pages_error_unique'));
    expect(errorMessage).not.toBeInTheDocument();

    await user.type(input, '3');

    const errorMessageAfter = screen.getByText(textMock('ux_editor.pages_error_unique'));
    expect(errorMessageAfter).toBeInTheDocument();
  });

  it('displays error message if new name is empty', async () => {
    const user = userEvent.setup();
    render(<InputPopover {...defaultProps} />);
    await openDropdownMenuItem();

    const input = screen.getByLabelText(textMock('ux_editor.input_popover_label'));
    expect(input).toHaveValue(mockOldName);

    const errorMessage = screen.queryByText(textMock('ux_editor.pages_error_empty'));
    expect(errorMessage).not.toBeInTheDocument();

    await user.clear(input);

    const errorMessageAfter = screen.getByText(textMock('ux_editor.pages_error_empty'));
    expect(errorMessageAfter).toBeInTheDocument();
  });

  it('displays error message if new name is too long', async () => {
    const user = userEvent.setup();
    render(<InputPopover {...defaultProps} />);
    await openDropdownMenuItem();

    const input = screen.getByLabelText(textMock('ux_editor.input_popover_label'));
    expect(input).toHaveValue(mockOldName);

    const errorMessage = screen.queryByText(textMock('validation_errors.name_invalid'));
    expect(errorMessage).not.toBeInTheDocument();

    const longWord = '123456789012345678901234567890';
    await user.type(input, longWord);

    const errorMessageAfter = screen.getByText(textMock('validation_errors.name_invalid'));
    expect(errorMessageAfter).toBeInTheDocument();
  });

  it('displays error message if new name has illegal format', async () => {
    const user = userEvent.setup();
    render(<InputPopover {...defaultProps} />);
    await openDropdownMenuItem();

    const input = screen.getByLabelText(textMock('ux_editor.input_popover_label'));
    expect(input).toHaveValue(mockOldName);

    const errorMessage = screen.queryByText(textMock('validation_errors.name_invalid'));
    expect(errorMessage).not.toBeInTheDocument();

    const illegalWord = ',,,';
    await user.type(input, illegalWord);

    const errorMessageAfter = screen.getByText(textMock('validation_errors.name_invalid'));
    expect(errorMessageAfter).toBeInTheDocument();
  });

  it('closes the popover when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<InputPopover {...defaultProps} />);
    await openDropdownMenuItem();

    const button = screen.getByRole('button', { name: textMock('general.cancel') });
    await user.click(button);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});

const openDropdownMenuItem = async () => {
  const user = userEvent.setup();
  const dropdownMenuItem = screen.getByRole('menuitem', {
    name: textMock('ux_editor.page_menu_edit'),
  });
  await user.click(dropdownMenuItem);
};
