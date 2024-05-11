import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { IconImage } from './Icon';
import type { IActionMenuProps } from './ActionMenu';
import { ActionMenu } from './ActionMenu';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

// Test data:
const openButtonText = 'Open';
const icon = IconImage.Element;
const items = [
  { action: jest.fn(), className: 'item-class', icon, text: 'Item 1' },
  { action: jest.fn(), icon, text: 'Item 2' },
];
const className = 'root-class-name';
const defaultProps: IActionMenuProps = { className, items, openButtonText };

const renderActionMenu = () => render(<ActionMenu {...defaultProps} />);

describe('ActionMenu', () => {
  test('Renders open button', () => {
    renderActionMenu();
    expect(screen.getByRole('button', { name: openButtonText })).toBeDefined();
  });

  test('All items are present', () => {
    renderActionMenu();
    items.forEach(({ text }) => expect(screen.getByRole('menuitem', { name: text })).toBeDefined());
  });

  test('All menu item buttons call their respective action on click', async () => {
    renderActionMenu();
    for (const { action, text } of items) {
      user.click(screen.getByRole('menuitem', { name: text }));
      await waitFor(() => expect(action).toHaveBeenCalledTimes(1));
    }
  });

  test('Menu item button loses focus when clicked', async () => {
    renderActionMenu();
    const { text } = items[0];
    user.click(screen.getByRole('menuitem', { name: text }));
    await waitFor(() => expect(screen.getByText(text)).not.toHaveFocus());
  });

  test('Menu item has given class name', () => {
    renderActionMenu();
    const [firstItem] = screen.getAllByRole('listitem');
    expect(firstItem).toHaveClass('item-class');
  });
});
