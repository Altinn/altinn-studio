import React from 'react';
import { render, act, screen } from '@testing-library/react';
import { InputPopover, InputPopoverProps } from './InputPopover';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../../../../../../testing/mocks/i18nMock';

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
  oldName: mockOldName,
  layoutOrder: mockLayoutOrder,
  saveNewName: mockSaveNewName,
  onClose: mockOnClose,
  open: true,
  trigger: <button>My trigger</button>,
};

describe('InputPopover', () => {
  const user = userEvent.setup();
  afterEach(jest.clearAllMocks);

  it('saves the new name on blur with no errors', async () => {
    render(<InputPopover {...defaultProps} />);

    const input = screen.getByLabelText(textMock('ux_editor.input_popover_label'));
    expect(input).toHaveValue(mockOldName);

    await act(() => user.type(input, mockNewValue));

    const inputAfter = screen.getByLabelText(textMock('ux_editor.input_popover_label'));
    expect(inputAfter).toHaveValue(mockNewName);

    await act(() => user.tab());
    expect(mockSaveNewName).toHaveBeenCalledTimes(1);
    expect(mockSaveNewName).toHaveBeenCalledWith(mockNewName);
  });

  it('does not call "saveNewName" when input is same as old value', async () => {
    render(<InputPopover {...defaultProps} />);

    const input = screen.getByLabelText(textMock('ux_editor.input_popover_label'));
    expect(input).toHaveValue(mockOldName);

    await act(() => user.tab());
    expect(mockSaveNewName).toHaveBeenCalledTimes(0);
  });

  it('saves the new name on Enter key press', async () => {
    render(<InputPopover {...defaultProps} />);

    const input = screen.getByLabelText(textMock('ux_editor.input_popover_label'));
    expect(input).toHaveValue(mockOldName);

    await act(() => user.type(input, mockNewValue));
    await act(() => user.keyboard('{Enter}'));

    expect(mockSaveNewName).toHaveBeenCalledTimes(1);
    expect(mockSaveNewName).toHaveBeenCalledWith(mockNewName);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('cancels the new name on Escape key press', async () => {
    render(<InputPopover {...defaultProps} />);

    const input = screen.getByLabelText(textMock('ux_editor.input_popover_label'));
    expect(input).toHaveValue(mockOldName);

    await act(() => user.type(input, mockNewValue));
    await act(() => user.keyboard('{Escape}'));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockSaveNewName).toHaveBeenCalledTimes(0);
  });

  it('displays error message if new name is not unique', async () => {
    render(<InputPopover {...defaultProps} />);

    const input = screen.getByLabelText(textMock('ux_editor.input_popover_label'));
    expect(input).toHaveValue(mockOldName);

    const errorMessage = screen.queryByText(textMock('ux_editor.pages_error_unique'));
    expect(errorMessage).not.toBeInTheDocument();

    await act(() => user.type(input, '3'));

    const errorMessageAfter = screen.getByText(textMock('ux_editor.pages_error_unique'));
    expect(errorMessageAfter).toBeInTheDocument();
  });

  it('displays error message if new name is empty', async () => {
    render(<InputPopover {...defaultProps} />);

    const input = screen.getByLabelText(textMock('ux_editor.input_popover_label'));
    expect(input).toHaveValue(mockOldName);

    const errorMessage = screen.queryByText(textMock('ux_editor.pages_error_empty'));
    expect(errorMessage).not.toBeInTheDocument();

    await act(() => user.clear(input));

    const errorMessageAfter = screen.getByText(textMock('ux_editor.pages_error_empty'));
    expect(errorMessageAfter).toBeInTheDocument();
  });

  it('displays error message if new name is too long', async () => {
    render(<InputPopover {...defaultProps} />);

    const input = screen.getByLabelText(textMock('ux_editor.input_popover_label'));
    expect(input).toHaveValue(mockOldName);

    const errorMessage = screen.queryByText(textMock('ux_editor.pages_error_length'));
    expect(errorMessage).not.toBeInTheDocument();

    const longWord = '123456789012345678901234567890';
    await act(() => user.type(input, longWord));

    const errorMessageAfter = screen.getByText(textMock('ux_editor.pages_error_length'));
    expect(errorMessageAfter).toBeInTheDocument();
  });

  it('displays error message if new name has illegal format', async () => {
    render(<InputPopover {...defaultProps} />);

    const input = screen.getByLabelText(textMock('ux_editor.input_popover_label'));
    expect(input).toHaveValue(mockOldName);

    const errorMessage = screen.queryByText(textMock('ux_editor.pages_error_format'));
    expect(errorMessage).not.toBeInTheDocument();

    const illegalWord = ',,,';
    await act(() => user.type(input, illegalWord));

    const errorMessageAfter = screen.getByText(textMock('ux_editor.pages_error_format'));
    expect(errorMessageAfter).toBeInTheDocument();
  });

  it('closes the popover when cancel button is clicked', async () => {
    render(<InputPopover {...defaultProps} />);

    const button = screen.getByRole('button', { name: textMock('general.cancel') });
    await act(() => user.click(button));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
