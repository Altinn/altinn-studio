import React from 'react';
import { render, screen } from '@testing-library/react';
import { PageHeaderContextProvider, usePageHeaderContext } from './PageHeaderContext';
import { renderWithProviders } from '../../test/mocks';

describe('PageHeaderContext', () => {
  it('should render children', () => {
    renderWithProviders()(
      <PageHeaderContextProvider>
        <button>My button</button>
      </PageHeaderContextProvider>,
    );

    expect(screen.getByRole('button', { name: 'My button' })).toBeInTheDocument();
  });

  it('should provide a usePageHeaderContext hook', () => {
    const TestComponent = () => {
      const {} = usePageHeaderContext();
      return <div data-testid='context'></div>;
    };

    renderWithProviders()(
      <PageHeaderContextProvider>
        <TestComponent />
      </PageHeaderContextProvider>,
    );

    expect(screen.getByTestId('context')).toHaveTextContent('');
  });

  it('should throw an error when usePageHeaderContext is used outside of a PageHeaderContextProvider', () => {
    // Mock console error to check if it has been called
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const TestComponent = () => {
      usePageHeaderContext();
      return <div data-testid='context'>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'usePageHeaderContext must be used within a PageHeaderContextProvider',
    );
    expect(consoleError).toHaveBeenCalled();
  });
});
