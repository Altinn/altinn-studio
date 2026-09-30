import { screen, render } from '@testing-library/react';
import { SmallHeaderMenuItem, type SmallHeaderMenuItemProps } from './SmallHeaderMenuItem';
import { textMock } from '@studio/testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';
import type { UserEvent } from '@testing-library/user-event';
import { StudioDropdown } from '@studio/components';
import type { NavigationMenuItem } from '../../../../../types/NavigationMenuItem';
import { HeaderContext, type HeaderContextProps } from '../../../../../context/HeaderContext';
import { MockServicesContextWrapper } from '../../../../../dashboardTestUtils';
import { headerContextValueMock } from '../../../../../testing/headerContextMock';

const origin: string = window.location.origin;
const menuItemName: string = 'testMenuItem';
const menuItemLink: string = '/test-path';
const path: string = `${origin}${menuItemLink}`;
const triggerButtonText: string = 'openMenu';
const mockMenuItem: NavigationMenuItem = {
  itemName: menuItemName,
  action: {
    type: 'link',
    href: menuItemLink,
    openInNewTab: false,
  },
};

const defaultProps: SmallHeaderMenuItemProps = {
  menuItem: mockMenuItem,
};

describe('SmallHeaderMenuItem', () => {
  afterEach(() => jest.clearAllMocks());

  it('should render a NavLink when the menuItem action type is "link"', async () => {
    await renderSmallHeaderMenuItem();

    const linkElement = getMenuItem(textMock(menuItemName));
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveAttribute('href', path);
  });

  it('should close the menu when the NavLink is clicked', async () => {
    const user = userEvent.setup();
    await renderSmallHeaderMenuItem({ user });

    const trigger = getTriggerButton();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.click(getMenuItem(textMock(menuItemName)));

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('should call the action and close the menu when the item is a button', async () => {
    const user = userEvent.setup();
    const menuItemButtonOnClick = jest.fn();
    await renderSmallHeaderMenuItem({
      user,
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

    const trigger = getTriggerButton();
    await user.click(getMenuItem(menuItemName));

    expect(menuItemButtonOnClick).toHaveBeenCalledTimes(1);
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

    const linkElement = getMenuItem(textMock(menuItemName));
    expect(linkElement).toHaveAttribute('target', '_blank');
    expect(linkElement).toHaveAttribute('rel', 'noopener noreferrer');
  });
});

const getMenuItem = (name: string): HTMLElement => screen.getByRole('menuitem', { name });

const getTriggerButton = (): HTMLElement => screen.getByRole('button', { name: triggerButtonText });

type Props = {
  componentProps: Partial<SmallHeaderMenuItemProps>;
  contextProps: Partial<HeaderContextProps>;
  routerInitialEntries?: string[];
  user: UserEvent;
};

const renderSmallHeaderMenuItem = async ({
  componentProps,
  routerInitialEntries = ['/'],
  contextProps,
  user = userEvent.setup(),
}: Partial<Props> = {}): Promise<void> => {
  render(
    <MockServicesContextWrapper initialEntries={routerInitialEntries}>
      <HeaderContext.Provider value={{ ...headerContextValueMock, ...contextProps }}>
        <StudioDropdown triggerButtonText={triggerButtonText}>
          <StudioDropdown.List>
            <SmallHeaderMenuItem {...defaultProps} {...componentProps} />
          </StudioDropdown.List>
        </StudioDropdown>
      </HeaderContext.Provider>
    </MockServicesContextWrapper>,
  );
  await user.click(getTriggerButton());
};
