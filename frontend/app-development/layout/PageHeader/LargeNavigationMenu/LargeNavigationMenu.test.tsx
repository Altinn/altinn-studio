import React from 'react';
import { render, screen } from '@testing-library/react';
import { LargeNavigationMenu, type LargeNavigationMenuProps } from './LargeNavigationMenu';
import { MemoryRouter } from 'react-router-dom';
import { textMock } from '@studio/testing/mocks/i18nMock';
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
      expect(screen.getByText(item.name)).toBeInTheDocument();
    });
  });

  it('should correctly highlight the active menu item based on the current route', () => {
    renderLargeNavigationMenu({
      routerInitialEntries: [menuItems[0].link],
    });

    const activeItem = screen.getByText(menuItems[0].name);
    expect(activeItem).toHaveClass('active');
  });

  it('should display the beta tag for items marked as beta', () => {
    renderLargeNavigationMenu();

    const betaTags = screen.getAllByText(textMock('general.beta'));

    expect(betaTags.length).toEqual(menuItems.filter((item) => item.isBeta).length);
  });

  it('should not display the beta tag for items not marked as beta', () => {
    renderLargeNavigationMenu();

    const betaTags = screen.getAllByText(textMock('general.beta'));

    expect(menuItems.length - betaTags.length).toEqual(
      menuItems.filter((item) => !item.isBeta).length,
    );
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
