import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DropdownMenu, DropdownMenuProps } from './DropdownMenu';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';

describe('DropdownMenu', () => {
  const mockHandleClickMoreIcon = jest.fn();
  const mockHandleCloseMenu = jest.fn();
  const mockHandleClone = jest.fn();
  const mockHandleDelete = jest.fn();

  const defaultProps: DropdownMenuProps = {
    isOpen: true,
    handleClickMoreIcon: mockHandleClickMoreIcon,
    handleCloseMenu: mockHandleCloseMenu,
    handleClone: mockHandleClone,
    handleDelete: mockHandleDelete,
  };

  it('calls handleClickMoreIcon when the menu icon is clicked', async () => {
    const user = userEvent.setup();
    render(<DropdownMenu {...defaultProps} />);

    const menuButton = screen.getByRole('button', { name: textMock('policy_editor.more') });
    await act(() => user.click(menuButton));

    expect(mockHandleClickMoreIcon).toHaveBeenCalled();
  });

  it('does not render the dropdown menu when isOpen is false', () => {
    render(<DropdownMenu {...defaultProps} isOpen={false} />);

    const dropdownMenu = screen.queryByRole('button', {
      name: textMock('policy_editor.expandable_card_dropdown_copy'),
    });
    expect(dropdownMenu).not.toBeInTheDocument();
  });

  it('calls handleClone when the "Copy" button is clicked', async () => {
    const user = userEvent.setup();
    render(<DropdownMenu {...defaultProps} />);

    const copyButton = screen.getByRole('button', {
      name: textMock('policy_editor.expandable_card_dropdown_copy'),
    });
    await act(() => user.click(copyButton));

    expect(mockHandleClone).toHaveBeenCalled();
  });

  it('calls handleDelete when the "Delete" button is clicked', async () => {
    const user = userEvent.setup();
    render(<DropdownMenu {...defaultProps} />);

    const deleteButton = screen.getByRole('button', {
      name: textMock('general.delete'),
    });
    await act(() => user.click(deleteButton));

    expect(mockHandleDelete).toHaveBeenCalled();
  });
});
