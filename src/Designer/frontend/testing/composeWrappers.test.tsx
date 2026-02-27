import React from 'react';
import { render, screen } from '@testing-library/react';
import { composeWrappers } from './composeWrappers';
import type { WrapperFunction } from './composeWrappers';

describe('composeWrappers', () => {
  it('should render children directly when given an empty array', () => {
    const Wrapper = composeWrappers([]);
    render(<div>content</div>, { wrapper: Wrapper });
    expect(screen.getByText('content')).toBeInTheDocument();
  });

  it('should apply a single wrapper', () => {
    const withTestId: WrapperFunction = (children) => (
      <div data-testid='single-wrapper'>{children}</div>
    );

    const Wrapper = composeWrappers([withTestId]);
    render(<span>inner</span>, { wrapper: Wrapper });

    expect(screen.getByTestId('single-wrapper')).toBeInTheDocument();
    expect(screen.getByText('inner')).toBeInTheDocument();
  });

  it('should nest wrappers with the first element as outermost', () => {
    const outerWrapper: WrapperFunction = (children) => (
      <div data-testid='outer'>{children}</div>
    );
    const innerWrapper: WrapperFunction = (children) => (
      <div data-testid='inner'>{children}</div>
    );

    const Wrapper = composeWrappers([outerWrapper, innerWrapper]);
    render(<span>content</span>, { wrapper: Wrapper });

    const outer = screen.getByTestId('outer');
    const inner = screen.getByTestId('inner');
    expect(outer).toContainElement(inner);
    expect(inner).toHaveTextContent('content');
  });

  it('should compose three wrappers in correct order', () => {
    const first: WrapperFunction = (children) => <div data-testid='first'>{children}</div>;
    const second: WrapperFunction = (children) => <div data-testid='second'>{children}</div>;
    const third: WrapperFunction = (children) => <div data-testid='third'>{children}</div>;

    const Wrapper = composeWrappers([first, second, third]);
    render(<span>content</span>, { wrapper: Wrapper });

    const firstElement = screen.getByTestId('first');
    const secondElement = screen.getByTestId('second');
    const thirdElement = screen.getByTestId('third');

    expect(firstElement).toContainElement(secondElement);
    expect(secondElement).toContainElement(thirdElement);
    expect(thirdElement).toHaveTextContent('content');
  });
});
