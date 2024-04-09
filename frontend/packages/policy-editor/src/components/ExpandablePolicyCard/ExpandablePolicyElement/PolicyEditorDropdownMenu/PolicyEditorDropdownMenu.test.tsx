import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { PolicyEditorDropdownMenuProps } from './PolicyEditorDropdownMenu';
import { PolicyEditorDropdownMenu } from './PolicyEditorDropdownMenu';
import { act } from 'react-dom/test-utils';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';

describe('PolicyEditorDropdownMenu', () => {
  afterEach(jest.clearAllMocks);

  const mockHandleClone = jest.fn();
  const mockHandleDelete = jest.fn();

  const defaultProps: PolicyEditorDropdownMenuProps = {
    handleClone: mockHandleClone,
    handleDelete: mockHandleDelete,
  };

  it('calls handleClone when the "Copy" button is clicked', async () => {
    const user = userEvent.setup();
    render(<PolicyEditorDropdownMenu {...defaultProps} />);

    const menuButton = screen.getByRole('button', { name: textMock('policy_editor.more') });
    await act(() => user.click(menuButton));

    const copyButton = screen.getByRole('menuitem', {
      name: textMock('policy_editor.expandable_card_dropdown_copy'),
    });
    await act(() => user.click(copyButton));

    expect(mockHandleClone).toHaveBeenCalledTimes(1);
  });

  it('calls handleDelete when the "Delete" button is clicked', async () => {
    const user = userEvent.setup();
    render(<PolicyEditorDropdownMenu {...defaultProps} />);

    const menuButton = screen.getByRole('button', { name: textMock('policy_editor.more') });
    await act(() => user.click(menuButton));

    const deleteButton = screen.getByRole('menuitem', {
      name: textMock('general.delete'),
    });
    await act(() => user.click(deleteButton));

    expect(mockHandleDelete).toHaveBeenCalledTimes(1);
  });
});
