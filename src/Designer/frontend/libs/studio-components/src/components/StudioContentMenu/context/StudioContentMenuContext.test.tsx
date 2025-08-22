import React from 'react';
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import {
  StudioContentMenuContextProvider,
  useStudioContentMenuContext,
} from './StudioContentMenuContext';

describe('StudioContentMenuContext', () => {
  it('should render children', () => {
    render(
      <StudioContentMenuContextProvider>
        <button>My button</button>
      </StudioContentMenuContextProvider>,
    );

    expect(screen.getByRole('button', { name: 'My button' })).toBeInTheDocument();
  });

  it('should provide a useStudioContentMenuContext hook', () => {
    const TestComponent = (): ReactElement => {
      const {} = useStudioContentMenuContext();
      return <div data-testid='context'></div>;
    };

    render(
      <StudioContentMenuContextProvider>
        <TestComponent />
      </StudioContentMenuContextProvider>,
    );

    expect(screen.getByTestId('context')).toHaveTextContent('');
  });

  it('should throw an error when useStudioContentMenuContext is used outside of a StudioContentMenuContextProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const TestComponent = (): ReactElement => {
      useStudioContentMenuContext();
      return <div data-testid='context'>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'useStudioContentMenuContext must be used within a StudioContentMenuContextProvider',
    );
    expect(consoleError).toHaveBeenCalled();
  });
});
