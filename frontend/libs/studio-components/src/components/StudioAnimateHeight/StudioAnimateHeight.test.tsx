import React from 'react';
import type { RenderResult } from '@testing-library/react';
import { render, screen } from '@testing-library/react';
import type { StudioAnimateHeightProps } from './StudioAnimateHeight';
import { StudioAnimateHeight } from './StudioAnimateHeight';

/* eslint-disable testing-library/no-node-access */
describe('StudioAnimateHeight', () => {
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
    expect(container.firstChild).toHaveStyle(style);
  });

  it('Accepts additional <div> props', () => {
    const id = 'foo';
    const { container } = renderComponent({ id });
    expect(container.firstChild).toHaveAttribute('id', id);
  });

  it('Sets "open" class when open', () => {
    const { container } = renderComponent({ open: true });
    expect(container.firstChild).toHaveClass('open');
  });

  it('Unsets "open" class when closed', () => {
    const { container } = renderComponent({ open: false });
    expect(container.firstChild).not.toHaveClass('open');
  });
});

const defaultProps: StudioAnimateHeightProps = { open: false };

const renderComponent = (props?: Partial<StudioAnimateHeightProps>): RenderResult =>
  render(<StudioAnimateHeight {...defaultProps} {...props} />);
