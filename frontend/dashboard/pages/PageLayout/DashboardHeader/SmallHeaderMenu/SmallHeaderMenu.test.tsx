import React from 'react';
import { screen } from '@testing-library/react';
import { SmallHeaderMenu } from './SmallHeaderMenu';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { headerContextValueMock } from 'dashboard/testing/headerContextMock';
import { HeaderMenuGroupKey } from 'dashboard/enums/HeaderMenuGroupKey';
import {
  HeaderContext,
  type HeaderContextProps,
} from 'dashboard/context/HeaderContext/HeaderContext';
import { renderWithProviders } from 'dashboard/testing/mocks';

describe('SmallHeaderMenu', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the menu trigger button with the correct text', () => {
    renderSmallHeaderMenu();

    expect(screen.getByRole('button', { name: textMock('top_menu.menu') })).toBeInTheDocument();
  });

  it('should open the dropdown menu when the trigger button is clicked', async () => {
    const user = userEvent.setup();
    renderSmallHeaderMenu();

    expect(
      screen.queryByRole('menuitem', {
        name: textMock(headerContextValueMock.menuItems[0].key),
      }),
    ).not.toBeInTheDocument();

    const button = screen.getByRole('button', { name: textMock('top_menu.menu') });
    await user.click(button);

    expect(
      screen.getByRole('menuitem', {
        name: textMock(headerContextValueMock.menuItems[0].key),
      }),
    ).toBeInTheDocument();
  });

  it('should close the dropdown menu when an item is clicked', async () => {
    const user = userEvent.setup();
    renderSmallHeaderMenu();

    const button = screen.getByRole('button', { name: textMock('top_menu.menu') });
    await user.click(button);

    const menuItem = screen.getByRole('menuitem', {
      name: textMock(headerContextValueMock.menuItems[0].key),
    });
    expect(menuItem).toBeInTheDocument();
    await user.click(menuItem);

    expect(
      screen.queryByRole('menuitem', {
        name: textMock(headerContextValueMock.menuItems[0].key),
      }),
    ).not.toBeInTheDocument();
  });

  it('should display user name in the profile section', async () => {
    const user = userEvent.setup();
    renderSmallHeaderMenu();

    const button = screen.getByRole('button', { name: textMock('top_menu.menu') });
    await user.click(button);

    expect(
      screen.getByText(
        textMock('shared.header_user_for_org', {
          user: headerContextValueMock.user.full_name,
        }),
      ),
    ).toBeInTheDocument();
  });

  it('should render all the grouped menu items and profile menu items', async () => {
    const user = userEvent.setup();
    renderSmallHeaderMenu();

    const button = screen.getByRole('button', { name: textMock('top_menu.menu') });
    await user.click(button);

    headerContextValueMock.menuItems.forEach((menuItem) => {
      expect(screen.getByRole('menuitem', { name: textMock(menuItem.key) })).toBeInTheDocument();
    });

    headerContextValueMock.profileMenuItems.forEach((profileMenuItem) => {
      expect(screen.getByRole('menuitem', { name: profileMenuItem.name })).toBeInTheDocument();
    });
  });

  it('should show the header name when group is "Tools"', async () => {
    const user = userEvent.setup();
    renderSmallHeaderMenu({
      ...headerContextValueMock,
      menuItems: [{ ...headerContextValueMock.menuItems[0], group: HeaderMenuGroupKey.Tools }],
    });

    const button = screen.getByRole('button', { name: textMock('top_menu.menu') });
    await user.click(button);

    const heading = screen.getByRole('heading', {
      name: textMock(HeaderMenuGroupKey.Tools),
      level: 2,
    });
    expect(heading).toBeInTheDocument();
  });
});

const renderSmallHeaderMenu = (contextProps: Partial<HeaderContextProps> = {}) => {
  return renderWithProviders(
    <HeaderContext.Provider value={{ ...headerContextValueMock, ...contextProps }}>
      <SmallHeaderMenu />
    </HeaderContext.Provider>,
  );
};
