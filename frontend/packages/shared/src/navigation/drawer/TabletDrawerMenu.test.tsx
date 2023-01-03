import React from 'react';
import type { ITabletDrawerMenuProps } from './TabletDrawerMenu';
import TabletDrawerMenu from './TabletDrawerMenu';
import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const user = userEvent.setup();

describe('TabletDrawerMenu', () => {
  it('should not render the menu when tabletDrawerOpen is false', () => {
    render({ tabletDrawerOpen: false });

    expect(screen.getByText(/logg ut/i)).not.toBeVisible();
  });

  it('should render the menu when tabletDrawerOpen is true', () => {
    render({ tabletDrawerOpen: true });

    expect(screen.getByText(/logg ut/i)).toBeVisible();
  });

  it('should call handleTabletDrawerMenu when clicking menu button, ', async () => {
    const handleTabletDrawerMenu = jest.fn();
    render({ handleTabletDrawerMenu, tabletDrawerOpen: false });

    const menuButton = screen.getByRole('button', {
      name: /meny/i,
    });
    await user.click(menuButton);
    expect(handleTabletDrawerMenu).toHaveBeenCalled();
  });
});

const render = (props: Partial<ITabletDrawerMenuProps> = {}) => {
  const allProps = {
    mainMenuItems: [],
    tabletDrawerOpen: true,
    handleTabletDrawerMenu: jest.fn(),
    ...props,
  } as ITabletDrawerMenuProps;

  return rtlRender(
    <TabletDrawerMenu {...allProps} />
  );
};
