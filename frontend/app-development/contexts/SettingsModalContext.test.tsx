import React from 'react';
import { render, screen } from '@testing-library/react';
import { SettingsModalContextProvider, useSettingsModalContext } from './SettingsModalContext';

describe('SettingsModalContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('should render children', () => {
    render(
      <SettingsModalContextProvider>
        <button>My button</button>
      </SettingsModalContextProvider>,
    );

    expect(screen.getByRole('button', { name: 'My button' })).toBeInTheDocument();
  });

  it('should provide a useSettingsModalContext hook', () => {
    const TestComponent = () => {
      const {} = useSettingsModalContext();
      return <div data-testid='context'></div>;
    };

    render(
      <SettingsModalContextProvider>
        <TestComponent />
      </SettingsModalContextProvider>,
    );

    expect(screen.getByTestId('context')).toHaveTextContent('');
  });

  it('should throw an error when useSettingsModalContext is used outside of a SettingsModalContextProvider', () => {
    // Mock console error to check if it has been called
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const TestComponent = () => {
      useSettingsModalContext();
      return <div data-testid='context'>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'useSettingsModalContext must be used within a SettingsModalContextProvider',
    );
    expect(consoleError).toHaveBeenCalled();
  });
});
