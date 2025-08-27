import React from 'react';
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
import { StudioDropdownContextProvider, useStudioDropdownContext } from './StudioDropdownContext';

const setOpen = jest.fn();

describe('StudioDropdownContext', () => {
  beforeEach(jest.clearAllMocks);

  it('should render children', () => {
    render(
      <StudioDropdownContextProvider setOpen={setOpen}>
        <button>My button</button>
      </StudioDropdownContextProvider>,
    );

    expect(screen.getByRole('button', { name: 'My button' })).toBeInTheDocument();
  });

  it('should provide a useStudioDropdownContext hook', () => {
    const TestComponent = (): ReactElement => {
      const {} = useStudioDropdownContext();
      return <div data-testid='context'></div>;
    };

    render(
      <StudioDropdownContextProvider setOpen={setOpen}>
        <TestComponent />
      </StudioDropdownContextProvider>,
    );

    expect(screen.getByTestId('context')).toHaveTextContent('');
  });

  it('should throw an error when useStudioDropdownContext is used outside of a StudioDropdownContextProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const TestComponent = (): ReactElement => {
      useStudioDropdownContext();
      return <div data-testid='context'>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'useStudioDropdownContext must be used within a StudioDropdownContextProvider',
    );
    expect(consoleError).toHaveBeenCalled();
  });
});
