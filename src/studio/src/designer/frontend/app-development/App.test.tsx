import { App } from './App';
import React from 'react';
import { renderWithProviders } from 'test/testUtils';
import type { IUserState } from './sharedResources/user/userSlice';
import { screen } from '@testing-library/react';

jest.mock('react', () => {
  return {
    ...jest.requireActual<typeof React>('react'),
    useRef: jest.fn().mockImplementation(() => {
      return { current: document.createElement('div') };
    }),
  };
});

afterAll(() => {
  jest.clearAllMocks();
});

describe('App', () => {
  it('should present popover with options to log out or stay logged in when session about to expire ', () => {
    renderWithProviders(<App />, {
      preloadedState: {
        userState: {
          session: {
            remainingMinutes: 6,
          },
        } as IUserState,
      },
    });

    expect(screen.getByText('general.sign_out')).toBeInTheDocument();
    expect(screen.getByText('general.continue')).toBeInTheDocument();
    expect(screen.getByText('session.inactive')).toBeInTheDocument();
  });

  it('should not present popover if session is over 10min', () => {
    renderWithProviders(<App />, {
      preloadedState: {
        userState: {
          session: {
            remainingMinutes: 40,
          },
        } as IUserState,
      },
    });

    expect(screen.queryByText('general.sign_out')).not.toBeInTheDocument();
    expect(screen.queryByText('general.continue')).not.toBeInTheDocument();
    expect(screen.queryByText('session.inactive')).not.toBeInTheDocument();
  });
});
