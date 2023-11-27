import React from 'react';
import { render, act, screen } from '@testing-library/react';
import { DeletePopover, DeletePopoverProps } from './DeletePopover';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../../../../../../testing/mocks/i18nMock';

const mockOnClose = jest.fn();
const mockOnDelete = jest.fn();

const defaultProps: DeletePopoverProps = {
  onClose: mockOnClose,
  onDelete: mockOnDelete,
};

describe('DeletePopover', () => {
  afterEach(jest.clearAllMocks);

  it('does hides dropdown menu item by default when not open', () => {
    render(<DeletePopover {...defaultProps} />);

    const deleteButton = screen.queryByRole('button', {
      name: textMock('ux_editor.page_delete_confirm'),
    });
    expect(deleteButton).not.toBeInTheDocument();
  });

  it('opens the popover when the dropdown menu item is clicked', async () => {
    render(<DeletePopover {...defaultProps} />);

    const deleteButton = screen.queryByRole('button', {
      name: textMock('ux_editor.page_delete_confirm'),
    });
    expect(deleteButton).not.toBeInTheDocument();

    await openDropdownMenuItem();

    const deleteButtonAfter = screen.getByRole('button', {
      name: textMock('ux_editor.page_delete_confirm'),
    });
    expect(deleteButtonAfter).toBeInTheDocument();
  });

  it('calls "onClose" when cancel button is clicked', async () => {
    const user = userEvent.setup();
    render(<DeletePopover {...defaultProps} />);
    await openDropdownMenuItem();

    const cancelButton = screen.getByRole('button', { name: textMock('general.cancel') });
    await act(() => user.click(cancelButton));

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls "onDelete" when delete button is clicked', async () => {
    const user = userEvent.setup();
    render(<DeletePopover {...defaultProps} />);
    await openDropdownMenuItem();

    const deleteButton = screen.getByRole('button', {
      name: textMock('ux_editor.page_delete_confirm'),
    });
    await act(() => user.click(deleteButton));

    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });
});

const openDropdownMenuItem = async () => {
  const user = userEvent.setup();
  const dropdownMenuItem = screen.getByRole('menuitem', {
    name: textMock('ux_editor.page_menu_delete'),
  });
  await act(() => user.click(dropdownMenuItem));
};
