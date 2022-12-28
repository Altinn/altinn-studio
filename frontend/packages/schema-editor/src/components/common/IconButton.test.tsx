import React from 'react';
import { render, screen } from '@testing-library/react';
import { IconImage } from './Icon';
import type { IconButtonProps } from './IconButton';
import { IconButton } from './IconButton';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

jest.mock('./Icon.module.css', () => ({ element: 'element' }));

const icon = IconImage.Element;
const onClick = jest.fn();
const defaultProps: IconButtonProps = { icon, onClick };

const renderIconButton = (props?: Partial<IconButtonProps>) =>
  render(<IconButton {...defaultProps} {...props} />);

test('Button appears', () => {
  renderIconButton();
  expect(screen.getByRole('button')).toBeDefined();
});

test('Icon appears', () => {
  const { container } = renderIconButton();
  expect(container.querySelectorAll(`.${icon}`)).toHaveLength(1);
});

test('onCLick handler is called when button is clicked', async () => {
  renderIconButton();
  await user.click(screen.getByRole('button'));
  expect(onClick).toHaveBeenCalledTimes(1);
});

test('Button has given id', () => {
  const id = 'test';
  const { container } = renderIconButton({ id });
  expect(container.querySelectorAll(`#${id}`)).toHaveLength(1);
});

test('Button has given class', () => {
  const className = 'test';
  renderIconButton({ className });
  expect(screen.getByRole('button')).toHaveClass(className);
});

test('Button has given label', () => {
  const ariaLabel = 'Lorem ipsum';
  renderIconButton({ ariaLabel });
  expect(screen.getByRole('button')).toHaveAccessibleName(ariaLabel);
});
