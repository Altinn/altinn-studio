import { render, screen } from '@testing-library/react';
import { LargeNavigationMenu, type LargeNavigationMenuProps } from './LargeNavigationMenu';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
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

  it('should keep the parent menu item active when on a sub-page of its route', () => {
    renderLargeNavigationMenu({
      routerInitialEntries: [`${menuItems[0].link}/some-sub-page`],
    });

    expect(screen.getByText(menuItems[0].name)).toHaveClass('active');
  });

  it('should not highlight a menu item whose route only matches the app name', () => {
    renderLargeNavigationMenu({
      componentProps: { menuItems: [{ name: 'App Named Item', link: 'my-app' }] },
      routerInitialEntries: ['/my-org/my-app/other-route'],
      routePath: '/:org/:app/*',
    });

    expect(screen.getByText('App Named Item')).not.toHaveClass('active');
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
  routePath?: string;
};

const renderLargeNavigationMenu = ({
  componentProps,
  routerInitialEntries = ['/'],
  routePath = '*',
}: Partial<Props> = {}) => {
  return render(
    <MemoryRouter initialEntries={routerInitialEntries}>
      <Routes>
        <Route
          path={routePath}
          element={
            <PageHeaderContext.Provider value={{ variant: 'regular' }}>
              <LargeNavigationMenu {...defaultProps} {...componentProps} />
            </PageHeaderContext.Provider>
          }
        />
      </Routes>
    </MemoryRouter>,
  );
};
