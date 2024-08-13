import React, { useState, type ReactElement } from 'react';
import classes from './AltinnHeaderMenu.module.css';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TopBarMenuGroup, TopBarMenuItem } from 'app-shared/types/TopBarMenuItem';
import { StudioButton, type StudioButtonProps, useIsSmallWidth } from '@studio/components';
import { MenuHamburgerIcon } from '@studio/icons';
import { groupMenuItemsByGroup } from 'app-development/layout/AppBar/appBarConfig';
import { TopBarGroup } from 'app-shared/enums/TopBarMenu';
import { Divider, DropdownMenu, Tag } from '@digdir/designsystemet-react';

export interface IAltinnHeaderMenuProps {
  menuItems: TopBarMenuItem[];
  windowResizeWidth: number;
}

// TODO - Refactor
export const AltinnHeaderMenu = ({ menuItems, windowResizeWidth }: IAltinnHeaderMenuProps) => {
  const { t } = useTranslation();

  const isSmallWidth = useIsSmallWidth(windowResizeWidth);

  const groupedMenuItems: TopBarMenuGroup[] = groupMenuItemsByGroup(menuItems);

  if (!menuItems.length) return null;

  if (isSmallWidth) {
    return (
      <SmallNavigationMenu
        menuGroups={[...groupedMenuItems.map(mapMenuGroup)]}
        anchorButtonProps={{
          icon: <MenuHamburgerIcon />,
          variant: 'tertiary',
          color: 'inverted',
          children: t('top_menu.menu'),
        }}
      />
    );
  }
  return (
    <LargeNavigationMenu
      menuItems={menuItems.map((menuItem: TopBarMenuItem) => ({
        link: menuItem.link,
        name: t(menuItem.key),
        isBeta: menuItem.isBeta,
      }))}
    />
  );
};

const mapMenuGroup = (menuGroup: TopBarMenuGroup) => ({
  name: menuGroup.groupName,
  showName: menuGroup.groupName === TopBarGroup.Tools,
  items: menuGroup.menuItems.map((menuItem: TopBarMenuItem) => ({
    link: menuItem.link,
    name: menuItem.key,
    isBeta: menuItem.isBeta,
  })),
});

type StudioNavigationMenuItem = {
  name: string;
  link: string;
  isBeta?: boolean;
};

type LargeNavigationMenuProps = {
  menuItems: StudioNavigationMenuItem[];
};

const LargeNavigationMenu = ({ menuItems }: LargeNavigationMenuProps): ReactElement => {
  const { t } = useTranslation();
  //const location = useLocation();
  //const currentRoutePath: string = getRouterRouteByPathname(location.pathname);

  return (
    <div className={classes.largeMenu}>
      <ul className={classes.menu}>
        {menuItems.map((menuItem: StudioNavigationMenuItem) => (
          <li key={menuItem.name} className={classes.menuItem}>
            {/*<StudioButton
              asChild
              color='inverted'
              style={
                getRouterRouteByPathname(menuItem.link) === currentRoutePath
                  ? {
                      borderBottom: '2px solid white',
                    }
                  : undefined
              }
            >*/}
            <NavLink
              to={menuItem.link}
              className={({ isActive }) => (isActive ? classes.active : '')}
            >
              {menuItem.name}
            </NavLink>
            {menuItem.isBeta && (
              <Tag color='info' size='small' className={classes.betaTag}>
                {t('general.beta')}
              </Tag>
            )}
            {/*</StudioButton>*/}
          </li>
        ))}
      </ul>
    </div>
  );
};

// Make StudioNavigation av det over

/*
betaText?: string
betaText && (
  <Tag color='info' size='small'>
    {betaText}
  </Tag>
)
  */

/*
Så er jo da spørsmålet om vi skal da også lage en som heter StudioNavigationButtons som
viser en liste med StudioNavigationButton, og dersom det er fler enn en button så vises
hamburger når liten, og dersom det bare er en så vises den ene hele tiden
*/

type StudioNavigationMenuSmallGroup = {
  name: string;
  showName?: boolean;
  items: StudioNavigationMenuItem[];
};

export type SmallNavigationMenuProps = {
  menuGroups: StudioNavigationMenuSmallGroup[];
  anchorButtonProps: StudioButtonProps;
};

const SmallNavigationMenu = ({
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
        {/* MOVE THIS TO SHARED */}
        {menuGroups.map((menuGroup: StudioNavigationMenuSmallGroup, index: number) => (
          <React.Fragment key={menuGroup.name}>
            <DropdownMenu.Group heading={menuGroup.showName ? t(menuGroup.name) : ''}>
              {menuGroup.items.map((menuItem: StudioNavigationMenuItem) => {
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

const getRouterRouteByPathname = (pathname: string): string => {
  const pathnameArray = pathname.split('/');
  return pathnameArray[pathnameArray.length - 1];
};
