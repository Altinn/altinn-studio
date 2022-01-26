import { App } from '../../App';
import * as React from 'react';
import { renderWithProviders } from 'test/testUtils';
import { IUserState } from '../../sharedResources/user/userSlice';

jest.mock('axios');
jest.mock('../../layout/LeftMenu', () => {
  return {
    default: () => 'LeftMenu',
  };
});
jest.mock('react', () => {
  return {
    ...jest.requireActual<typeof React>('react'),
    useRef: jest.fn().mockImplementation(() => { return { current: document.createElement('div') }}),
  };
});
jest.mock('../../layout/PageHeader', () => {
  return {
    default: () => 'PageHeader',
  };
});

afterAll(() => {
  jest.clearAllMocks();
});

describe('App.tsx', () => {

  it('should present popover with options to log out or stay logged in when session about to expire ', async () => {
    const utils = renderWithProviders(
      <App />,
      {
        preloadedState: {
          userState: {
            session: {
              remainingMinutes: 6,
            },
          } as IUserState,
        }
      }
    );
    
    expect(utils.getByText('general.sign_out')).toBeTruthy();
    expect(utils.getByText('general.continue')).toBeTruthy();
    expect(utils.getByText('session.inactive')).toBeTruthy();
  });

  it('should not present popover if session is over 10min', () => {
    const utils = renderWithProviders(
      <App />,
      {
        preloadedState: {
          userState: {
            session: {
              remainingMinutes: 40,
            },
          } as IUserState,
        }
      }
    );
    
    expect(utils.queryByText('general.sign_out')).toBeFalsy();
    expect(utils.queryByText('general.continue')).toBeFalsy();
    expect(utils.queryByText('session.inactive')).toBeFalsy();
  });
});