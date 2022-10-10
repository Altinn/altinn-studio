import React from 'react';
import { render, screen } from '@testing-library/react';
import { IconImage } from './Icon';
import { ActionMenu, IActionMenuProps } from './ActionMenu';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

// Test data:
const openButtonText = 'Open';
const icon = IconImage.Element;
const items = [
  { action: jest.fn(), className: 'item-class', icon, text: 'Item 1' },
  { action: jest.fn(), icon, text: 'Item 2' }
];
const className = 'root-class-name';
const defaultProps: IActionMenuProps = { className, items, openButtonText };

const renderActionMenu = () => render(<ActionMenu {...defaultProps}/>);

test('Renders open button', () => {
  renderActionMenu();
  expect(screen.getByText(openButtonText)).toBeDefined();
});

test('All items are present', () => {
  renderActionMenu();
  items.forEach(({text}) => expect(screen.getByText(text)).toBeDefined());
});

test('All menu item buttons call their respective action on click', async () => {
  renderActionMenu();
  for (const { action, text } of items) {
    await user.click(screen.getByText(text));
    expect(action).toHaveBeenCalledTimes(1);
  }
});

test('Menu item button loses focus when clicked', async () => {
  renderActionMenu();
  const { text } = items[0];
  await user.click(screen.getByText(text));
  expect(screen.getByText(text)).not.toHaveFocus();
});

test('Menu item has given class name', () => {
  const { container } = renderActionMenu();
  expect(container.querySelector(`.${items[0].className}`)).toBeDefined();
});

test('Root element has given class name', () => {
  const { container } = renderActionMenu();
  expect(container.querySelector(`.${className}`)).toBeDefined();
});
