import React from 'react';
import { act } from 'react-dom/test-utils';
import TopToolbarButton from './TopToolbarButton';
import {
  fireEvent,
  render,
  RenderResult,
  screen,
} from '@testing-library/react';

const renderButton = (text: string, style = 'text', disabled = false) => {
  const handleClick = jest.fn();
  act(() => {
    render(
      <TopToolbarButton
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
  return handleClick;
};

test('renders a text button', async () => {
  renderButton('delete');
  const button = await screen.findByRole('button');
  expect(button).toBeDefined();
  expect(button.textContent).toBe('delete');
});

test('renders a icon only button with aria-label', async () => {
  renderButton('delete', 'icon');
  const button = await screen.findByRole('button');
  expect(button).toBeDefined();
  expect(button.textContent).not.toBe('delete');
  expect(button.getAttribute('aria-label')).toBe('delete');
  expect(button.getAttribute('class')).toContain('makeStyles-iconButton');
});

test('renders a warning button', async () => {
  renderButton('delete', 'warning');
  const button = await screen.findByRole('button');
  expect(button).toBeDefined();
  expect(button.getAttribute('class')).toContain('warn');
});

test('reacts to being clicked', async () => {
  const handleClick = renderButton('delete', 'text');
  const button = await screen.findByRole('button');
  fireEvent.click(button);
  expect(handleClick).toBeCalledTimes(1);
});

test('rects to being clicked (icon button)', async () => {
  const handleClick = renderButton('delete', 'icon');
  const button = await screen.findByRole('button');
  fireEvent.click(button);
  expect(handleClick).toBeCalledTimes(1);
});

test('does nothing when disabled', async () => {
  const handleClick = renderButton('delete', 'text', true);
  const button = await screen.findByRole('button');
  fireEvent.click(button);
  expect(handleClick).toBeCalledTimes(0);
});

test('does nothing when disabled (icon button)', async () => {
  const handleClick = renderButton('delete', 'icon', true);
  const button = await screen.findByRole('button');
  fireEvent.click(button);
  expect(handleClick).toBeCalledTimes(0);
});
