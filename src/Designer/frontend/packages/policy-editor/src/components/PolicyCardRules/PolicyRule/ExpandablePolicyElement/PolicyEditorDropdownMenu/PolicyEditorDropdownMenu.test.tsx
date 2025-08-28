import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PolicyEditorDropdownMenuProps } from './PolicyEditorDropdownMenu';
import { PolicyEditorDropdownMenu } from './PolicyEditorDropdownMenu';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('PolicyEditorDropdownMenu', () => {
  afterEach(jest.clearAllMocks);

  const mockHandleClickMoreIcon = jest.fn();
  const mockHandleCloseMenu = jest.fn();
  const mockHandleClone = jest.fn();
  const mockHandleDelete = jest.fn();

  const defaultProps: PolicyEditorDropdownMenuProps = {
    isOpen: true,
    handleClickMoreIcon: mockHandleClickMoreIcon,
    handleCloseMenu: mockHandleCloseMenu,
    handleClone: mockHandleClone,
    handleDelete: mockHandleDelete,
  };

  it('calls handleClickMoreIcon when the menu icon is clicked', async () => {
    const user = userEvent.setup();
    render(<PolicyEditorDropdownMenu {...defaultProps} />);

    const menuButton = screen.getByRole('button', { name: textMock('policy_editor.more') });
    await user.click(menuButton);

    expect(mockHandleClickMoreIcon).toHaveBeenCalledTimes(1);
  });

  it('does not render the dropdown menu when isOpen is false', () => {
    render(<PolicyEditorDropdownMenu {...defaultProps} isOpen={false} />);

    const dropdownMenu = screen.queryByRole('button', {
      name: textMock('policy_editor.expandable_card_dropdown_copy'),
    });
    expect(dropdownMenu).not.toBeInTheDocument();
  });

  it('calls handleClone when the "Copy" button is clicked', async () => {
    const user = userEvent.setup();
    render(<PolicyEditorDropdownMenu {...defaultProps} />);

    const copyButton = screen.getByRole('menuitem', {
      name: textMock('policy_editor.expandable_card_dropdown_copy'),
    });
    await user.click(copyButton);

    expect(mockHandleClone).toHaveBeenCalledTimes(1);
  });

  it('calls handleDelete when the "Delete" button is clicked', async () => {
    const user = userEvent.setup();
    render(<PolicyEditorDropdownMenu {...defaultProps} />);

    const deleteButton = screen.getByRole('menuitem', {
      name: textMock('general.delete'),
    });
    await user.click(deleteButton);

    expect(mockHandleDelete).toHaveBeenCalledTimes(1);
  });
});
