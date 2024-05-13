import React from 'react';
import { render, screen } from '@testing-library/react';
import { AppDevelopmentContextProvider, useAppDevelopmentContext } from './AppDevelopmentContext';

describe('AppDevelopmentContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should render children', () => {
    render(
      <AppDevelopmentContextProvider>
        <button>My button</button>
      </AppDevelopmentContextProvider>,
    );

    expect(screen.getByRole('button', { name: 'My button' })).toBeInTheDocument();
  });

  it('should provide a useAppDevelopmentContext hook', () => {
    const TestComponent = () => {
      const {} = useAppDevelopmentContext();
      return <div data-testid='context'></div>;
    };

    render(
      <AppDevelopmentContextProvider>
        <TestComponent />
      </AppDevelopmentContextProvider>,
    );

    expect(screen.getByTestId('context')).toHaveTextContent('');
  });

  it('should throw an error when useAppDevelopmentContext is used outside of a AppDevelopmentContextProvider', () => {
    // Mock console error to check if it has been called
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const TestComponent = () => {
      useAppDevelopmentContext();
      return <div data-testid='context'>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'useAppDevelopmentContext must be used within a AppDevelopmentContextProvider',
    );
    expect(consoleError).toHaveBeenCalled();
  });
});
