import React from 'react';
import { render, screen } from '@testing-library/react';
import { PolicyEditorContext, usePolicyEditorContext } from './PolicyEditorContext';
import { mockPolicyEditorContextValue } from '../../../test/mocks/policyEditorContextMock';

describe('PolicyEditorContext', () => {
  it('should render children', () => {
    render(
      <PolicyEditorContext.Provider value={mockPolicyEditorContextValue}>
        <button>My button</button>
      </PolicyEditorContext.Provider>,
    );

    expect(screen.getByRole('button', { name: 'My button' })).toBeInTheDocument();
  });

  it('should provide a usePolicyEditorContext hook', () => {
    const TestComponent = () => {
      const {} = usePolicyEditorContext();
      return <div data-testid='context'></div>;
    };

    render(
      <PolicyEditorContext.Provider value={mockPolicyEditorContextValue}>
        <TestComponent />
      </PolicyEditorContext.Provider>,
    );

    expect(screen.getByTestId('context')).toHaveTextContent('');
  });

  it('should throw an error when usePolicyEditorContext is used outside of a PolicyEditorContextProvider', () => {
    // Mock console error to check if it has been called
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const TestComponent = () => {
      usePolicyEditorContext();
      return <div data-testid='context'>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'usePolicyEditorContext must be used within a PolicyEditorContextProvider',
    );
    expect(consoleError).toHaveBeenCalled();
  });
});
