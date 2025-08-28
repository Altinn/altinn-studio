import React from 'react';
import { render, screen } from '@testing-library/react';
import { RouterContextProvider, useRouterContext } from './RouterContext';
import { useNavigation } from '../hooks/useNavigation';
import userEvent from '@testing-library/user-event';

jest.mock('../hooks/useNavigation');

const MockComponent = () => {
  const { currentPage, navigate } = useRouterContext();

  return (
    <div>
      <span>{currentPage}</span>
      <button onClick={() => navigate('landingPage')}>Go Home</button>
    </div>
  );
};

describe('RouterContext', () => {
  beforeEach(() => {
    (useNavigation as jest.Mock).mockReturnValue({
      currentPage: 'testPage',
      navigate: jest.fn(),
    });
  });

  it('provides the current page and navigate function', () => {
    render(
      <RouterContextProvider>
        <MockComponent />
      </RouterContextProvider>,
    );

    expect(screen.getByText('testPage')).toBeInTheDocument();
  });

  it('calls navigate function when the button is clicked', async () => {
    const user = userEvent.setup();
    const navigateMock = jest.fn();
    (useNavigation as jest.Mock).mockReturnValue({
      currentPage: 'testPage',
      navigate: navigateMock,
    });

    render(
      <RouterContextProvider>
        <MockComponent />
      </RouterContextProvider>,
    );

    const linkButton = screen.getByRole('button', { name: 'Go Home' });
    await user.click(linkButton);

    expect(navigateMock).toHaveBeenCalledWith('landingPage');
  });

  it('should throw an error when useRouterContext is used outside of a RouterContextProvider', () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    const TestComponent = () => {
      useRouterContext();
      return <div>Test</div>;
    };

    expect(() => render(<TestComponent />)).toThrow(
      'useRouterContext must be used within a RouterContextProvider',
    );
    expect(consoleError).toHaveBeenCalled();
  });
});
