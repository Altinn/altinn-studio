import React from 'react';
import { act } from 'react-dom/test-utils';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TopToolbarButton } from './TopToolbarButton';

const renderButton = (text: string, style = 'text', disabled = false) => {
  const handleClick = jest.fn();
  const user = userEvent.setup();
  act(() => {
    render(
      <TopToolbarButton
        id='toolbar-test-button'
        faIcon='fa ai-trash'
        hideText={style === 'icon'}
        onClick={handleClick}
        disabled={disabled}
        warning={style === 'warning'}
      >
        {text}
      </TopToolbarButton>,
    );
  });
  return { handleClick, user };
};

test('renders a text button', () => {
  renderButton('delete');
  const button = screen.getByRole('button');
  expect(button).toBeDefined();
  expect(button.textContent).toBe('delete');
});

test('renders a icon only button with aria-label', () => {
  renderButton('delete', 'icon');
  const button = screen.getByRole('button');
  expect(button).toBeDefined();
  expect(button.textContent).not.toBe('delete');
  expect(button.getAttribute('aria-label')).toBe('delete');
  expect(button.getAttribute('class')).toContain('makeStyles-iconButton');
});

test('renders a warning button', () => {
  renderButton('delete', 'warning');
  const button = screen.getByRole('button');
  expect(button).toBeDefined();
  expect(button.getAttribute('class')).toContain('warn');
});

test('reacts to being clicked', async () => {
  const { handleClick, user } = renderButton('delete', 'text');
  await user.click(screen.getByRole('button'));
  expect(handleClick).toBeCalledTimes(1);
});

test('rects to being clicked (icon button)', async () => {
  const { handleClick, user } = renderButton('delete', 'icon');
  await user.click(screen.getByRole('button'));
  expect(handleClick).toBeCalledTimes(1);
});

test('does nothing when disabled', () => {
  const { handleClick } = renderButton('delete', 'text', true);
  fireEvent.click(screen.getByRole('button'));
  expect(handleClick).toBeCalledTimes(0);
});

test('does nothing when disabled (icon button)', () => {
  const { handleClick } = renderButton('delete', 'icon', true);
  fireEvent.click(screen.getByRole('button'));
  expect(handleClick).toBeCalledTimes(0);
});
