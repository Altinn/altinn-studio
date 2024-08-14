import React, { useState, type ReactElement } from 'react';
import classes from './SmallNavigationMenu.module.css';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StudioButton, type StudioButtonProps } from '@studio/components';
import { Divider, DropdownMenu } from '@digdir/designsystemet-react';
import { getRouterRouteByPathname } from 'app-development/utils/headerMenu/headerMenuUtils';
import { type NavigationMenuItem } from 'app-development/types/HeaderMenu/NavigationMenuItem';
import { type NavigationMenuSmallGroup } from 'app-development/types/HeaderMenu/NavigationMenuSmallGroup';

export type SmallNavigationMenuProps = {
  menuGroups: NavigationMenuSmallGroup[];
  anchorButtonProps: StudioButtonProps;
};

export const SmallNavigationMenu = ({
  menuGroups,
  anchorButtonProps,
}: SmallNavigationMenuProps): ReactElement => {
  const [open, setOpen] = useState<boolean>(false);
  const { t } = useTranslation();

  const location = useLocation();
  const currentRoutePath: string = getRouterRouteByPathname(location.pathname);

  const handleToggleMenu = () => {
    setOpen((isOpen) => !isOpen);
  };

  const handleClose = () => {
    setOpen(false);
  };

  return (
    <DropdownMenu onClose={handleClose} open={open}>
      <DropdownMenu.Trigger asChild>
        <StudioButton
          aria-expanded={open}
          aria-haspopup='menu'
          onClick={handleToggleMenu}
          {...anchorButtonProps}
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Content>
        {menuGroups.map((menuGroup: NavigationMenuSmallGroup, index: number) => (
          <React.Fragment key={menuGroup.name}>
            <DropdownMenu.Group heading={menuGroup.showName ? t(menuGroup.name) : ''}>
              {menuGroup.items.map((menuItem: NavigationMenuItem) => {
                const { name, link } = menuItem;
                return (
                  <DropdownMenu.Item
                    key={name}
                    asChild
                    className={
                      getRouterRouteByPathname(link) === currentRoutePath ? classes.activeSmall : ''
                    }
                  >
                    <NavLink
                      to={link}
                      className={({ isActive }) => (isActive ? classes.activeSmall : '')}
                      onClick={handleClose}
                    >
                      {t(name)}
                    </NavLink>
                  </DropdownMenu.Item>
                );
              })}
            </DropdownMenu.Group>
            {index !== menuGroups.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </DropdownMenu.Content>
    </DropdownMenu>
  );
};
