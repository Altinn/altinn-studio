import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render, screen, waitFor } from '@testing-library/react';

import * as useMediaQuery from '../../hooks/useMediaQuery';

import type { StudioAnimateHeightProps } from './StudioAnimateHeight';
import { StudioAnimateHeight } from './StudioAnimateHeight';

// Test data:
const defaultProps: StudioAnimateHeightProps = {
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
describe('StudioAnimateHeight', () => {
  beforeEach(() => {
    jest.spyOn(useMediaQuery, 'useMediaQuery').mockReturnValue(false); // Set prefers-reduced-motion to false
  });

  it('Renders children', () => {
    const childTestId = 'content';
    const children = <div data-testid={childTestId} />;
    renderComponent({ children });
    expect(screen.getByTestId(childTestId)).toBeInTheDocument();
  });

  it('Appends given className to root element', () => {
    const className = 'foo';
    const { container } = renderComponent({ className });
    expect(container.firstChild).toHaveClass('root');
    expect(container.firstChild).toHaveClass(className);
  });

  it('Appends given style to root element', () => {
    const style = { color: 'red' };
    const { container } = renderComponent({ style });
    expect(container.firstChild).toHaveStyle({ height: 0 });
    expect(container.firstChild).toHaveStyle(style);
  });

  it('Accepts additional <div> props', () => {
    const id = 'foo';
    const { container } = renderComponent({ id });
    expect(container.firstChild).toHaveAttribute('id', id);
  });

  it('Sets class to "open" when open', () => {
    const { container } = renderComponent({ open: true });
    expect(container.firstChild).toHaveClass('open');
  });

  it('Sets class to "closed" when closed', () => {
    const { container } = renderComponent({ open: false });
    expect(container.firstChild).toHaveClass('closed');
  });

  it('Sets class to "openingOrClosing" when opening and "open" when timer has run', async () => {
    const { container, rerender } = renderComponent({ open: false });
    rerender(<StudioAnimateHeight open />);
    expect(container.firstChild).toHaveClass('openingOrClosing');
    await waitFor(() => jest.runAllTimers);
    await waitFor(() => {
      expect(container.firstChild).not.toHaveClass('openingOrClosing');
    });
    expect(container.firstChild).toHaveClass('open');
  });

  it('Sets class to "openingOrClosing" when closing and "closed" when timer has run', async () => {
    const { container, rerender } = renderComponent({ open: true });
    rerender(<StudioAnimateHeight open={false} />);
    expect(container.firstChild).toHaveClass('openingOrClosing');
    await waitFor(() => jest.runAllTimers);
    await waitFor(() => {
      expect(container.firstChild).not.toHaveClass('openingOrClosing');
    });
    expect(container.firstChild).toHaveClass('closed');
  });

  it('Sets class to "open" immediately when opening and "prefers-reduced-motion" is set', () => {
    jest.spyOn(useMediaQuery, 'useMediaQuery').mockReturnValue(true);
    const { container, rerender } = renderComponent({ open: false });
    rerender(<StudioAnimateHeight open />);
    expect(container.firstChild).toHaveClass('open');
    expect(container.firstChild).not.toHaveClass('openingOrClosing');
  });

  it('Sets class to "closed" immediately when closing and "prefers-reduced-motion" is set', () => {
    jest.spyOn(useMediaQuery, 'useMediaQuery').mockReturnValue(true);
    const { container, rerender } = renderComponent({ open: true });
    rerender(<StudioAnimateHeight open={false} />);
    expect(container.firstChild).toHaveClass('closed');
    expect(container.firstChild).not.toHaveClass('openingOrClosing');
  });
});

const renderComponent = (props: Partial<StudioAnimateHeightProps> = {}): RenderResult =>
  render(<StudioAnimateHeight {...defaultProps} {...props} />);
