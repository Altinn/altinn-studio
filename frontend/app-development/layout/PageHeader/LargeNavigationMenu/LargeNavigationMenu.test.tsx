import React from 'react';
import { render, screen } from '@testing-library/react';
import { LargeNavigationMenu, type LargeNavigationMenuProps } from './LargeNavigationMenu';
import { MemoryRouter } from 'react-router-dom';
import { type NavigationMenuItem } from 'app-development/types/HeaderMenu/NavigationMenuItem';
import { PageHeaderContext } from 'app-development/contexts/PageHeaderContext';

const menuItems: NavigationMenuItem[] = [
  { name: 'Active Item', link: '/link1', isBeta: true },
  { name: 'Inactive Item', link: '/link2' },
];

const defaultProps: LargeNavigationMenuProps = {
  menuItems,
};

describe('LargeNavigationMenu', () => {
  afterEach(() => jest.clearAllMocks());

  it('should render all menu items passed as props', () => {
    renderLargeNavigationMenu();

    menuItems.forEach((item) => {
      expect(screen.getByRole('link', { name: item.name })).toBeInTheDocument();
    });
  });

  it('should correctly highlight the active menu item based on the current route', () => {
    renderLargeNavigationMenu({
      routerInitialEntries: [menuItems[0].link],
    });

    const activeItem = screen.getByRole('link', { name: menuItems[0].name });
    expect(activeItem).toHaveClass('active');
  });

  it('should set "isBeta" className for menu item that is beta', () => {
    renderLargeNavigationMenu();
    const menuItem = screen.getByRole('link', { name: menuItems[0].name });
    expect(menuItem).toHaveClass('isBeta');
  });

  it('should not set "isBeta" className for menu item that is not beta', () => {
    renderLargeNavigationMenu();
    const menuItem = screen.getByRole('link', { name: menuItems[1].name });
    expect(menuItem).not.toHaveClass('isBeta');
  });
});

type Props = {
  componentProps: Partial<LargeNavigationMenuProps>;
  routerInitialEntries?: string[];
};

const renderLargeNavigationMenu = ({
  componentProps,
  routerInitialEntries = ['/'],
}: Partial<Props> = {}) => {
  return render(
    <MemoryRouter initialEntries={routerInitialEntries}>
      <PageHeaderContext.Provider value={{ variant: 'regular' }}>
        <LargeNavigationMenu {...defaultProps} {...componentProps} />
      </PageHeaderContext.Provider>
    </MemoryRouter>,
  );
};
