import React from 'react';
import { render, screen } from '@testing-library/react';
import { IconImage } from './Icon';
import { ActionMenu, IActionMenuProps } from './ActionMenu';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

// Test data:
const openButtonText = 'Open';
const icon = IconImage.Element;
const lists = [
  [
    { action: jest.fn(), icon, text: 'Item 1A' },
    { action: jest.fn(), icon, text: 'Item 1B' }
  ],
  [
    { action: jest.fn(), icon, text: 'Item 2A' },
    { action: jest.fn(), icon, text: 'Item 2B' }
  ]
];
const defaultProps: IActionMenuProps = { openButtonText, lists };

const renderActionMenu = () => render(<ActionMenu {...defaultProps}/>);

test('Renders open button', () => {
  renderActionMenu();
  expect(screen.getByText(openButtonText)).toBeDefined();
});

test('All items are present', () => {
  renderActionMenu();
  lists.forEach((items) => items.forEach(({text}) => {
    expect(screen.getByText(text)).toBeDefined();
  }));
});

test('All menu item buttons call their respective action on click', async () => {
  renderActionMenu();
  for (const list of lists) {
    for (const { action, text } of list) {
      await user.click(screen.getByText(text));
      expect(action).toHaveBeenCalledTimes(1);
    }
  }
});

test('Menu item button loses focus when clicked', async () => {
  renderActionMenu();
  const { text } = lists[0][0];
  await user.click(screen.getByText(text));
  expect(screen.getByText(text)).not.toHaveFocus();
});
