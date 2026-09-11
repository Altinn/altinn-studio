import { screen, render } from '@testing-library/react';
import { SmallHeaderMenuItem, type SmallHeaderMenuItemProps } from './SmallHeaderMenuItem';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { MemoryRouter } from 'react-router-dom';
import { type NavigationMenuSmallItem } from 'app-development/types/HeaderMenu/NavigationMenuSmallItem';
import { PageHeaderContext } from 'app-development/contexts/PageHeaderContext';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { StudioDropdown } from '@studio/components';

const menuItemName: string = 'testMenuItem';
const menuItemLink: string = '/test-path';
const triggerButtonText: string = 'openMenu';
const mockMenuItem: NavigationMenuSmallItem = {
  name: menuItemName,
  action: {
    type: 'link',
    href: menuItemLink,
    openInNewTab: false,
  },
  isBeta: false,
};

const defaultProps: SmallHeaderMenuItemProps = {
  menuItem: mockMenuItem,
};

describe('SmallHeaderMenuItem', () => {
  afterEach(() => jest.clearAllMocks());

  it('should render a NavLink when the menuItem action type is "link"', async () => {
    await renderSmallHeaderMenuItem();

    const linkElement = getMenuItem();
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveAttribute('href', menuItemLink);
  });

  it('should add "active" class when the current route matches the menuItem href', async () => {
    await renderSmallHeaderMenuItem({
      routerInitialEntries: [menuItemLink],
    });

    expect(getMenuItem()).toHaveClass('active');
  });

  it('should add "isBeta" class when menuItem is beta', async () => {
    await renderSmallHeaderMenuItem({
      componentProps: { menuItem: { ...mockMenuItem, isBeta: true } },
    });

    expect(getMenuItem()).toHaveClass('isBeta');
  });

  it('should not add "isBeta" class by default', async () => {
    await renderSmallHeaderMenuItem();

    expect(getMenuItem()).not.toHaveClass('isBeta');
  });

  it('should close the menu when the NavLink is clicked', async () => {
    const user = userEvent.setup();
    await renderSmallHeaderMenuItem({ user });

    const trigger = screen.getByRole('button', { name: triggerButtonText });
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.click(getMenuItem());

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('should open the link in a new tab when openInNewTab is true', async () => {
    await renderSmallHeaderMenuItem({
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

    const linkElement = getMenuItem();
    expect(linkElement).toHaveAttribute('target', '_blank');
    expect(linkElement).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

const getMenuItem = (): HTMLElement =>
  screen.getByRole('menuitem', { name: textMock(menuItemName) });

type Props = {
  componentProps: Partial<SmallHeaderMenuItemProps>;
  routerInitialEntries?: string[];
  user: UserEvent;
};

const renderSmallHeaderMenuItem = async ({
  componentProps,
  routerInitialEntries = ['/'],
  user = userEvent.setup(),
}: Partial<Props> = {}): Promise<void> => {
  render(
    <MemoryRouter initialEntries={routerInitialEntries}>
      <PageHeaderContext.Provider value={{ variant: 'regular' }}>
        <StudioDropdown triggerButtonText={triggerButtonText}>
          <StudioDropdown.List>
            <SmallHeaderMenuItem {...defaultProps} {...componentProps} />
          </StudioDropdown.List>
        </StudioDropdown>
      </PageHeaderContext.Provider>
    </MemoryRouter>,
  );
  await user.click(screen.getByRole('button', { name: triggerButtonText }));
};
