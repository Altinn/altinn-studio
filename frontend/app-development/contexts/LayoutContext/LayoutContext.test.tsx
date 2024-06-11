import React from 'react';
import { render, screen } from '@testing-library/react';
import { LayoutContextProvider, useLayoutContext } from './LayoutContext';

describe('LayoutContext', () => {
  it('should render children', () => {
    render(
      <LayoutContextProvider>
        <button>My button</button>
      </LayoutContextProvider>,
    );

    expect(screen.getByRole('button', { name: 'My button' })).toBeInTheDocument();
  });

  it('should provide a useLayoutContext hook', () => {
    const TestComponent = () => {
      const {} = useLayoutContext();
      return <div data-testid='context'></div>;
    };

    render(
      <LayoutContextProvider>
        <TestComponent />
      </LayoutContextProvider>,
    );

    expect(screen.getByTestId('context')).toHaveTextContent('');
  });

  it('should throw an error when useLayoutContext is used outside of a LayoutContextProvider', () => {
    // Mock console error to check if it has been called
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const TestComponent = () => {
      useLayoutContext();
      return <div data-testid='context'>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'useLayoutContext must be used within a LayoutContextProvider',
    );
    expect(consoleError).toHaveBeenCalled();
  });
});
