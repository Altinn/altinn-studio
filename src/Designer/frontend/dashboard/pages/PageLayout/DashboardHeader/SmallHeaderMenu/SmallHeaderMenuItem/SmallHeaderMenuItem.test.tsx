import React from 'react';
import { screen, render } from '@testing-library/react';
import { SmallHeaderMenuItem, type SmallHeaderMenuItemProps } from './SmallHeaderMenuItem';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { NavigationMenuItem } from '../../../../../types/NavigationMenuItem';
import { HeaderContext, type HeaderContextProps } from '../../../../../context/HeaderContext';
import { MockServicesContextWrapper } from '../../../../../dashboardTestUtils';
import { headerContextValueMock } from '../../../../../testing/headerContextMock';

const origin: string = window.location.origin;
const menuItemName: string = 'testMenuItem';
const menuItemLink: string = '/test-path';
const path: string = `${origin}${menuItemLink}`;
const mockMenuItem: NavigationMenuItem = {
  itemName: menuItemName,
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
    expect(linkElement).toHaveAttribute('href', path);
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

  it('should call onClick when the NavLink is clicked when it is a button', async () => {
    const user = userEvent.setup();
    const menuItemButtonOnClick = jest.fn();
    renderSmallHeaderMenuItem({
      componentProps: {
        menuItem: {
          ...mockMenuItem,
          action: {
            type: 'button',
            onClick: menuItemButtonOnClick,
          },
        },
      },
    });

    const buttonElement = screen.getByRole('menuitem', {
      name: menuItemName,
    });
    await user.click(buttonElement);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
    expect(menuItemButtonOnClick).toHaveBeenCalledTimes(1);
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
