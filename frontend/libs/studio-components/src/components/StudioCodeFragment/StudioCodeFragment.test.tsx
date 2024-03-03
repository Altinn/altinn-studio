import React, { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { StudioCodeFragment } from './StudioCodeFragment';

jest.mock('./StudioCodeFragment.module.css', () => ({
  code: 'code',
}));

/* eslint-disable testing-library/no-node-access */
describe('StudioCodeFragment', () => {
  it('Renders the given content', () => {
    const content = 'Test';
    render(<StudioCodeFragment>{content}</StudioCodeFragment>);
    expect(screen.getByText(content)).toBeInTheDocument();
  });

  it('Appends given classname to internal classname', () => {
    const className = 'test-class';
    const { container } = render(<StudioCodeFragment className={className} />);
    expect(container.firstChild).toHaveClass(className);
    expect(container.firstChild).toHaveClass('code');
  });

  it('Adds any additonal props to the element', () => {
    const dataTestId = 'test';
    render(<StudioCodeFragment data-testid={dataTestId} />);
    expect(screen.getByTestId(dataTestId)).toBeInTheDocument();
  });

  it('Forwards the ref object to the code element if given', () => {
    const ref = createRef<HTMLElement>();
    const { container } = render(<StudioCodeFragment ref={ref} />);
    expect(ref.current).toBe(container.firstChild);
  });
});
