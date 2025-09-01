import React from 'react';
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import {
  StudioCheckboxTableContextProvider,
  useCheckboxTableContext,
} from './StudioCheckboxTableContext';

describe('StudioCheckboxTableContext', () => {
  it('should render children', () => {
    render(
      <StudioCheckboxTableContextProvider>
        <button>My button</button>
      </StudioCheckboxTableContextProvider>,
    );

    expect(screen.getByRole('button', { name: 'My button' })).toBeInTheDocument();
  });

  it('should provide a useCheckboxTableContext hook', () => {
    const TestComponent = (): ReactElement => {
      const {} = useCheckboxTableContext();
      return <div data-testid='context'></div>;
    };

    render(
      <StudioCheckboxTableContextProvider>
        <TestComponent />
      </StudioCheckboxTableContextProvider>,
    );

    expect(screen.getByTestId('context')).toHaveTextContent('');
  });

  it('should throw an error when useCheckboxTableContext is used outside of a StudioCheckboxTableContextProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const TestComponent = (): ReactElement => {
      useCheckboxTableContext();
      return <div data-testid='context'>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'useCheckboxTableContext must be used within a StudioCheckboxTableContextProvider',
    );
    expect(consoleError).toHaveBeenCalled();
  });
});
