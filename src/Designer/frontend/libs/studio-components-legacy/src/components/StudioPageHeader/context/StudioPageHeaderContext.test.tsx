import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  StudioPageHeaderContextProvider,
  useStudioPageHeaderContext,
} from './StudioPageHeaderContext';

describe('StudioPageHeaderContext', () => {
  it('should render children', () => {
    render(
      <StudioPageHeaderContextProvider>
        <button>My button</button>
      </StudioPageHeaderContextProvider>,
    );

    expect(screen.getByRole('button', { name: 'My button' })).toBeInTheDocument();
  });

  it('should provide a useStudioPageHeaderContext hook', () => {
    const TestComponent = () => {
      const {} = useStudioPageHeaderContext();
      return <div data-testid='context'></div>;
    };

    render(
      <StudioPageHeaderContextProvider>
        <TestComponent />
      </StudioPageHeaderContextProvider>,
    );

    expect(screen.getByTestId('context')).toHaveTextContent('');
  });

  it('should throw an error when useStudioPageHeaderContext is used outside of a StudioPageHeaderContextProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const TestComponent = () => {
      useStudioPageHeaderContext();
      return <div data-testid='context'>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'useStudioPageHeaderContext must be used within a StudioPageHeaderContextProvider',
    );
    expect(consoleError).toHaveBeenCalled();
  });
});
