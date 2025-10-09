import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  StudioPageHeaderContextProvider,
  useStudioPageHeaderContext,
} from './StudioPageHeaderContext';

describe('StudioPageHeaderContext', () => {
  it('should render children', () => {
    render(
      <StudioPageHeaderContextProvider variant='regular'>
        <button>My button</button>
      </StudioPageHeaderContextProvider>,
    );

    expect(screen.getByRole('button', { name: 'My button' })).toBeInTheDocument();
  });

  it('should provide a useStudioPageHeaderContext hook', () => {
    const TestComponent = (): React.ReactElement => {
      const { variant } = useStudioPageHeaderContext();
      return <div data-testid='context'>{variant}</div>;
    };

    render(
      <StudioPageHeaderContextProvider variant='regular'>
        <TestComponent />
      </StudioPageHeaderContextProvider>,
    );

    expect(screen.getByTestId('context')).toHaveTextContent('regular');
  });

  it('should throw an error when useStudioPageHeaderContext is used outside of a StudioPageHeaderContextProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const TestComponent = (): React.ReactElement => {
      useStudioPageHeaderContext();
      return <div data-testid='context'>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'useStudioPageHeaderContext must be used within a StudioPageHeaderContextProvider',
    );
    expect(consoleError).toHaveBeenCalled();
  });
});
