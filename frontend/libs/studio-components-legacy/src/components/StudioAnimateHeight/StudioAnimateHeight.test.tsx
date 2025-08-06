import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import type { StudioAnimateHeightProps } from './StudioAnimateHeight';
import { StudioAnimateHeight } from './StudioAnimateHeight';

// Mocks
const useMediaQuery = jest.fn();

jest.mock('../../hooks/useMediaQuery', () => ({
  useMediaQuery: (query: string) => useMediaQuery(query),
}));

/* eslint-disable testing-library/no-node-access */
describe('StudioAnimateHeight', () => {
  beforeEach(() => {
    useMediaQuery.mockReturnValue(false); // Set 'prefers-reduced-motion' to false
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
    expect(container.firstChild).toHaveClass('container');
    expect(container.firstChild).toHaveClass(className);
  });

  it('Appends given style to root element', () => {
    const style = { color: 'red' };
    const { container } = renderComponent({ style });
    expect(container.firstChild).toHaveStyle(style);
  });

  it('Accepts additional <div> props', () => {
    const id = 'foo';
    const { container } = renderComponent({ id });
    expect(container.firstChild).toHaveAttribute('id', id);
  });

  it('Adds "open" class when open', () => {
    const { container } = renderComponent({ open: true });
    expect(container.firstChild).toHaveClass('open');
  });

  it('Removes "open" class when closed', () => {
    const { container } = renderComponent({ open: false });
    expect(container.firstChild).not.toHaveClass('open');
  });

  it('Adds "animate" class when user has no reduced motion preference', () => {
    useMediaQuery.mockReturnValue(false);
    const { container } = renderComponent({ open: false });
    expect(container.firstChild).toHaveClass('animate');
  });

  it('Removes "animate" class when user prefers reduced motion', () => {
    useMediaQuery.mockReturnValue(true);
    const { container } = renderComponent({ open: true });
    expect(container.firstChild).not.toHaveClass('animate');
  });
});

const defaultProps = { open: false };

const renderComponent = (props?: Partial<StudioAnimateHeightProps>): RenderResult =>
  render(<StudioAnimateHeight {...defaultProps} {...props} />);
