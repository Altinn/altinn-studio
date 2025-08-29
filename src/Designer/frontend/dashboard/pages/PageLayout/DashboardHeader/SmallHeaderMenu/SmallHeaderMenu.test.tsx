import React from 'react';
import { screen } from '@testing-library/react';
import { SmallHeaderMenu } from './SmallHeaderMenu';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import { headerContextValueMock } from '../../../../testing/headerContextMock';
import { HeaderMenuGroupKey } from '../../../../enums/HeaderMenuGroupKey';
import { HeaderContext, type HeaderContextProps } from '../../../../context/HeaderContext';
import { renderWithProviders } from '../../../../testing/mocks';

describe('SmallHeaderMenu', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render the menu trigger button with the correct text', () => {
    renderSmallHeaderMenu();

    expect(getTopMenuButton()).toBeInTheDocument();
  });

  it('should open the dropdown menu when the trigger button is clicked', async () => {
    const user = userEvent.setup();
    renderSmallHeaderMenu();

    expect(
      screen.queryByRole('menuitem', {
        name: textMock(headerContextValueMock.menuItems[0].key),
      }),
    ).not.toBeInTheDocument();

    await user.click(getTopMenuButton());

    expect(getMenuItem(0)).toBeInTheDocument();
  });

  it('should close the dropdown menu when an item is clicked', async () => {
    const user = userEvent.setup();
    renderSmallHeaderMenu();

    await user.click(getTopMenuButton());

    const menuItem = getMenuItem(0);
    expect(menuItem).toBeInTheDocument();
    await user.click(menuItem);
    expect(menuItem).not.toBeInTheDocument();
  });

  it('should display user name in the profile section', async () => {
    const user = userEvent.setup();
    renderSmallHeaderMenu();

    await user.click(getTopMenuButton());

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

    await user.click(getTopMenuButton());

    headerContextValueMock.menuItems.forEach((menuItem) => {
      expect(screen.getByRole('menuitem', { name: textMock(menuItem.key) })).toBeInTheDocument();
    });

    headerContextValueMock.profileMenuItems.forEach((profileMenuItem) => {
      expect(screen.getByRole('menuitem', { name: profileMenuItem.itemName })).toBeInTheDocument();
    });
  });

  it('should show the header name when group is "Tools"', async () => {
    const user = userEvent.setup();
    renderSmallHeaderMenu({
      ...headerContextValueMock,
      menuItems: [{ ...headerContextValueMock.menuItems[0], group: HeaderMenuGroupKey.Tools }],
    });

    await user.click(getTopMenuButton());

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

function getTopMenuButton() {
  return screen.getByRole('button', {
    name: textMock('top_menu.menu'),
  });
}

function getMenuItem(id: number) {
  return screen.getByRole('menuitem', {
    name: textMock(headerContextValueMock.menuItems[id].key),
  });
}
