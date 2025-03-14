import React from 'react';
import { render, screen } from '@testing-library/react';
import { useGiteaHeaderContext } from './GiteaHeaderContext';
import { renderWithProviders } from '../../mocks/renderWithProviders';

describe('GiteaHeaderContext', () => {
  it('should render children', () => {
    renderWithProviders()(<button>My button</button>);

    expect(screen.getByRole('button', { name: 'My button' })).toBeInTheDocument();
  });

  it('should provide a usePageHeaderContext hook', () => {
    const TestComponent = () => {
      const {} = useGiteaHeaderContext();
      return <div data-testid='context'></div>;
    };

    renderWithProviders()(<TestComponent />);

    expect(screen.getByTestId('context')).toHaveTextContent('');
  });

  it('should throw an error when useGiteaHeaderContext is used outside of a GiteaHeaderContextProvider', () => {
    // Mock console error to check if it has been called
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const TestComponent = () => {
      useGiteaHeaderContext();
      return <div data-testid='context'>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'useGiteaHeaderContext must be used within a GiteaHeaderContextProvider',
    );
    expect(consoleError).toHaveBeenCalled();
  });
});
