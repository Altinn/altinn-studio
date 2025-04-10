import React from 'react';
import { render, screen } from '@testing-library/react';
import { PagesContextProvider, usePagesContext } from './PagesContext';
import { renderWithProviders } from 'app-development/test/mocks';

describe('PagesContext', () => {
  it('should render children', () => {
    renderWithProviders()(
      <PagesContextProvider>
        <button>My button</button>
      </PagesContextProvider>,
    );

    expect(screen.getByRole('button', { name: 'My button' })).toBeInTheDocument();
  });

  it('should provide a usePagesContext hook', () => {
    const TestComponent = () => {
      const {} = usePagesContext();
      return <div data-testid='context'></div>;
    };

    renderWithProviders()(
      <PagesContextProvider>
        <TestComponent />
      </PagesContextProvider>,
    );

    expect(screen.getByTestId('context')).toHaveTextContent('');
  });

  it('should throw an error when usePagesContext is used outside of a PagesContextProvider', () => {
    // Mock console error to check if it has been called
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const TestComponent = () => {
      usePagesContext();
      return <div data-testid='context'>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'usePagesContext must be used within a PagesContextProvider',
    );
    expect(consoleError).toHaveBeenCalled();
  });
});
