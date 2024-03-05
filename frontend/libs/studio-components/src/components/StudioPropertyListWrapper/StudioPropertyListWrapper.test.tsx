import React, { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { StudioPropertyListWrapper } from './StudioPropertyListWrapper';

jest.mock('./StudioPropertyListWrapper.module.css', () => ({
  listWrapper: 'listWrapper',
  withDisabledNegativeMargin: 'withDisabledNegativeMargin',
}));

describe('StudioPropertyListWrapper', () => {
  it('Renders children', () => {
    const content = 'Test';
    render(<StudioPropertyListWrapper>Test</StudioPropertyListWrapper>);
    screen.getByText(content);
  });

  it('Appends the given class name', () => {
    const className = 'test';
    const testId = 'test-id';
    render(<StudioPropertyListWrapper className={className} data-testid={testId} />);
    const listWrapper = screen.getByTestId(testId);
    expect(listWrapper).toHaveClass(className);
    expect(listWrapper).toHaveClass('listWrapper');
  });

  it('Forwards the ref object if given', () => {
    const ref = createRef<HTMLDivElement>();
    const testId = 'test-id';
    render(<StudioPropertyListWrapper ref={ref} data-testid={testId} />);
    expect(ref.current).toBe(screen.getByTestId(testId));
  });
});
