import React, { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { StudioPropertyGroup } from './StudioPropertyGroup';

jest.mock('./StudioPropertyGroup.module.css', () => ({
  listWrapper: 'listWrapper',
}));

describe('StudioPropertyGroup', () => {
  it('Renders children', () => {
    const content = 'Test';
    render(<StudioPropertyGroup>Test</StudioPropertyGroup>);
    screen.getByText(content);
  });

  it('Appends the given class name', () => {
    const className = 'test';
    const testId = 'test-id';
    render(<StudioPropertyGroup className={className} data-testid={testId} />);
    const listWrapper = screen.getByTestId(testId);
    expect(listWrapper).toHaveClass(className);
    expect(listWrapper).toHaveClass('listWrapper');
  });

  it('Forwards the ref object if given', () => {
    const ref = createRef<HTMLDivElement>();
    const testId = 'test-id';
    render(<StudioPropertyGroup ref={ref} data-testid={testId} />);
    expect(ref.current).toBe(screen.getByTestId(testId));
  });
});
