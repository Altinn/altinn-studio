import React, { useState, type ReactElement } from 'react';
import classes from './SmallNavigationMenu.module.css';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StudioButton, type StudioButtonProps } from '@studio/components';
import { Divider, DropdownMenu, Tag } from '@digdir/designsystemet-react';
import { getRouterRouteByPathname } from 'app-development/utils/headerMenu/headerMenuUtils';
import { type NavigationMenuSmallItem } from 'app-development/types/HeaderMenu/NavigationMenuItem';
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
              {menuGroup.items.map((menuItem: NavigationMenuSmallItem) => {
                // TODO COMPONENT
                if (menuItem.action.type === 'button') {
                  return (
                    <DropdownMenu.Item key={menuItem.name} onClick={menuItem.action.onClick}>
                      {menuItem.name}
                    </DropdownMenu.Item>
                  );
                }
                return (
                  <DropdownMenu.Item
                    key={menuItem.name}
                    asChild
                    className={
                      getRouterRouteByPathname(menuItem.action.href) === currentRoutePath
                        ? classes.active
                        : ''
                    }
                  >
                    <NavLink
                      to={menuItem.action.href}
                      onClick={handleClose}
                      target={menuItem.action.openInNewTab && '_blank'}
                      rel={menuItem.action.openInNewTab && 'noopener noreferrer'}
                    >
                      {t(menuItem.name)}
                      {menuItem.isBeta && <Tag color='first'>{t('general.beta')}</Tag>}
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
