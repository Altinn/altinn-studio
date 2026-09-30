import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import type { PolicyEditorDropdownMenuProps } from './PolicyEditorDropdownMenu';
import { PolicyEditorDropdownMenu } from './PolicyEditorDropdownMenu';
import { textMock } from '@studio/testing/mocks/i18nMock';

describe('PolicyEditorDropdownMenu', () => {
  afterEach(jest.clearAllMocks);

  const mockHandleClone = jest.fn();
  const mockHandleDelete = jest.fn();

  const defaultProps: PolicyEditorDropdownMenuProps = {
    handleClone: mockHandleClone,
    handleDelete: mockHandleDelete,
  };

  it('keeps the menu closed until the menu icon is clicked', async () => {
    const user = userEvent.setup();
    render(<PolicyEditorDropdownMenu {...defaultProps} />);

    expect(getMenuButton()).toHaveAttribute('aria-expanded', 'false');

    await user.click(getMenuButton());

    expect(getMenuButton()).toHaveAttribute('aria-expanded', 'true');
  });

  it('calls handleClone when the "Copy" button is clicked', async () => {
    const user = userEvent.setup();
    await renderAndOpenMenu(user);

    await user.click(
      screen.getByRole('menuitem', {
        name: textMock('policy_editor.expandable_card_dropdown_copy'),
      }),
    );

    expect(mockHandleClone).toHaveBeenCalledTimes(1);
  });

  it('calls handleDelete when the "Delete" button is clicked', async () => {
    const user = userEvent.setup();
    await renderAndOpenMenu(user);

    await user.click(screen.getByRole('menuitem', { name: textMock('general.delete') }));

    expect(mockHandleDelete).toHaveBeenCalledTimes(1);
  });

  it('closes the menu when an item is clicked', async () => {
    const user = userEvent.setup();
    await renderAndOpenMenu(user);

    await user.click(screen.getByRole('menuitem', { name: textMock('general.delete') }));

    expect(getMenuButton()).toHaveAttribute('aria-expanded', 'false');
  });

  const getMenuButton = (): HTMLElement =>
    screen.getByRole('button', { name: textMock('policy_editor.more') });

  const renderAndOpenMenu = async (user: UserEvent): Promise<void> => {
    render(<PolicyEditorDropdownMenu {...defaultProps} />);
    await user.click(getMenuButton());
  };
});
