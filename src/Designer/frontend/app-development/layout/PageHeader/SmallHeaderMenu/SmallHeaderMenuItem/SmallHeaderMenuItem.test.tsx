import React from 'react';
import { screen, render } from '@testing-library/react';
import { SmallHeaderMenuItem, type SmallHeaderMenuItemProps } from './SmallHeaderMenuItem';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { MemoryRouter } from 'react-router-dom';
import { type NavigationMenuSmallItem } from '../../../../types/HeaderMenu/NavigationMenuSmallItem';
import { PageHeaderContext } from '../../../../contexts/PageHeaderContext';
import userEvent from '@testing-library/user-event';

const menuItemName: string = 'testMenuItem';
const menuItemLink: string = '/test-path';
const mockMenuItem: NavigationMenuSmallItem = {
  name: menuItemName,
  action: {
    type: 'link',
    href: menuItemLink,
    openInNewTab: false,
  },
  isBeta: false,
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
    renderSmallHeaderMenuItem({
      routerInitialEntries: [menuItemLink],
    });

    const linkElement = screen.getByRole('menuitem', {
      name: textMock(menuItemName),
    });
    expect(linkElement).toHaveClass('active');
  });

  it('should add "isBeta" class when menuItem is beta', () => {
    renderSmallHeaderMenuItem({
      componentProps: { menuItem: { ...mockMenuItem, isBeta: true } },
    });

    const linkElement = screen.getByRole('menuitem', {
      name: textMock(menuItemName),
    });
    expect(linkElement).toHaveClass('isBeta');
  });

  it('should not add "isBeta" class by default', () => {
    renderSmallHeaderMenuItem();

    const linkElement = screen.getByRole('menuitem', {
      name: textMock(menuItemName),
    });
    expect(linkElement).not.toHaveClass('isBeta');
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
  routerInitialEntries?: string[];
};

const renderSmallHeaderMenuItem = ({
  componentProps,
  routerInitialEntries = ['/'],
}: Partial<Props> = {}) => {
  return render(
    <MemoryRouter initialEntries={routerInitialEntries}>
      <PageHeaderContext.Provider value={{ variant: 'regular' }}>
        <SmallHeaderMenuItem {...defaultProps} {...componentProps} />
      </PageHeaderContext.Provider>
    </MemoryRouter>,
  );
};
