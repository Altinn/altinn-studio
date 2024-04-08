import React from 'react';
import * as networking from '../../utils/networking';
import type { IHeaderContext } from './Header';
import { HeaderContext, SelectedContextType } from './Header';
import type { HeaderMenuProps } from './HeaderMenu';
import { HeaderMenu } from './HeaderMenu';
import { act, render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const originalLocation = window.location;
jest.mock('../../utils/networking', () => ({
  __esModule: true,
  ...jest.requireActual('../../utils/networking'),
}));

const mockedNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockedNavigate,
  useLocation: () => ({
    search: '',
  }),
}));

describe('HeaderMenu', () => {
  beforeEach(() => {
    delete window.location;

    window.location = {
      ...originalLocation,
      assign: jest.fn(),
    };
  });

  afterEach(() => {
    window.location = originalLocation;
    jest.restoreAllMocks();
  });

  it('should call gitea logout api when clicking log out', async () => {
    const postSpy = jest.spyOn(networking, 'post').mockResolvedValue(null);
    render();

    await openMenu();
    const logoutButton = screen.getByRole('menuitem', {
      name: /shared\.header_logout/i,
    });

    await act(() => userEvent.click(logoutButton)); // eslint-disable-line testing-library/no-unnecessary-act

    expect(postSpy).toHaveBeenCalledWith(`${window.location.origin}/repos/user/logout`);
  });

  it('should call setSelectedContext with all keyword when clicking All item in menu', async () => {
    render();
    await openMenu();

    const allItem = screen.getByRole('menuitem', {
      name: /shared\.header_all/i,
    });

    await act(() => userEvent.click(allItem)); // eslint-disable-line testing-library/no-unnecessary-act

    expect(mockedNavigate).toHaveBeenCalledWith('/' + SelectedContextType.All);
  });

  it('should call setSelectedContext with self keyword when clicking Self item in menu', async () => {
    render();
    await openMenu();

    const selfItem = screen.getByRole('menuitem', {
      name: /john smith/i,
    });

    await act(() => userEvent.click(selfItem)); // eslint-disable-line testing-library/no-unnecessary-act

    expect(mockedNavigate).toHaveBeenCalledWith('/');
  });

  it('should call setSelectedContext with org-id when selecting org as context', async () => {
    render();
    await openMenu();

    const orgItem = screen.getByRole('menuitem', {
      name: /organization 1/i,
    });

    await act(() => userEvent.click(orgItem)); // eslint-disable-line testing-library/no-unnecessary-act
    expect(mockedNavigate).toHaveBeenCalledWith('/username');
  });
});

const openMenu = async () => {
  const user = userEvent.setup();
  const menuButton = screen.getByRole('button', {
    name: /shared\.header_button_alt/i,
  });
  await act(() => user.click(menuButton));
};

const render = (props: Partial<HeaderMenuProps> = {}) => {
  const handleSetSelectedContext = jest.fn();
  const headerContextValue: IHeaderContext = {
    selectableOrgs: [
      {
        avatar_url: 'avatar_url',
        description: 'description',
        id: 1,
        location: 'location',
        username: 'username',
        website: 'website',
        full_name: 'Organization 1',
      },
    ],
    user: {
      full_name: 'John Smith',
      avatar_url: 'avatar_url',
      login: 'login',
      email: '',
      id: 0,
      userType: 0,
    },
  };
  const allProps = {
    language: {},
    org: 'username',
    ...props,
  };

  return {
    rendered: rtlRender(
      <HeaderContext.Provider value={headerContextValue}>
        <HeaderMenu {...allProps} />
      </HeaderContext.Provider>,
    ),
    handleSetSelectedContext,
  };
};
