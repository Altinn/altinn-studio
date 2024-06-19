import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  VersionControlButtonsContextProvider,
  useVersionControlButtonsContext,
} from './VersionControlButtonsContext';

describe('VersionControlButtonsContext', () => {
  it('should render children', () => {
    render(
      <VersionControlButtonsContextProvider>
        <button>My button</button>
      </VersionControlButtonsContextProvider>,
    );

    expect(screen.getByRole('button', { name: 'My button' })).toBeInTheDocument();
  });

  it('should provide a useVersionControlButtonsContext hook', () => {
    const TestComponent = () => {
      const {} = useVersionControlButtonsContext();
      return <div data-testid='context'></div>;
    };

    render(
      <VersionControlButtonsContextProvider>
        <TestComponent />
      </VersionControlButtonsContextProvider>,
    );

    expect(screen.getByTestId('context')).toHaveTextContent('');
  });

  it('should throw an error when useVersionControlButtonsContext is used outside of a VersionControlButtonsContextProvider', () => {
    // Mock console error to check if it has been called
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const TestComponent = () => {
      useVersionControlButtonsContext();
      return <div data-testid='context'>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'useVersionControlButtonsContext must be used within a VersionControlButtonsContextProvider',
    );
    expect(consoleError).toHaveBeenCalled();
  });
});
