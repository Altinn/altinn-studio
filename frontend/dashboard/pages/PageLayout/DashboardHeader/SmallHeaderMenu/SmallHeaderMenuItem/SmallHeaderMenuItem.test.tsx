import React from 'react';
import { screen, render } from '@testing-library/react';
import { SmallHeaderMenuItem, type SmallHeaderMenuItemProps } from './SmallHeaderMenuItem';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { NavigationMenuItem } from '../../../../../types/NavigationMenuItem';
import {
  HeaderContext,
  type HeaderContextProps,
} from 'dashboard/context/HeaderContext/HeaderContext';
import { MockServicesContextWrapper } from 'dashboard/dashboardTestUtils';
import { headerContextValueMock } from 'dashboard/testing/headerContextMock';

const menuItemName: string = 'testMenuItem';
const menuItemLink: string = '/test-path';
const mockMenuItem: NavigationMenuItem = {
  name: menuItemName,
  action: {
    type: 'link',
    href: menuItemLink,
    openInNewTab: false,
  },
};

const mockOnClick = jest.fn();
const defaultProps: SmallHeaderMenuItemProps = {
  menuItem: mockMenuItem,
  onClick: mockOnClick,
};

describe('SmallHeaderMenuItem', () => {
  afterEach(() => jest.clearAllMocks());

  it('should render a NavLink when the menuItem action type is "link"', () => {
    renderSmallHeaderMenuItem();

    const linkElement = screen.getByRole('menuitem', {
      name: textMock(menuItemName),
    });
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveAttribute('href', menuItemLink);
  });

  it('should add "active" class when the current route matches the menuItem href', () => {
    const initialEntries = `${menuItemLink}/ttd`;
    renderSmallHeaderMenuItem({
      routerInitialEntries: [initialEntries],
    });

    const linkElement = screen.getByRole('menuitem', {
      name: textMock(menuItemName),
    });
    expect(linkElement).toHaveClass('active');
  });

  it('should call onClick when the NavLink is clicked', async () => {
    const user = userEvent.setup();
    renderSmallHeaderMenuItem();

    const linkElement = screen.getByRole('menuitem', {
      name: textMock(menuItemName),
    });
    await user.click(linkElement);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('should open the link in a new tab when openInNewTab is true', () => {
    renderSmallHeaderMenuItem({
      componentProps: {
        menuItem: {
          ...mockMenuItem,
          action: {
            type: 'link',
            href: menuItemLink,
            openInNewTab: true,
          },
        },
      },
    });

    const linkElement = screen.getByRole('menuitem', {
      name: textMock('testMenuItem'),
    });
    expect(linkElement).toHaveAttribute('target', '_blank');
    expect(linkElement).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

type Props = {
  componentProps: Partial<SmallHeaderMenuItemProps>;
  contextProps: Partial<HeaderContextProps>;
  routerInitialEntries?: string[];
};

const renderSmallHeaderMenuItem = ({
  componentProps,
  routerInitialEntries = ['/'],
  contextProps,
}: Partial<Props> = {}) => {
  return render(
    <MockServicesContextWrapper initialEntries={routerInitialEntries}>
      <HeaderContext.Provider value={{ ...headerContextValueMock, ...contextProps }}>
        <SmallHeaderMenuItem {...defaultProps} {...componentProps} />
      </HeaderContext.Provider>
    </MockServicesContextWrapper>,
  );
};
