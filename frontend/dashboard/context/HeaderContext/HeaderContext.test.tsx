import React from 'react';
import { render, screen } from '@testing-library/react';
import { HeaderContextProvider, useHeaderContext } from './HeaderContext';
import { renderWithProviders } from '../../testing/mocks';

describe('HeaderContext', () => {
  it('should render children', () => {
    renderWithProviders(
      <HeaderContextProvider>
        <button>My button</button>
      </HeaderContextProvider>,
    );

    expect(screen.getByRole('button', { name: 'My button' })).toBeInTheDocument();
  });

  it('should provide a useHeaderContext hook', () => {
    const TestComponent = () => {
      const {} = useHeaderContext();
      return <div data-testid='context'></div>;
    };

    renderWithProviders(
      <HeaderContextProvider>
        <TestComponent />
      </HeaderContextProvider>,
    );

    expect(screen.getByTestId('context')).toHaveTextContent('');
  });

  it('should throw an error when useHeaderContext is used outside of a HeaderContextProvider', () => {
    // Mock console error to check if it has been called
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const TestComponent = () => {
      useHeaderContext();
      return <div data-testid='context'>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'useHeaderContext must be used within a HeaderContextProvider',
    );
    expect(consoleError).toHaveBeenCalled();
  });
});
