import React from 'react';
import { render as renderRtl, screen, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';

import * as useMediaQuery from '../../hooks/useMediaQuery';

import type { AnimateHeightProps } from './AnimateHeight';
import { AnimateHeight } from './AnimateHeight';

// Test data:
const defaultProps: AnimateHeightProps = {
  open: false,
};

// Mocks:
jest.useFakeTimers();
jest.mock('../../hooks/useMediaQuery', () => ({
  useMediaQuery: jest.fn().mockReturnValue(false),
}));
jest.mock('./AnimateHeight.module.css', () => ({
  root: 'root',
  open: 'open',
  closed: 'closed',
  openingOrClosing: 'openingOrClosing',
}));

/* eslint-disable testing-library/no-node-access */
describe('AnimateHeight', () => {
  beforeEach(() => {
    jest.spyOn(useMediaQuery, 'useMediaQuery').mockReturnValue(false); // Set prefers-reduced-motion to false
  });

  it('Renders children', () => {
    const childTestId = 'content';
    const children = <div data-testid={childTestId} />;
    render({ children });
    expect(screen.getByTestId(childTestId)).toBeInTheDocument();
  });

  it('Appends given className to root element', () => {
    const className = 'foo';
    const { container } = render({ className });
    expect(container.firstChild).toHaveClass('root');
    expect(container.firstChild).toHaveClass(className);
  });

  it('Appends given style to root element', () => {
    const style = { color: 'red' };
    const { container } = render({ style });
    expect(container.firstChild).toHaveStyle({ height: 0 });
    expect(container.firstChild).toHaveStyle(style);
  });

  it('Accepts additional <div> props', () => {
    const id = 'foo';
    const { container } = render({ id });
    expect(container.firstChild).toHaveAttribute('id', id);
  });

  it('Sets class to "open" when open', () => {
    const { container } = render({ open: true });
    expect(container.firstChild).toHaveClass('open');
  });

  it('Sets class to "closed" when closed', () => {
    const { container } = render({ open: false });
    expect(container.firstChild).toHaveClass('closed');
  });

  it('Sets class to "openingOrClosing" when opening and "open" when timer has run', async () => {
    const { container, rerender } = render({ open: false });
    rerender(<AnimateHeight open />);
    expect(container.firstChild).toHaveClass('openingOrClosing');
    await act(jest.runAllTimers);
    await waitFor(() => {
      expect(container.firstChild).not.toHaveClass('openingOrClosing');
    });
    expect(container.firstChild).toHaveClass('open');
  });

  it('Sets class to "openingOrClosing" when closing and "closed" when timer has run', async () => {
    const { container, rerender } = render({ open: true });
    rerender(<AnimateHeight open={false} />);
    expect(container.firstChild).toHaveClass('openingOrClosing');
    await act(jest.runAllTimers);
    await waitFor(() => {
      expect(container.firstChild).not.toHaveClass('openingOrClosing');
    });
    expect(container.firstChild).toHaveClass('closed');
  });

  it('Sets class to "open" immediately when opening and "prefers-reduced-motion" is set', () => {
    jest.spyOn(useMediaQuery, 'useMediaQuery').mockReturnValue(true);
    const { container, rerender } = render({ open: false });
    rerender(<AnimateHeight open />);
    expect(container.firstChild).toHaveClass('open');
    expect(container.firstChild).not.toHaveClass('openingOrClosing');
  });

  it('Sets class to "closed" immediately when closing and "prefers-reduced-motion" is set', () => {
    jest.spyOn(useMediaQuery, 'useMediaQuery').mockReturnValue(true);
    const { container, rerender } = render({ open: true });
    rerender(<AnimateHeight open={false} />);
    expect(container.firstChild).toHaveClass('closed');
    expect(container.firstChild).not.toHaveClass('openingOrClosing');
  });
});

const render = (props: Partial<AnimateHeightProps> = {}) =>
  renderRtl(<AnimateHeight {...defaultProps} {...props} />);
