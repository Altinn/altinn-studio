import React from 'react';
import * as networking from '../../utils/networking';
import { HeaderContext, SelectedContextType } from './Header';
import type { HeaderMenuProps } from './HeaderMenu';
import { HeaderMenu } from './HeaderMenu';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const originalLocation = window.location;
jest.mock('../../utils/networking', () => ({
  __esModule: true,
  ...jest.requireActual('../../utils/networking'),
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

    await userEvent.click(logoutButton);

    expect(postSpy).toHaveBeenCalledWith(
      `${window.location.origin}/repos/user/logout`,
    );
  });

  it('should call setSelectedContext with all keyword when clicking All item in menu', async () => {
    const { handleSetSelectedContext } = render();
    await openMenu();

    const allItem = screen.getByRole('menuitem', {
      name: /shared\.header_all/i,
    });

    await userEvent.click(allItem);

    expect(handleSetSelectedContext).toHaveBeenCalledWith(
      SelectedContextType.All,
    );
  });

  it('should call setSelectedContext with self keyword when clicking Self item in menu', async () => {
    const { handleSetSelectedContext } = render();
    await openMenu();

    const selfItem = screen.getByRole('menuitem', {
      name: /john smith/i,
    });

    await userEvent.click(selfItem);

    expect(handleSetSelectedContext).toHaveBeenCalledWith(
      SelectedContextType.Self,
    );
  });

  it('should call setSelectedContext with org-id when selecting org as context', async () => {
    const { handleSetSelectedContext } = render();
    await openMenu();

    const orgItem = screen.getByRole('menuitem', {
      name: /organization 1/i,
    });

    await userEvent.click(orgItem);
    expect(handleSetSelectedContext).toHaveBeenCalledWith(1);
  });
});

const openMenu = async () => {
  const menuButton = screen.getByRole('button', {
    name: /shared\.header_button_alt/i,
  });
  await userEvent.click(menuButton);
};

const render = (props: Partial<HeaderMenuProps> = {}) => {
  const handleSetSelectedContext = jest.fn();
  const headerContextValue = {
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
    selectedContext: 'self',
    setSelectedContext: handleSetSelectedContext,
    user: {
      full_name: 'John Smith',
      avatar_url: 'avatar_url',
      login: 'login',
    },
  };
  const allProps = {
    language: {},
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
