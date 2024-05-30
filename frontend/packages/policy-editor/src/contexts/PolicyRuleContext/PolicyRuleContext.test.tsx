import React from 'react';
import { render, screen } from '@testing-library/react';
import { PolicyRuleContext, usePolicyRuleContext } from './PolicyRuleContext';
import { mockPolicyRuleContextValue } from '../../../test/mocks/policyRuleContextMock';

describe('PolicyRuleContext', () => {
  it('should render children', () => {
    render(
      <PolicyRuleContext.Provider value={mockPolicyRuleContextValue}>
        <button>My button</button>
      </PolicyRuleContext.Provider>,
    );

    expect(screen.getByRole('button', { name: 'My button' })).toBeInTheDocument();
  });

  it('should provide a usePolicyRuleContext hook', () => {
    const TestComponent = () => {
      const {} = usePolicyRuleContext();
      return <div data-testid='context'></div>;
    };

    render(
      <PolicyRuleContext.Provider value={mockPolicyRuleContextValue}>
        <TestComponent />
      </PolicyRuleContext.Provider>,
    );

    expect(screen.getByTestId('context')).toHaveTextContent('');
  });

  it('should throw an error when usePolicyRuleContext is used outside of a PolicyRuleContextProvider', () => {
    // Mock console error to check if it has been called
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const TestComponent = () => {
      usePolicyRuleContext();
      return <div data-testid='context'>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'usePolicyRuleContext must be used within a PolicyRuleContextProvider',
    );
    expect(consoleError).toHaveBeenCalled();
  });
});
