import type { ReactElement } from 'react';
import classes from './SmallHeaderMenuItem.module.css';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StudioDropdown } from '@studio/components';
import type { NavigationMenuItem } from '../../../../../types/NavigationMenuItem';

export type SmallHeaderMenuItemProps = {
  menuItem: NavigationMenuItem;
};

export const SmallHeaderMenuItem = ({ menuItem }: SmallHeaderMenuItemProps): ReactElement => {
  const { t } = useTranslation();
  const origin = window.location.origin;

  if (menuItem.action.type === 'button') {
    const buttonItemClassName: string = menuItem.isActive ? classes.active : '';

    return (
      <StudioDropdown.Item>
        <StudioDropdown.Button
          role='menuitem'
          className={buttonItemClassName}
          onClick={menuItem.action.onClick}
        >
          {menuItem.itemName}
        </StudioDropdown.Button>
      </StudioDropdown.Item>
    );
  }

  const linkTarget: string = menuItem.action.openInNewTab ? '_blank' : '';
  const linkRel: string = menuItem.action.openInNewTab ? 'noopener noreferrer' : '';

  return (
    <StudioDropdown.Item>
      <StudioDropdown.Button asChild>
        <NavLink
          to={`${origin}${menuItem.action.href}`}
          role='menuitem'
          target={linkTarget}
          rel={linkRel}
        >
          {t(menuItem.itemName)}
        </NavLink>
      </StudioDropdown.Button>
    </StudioDropdown.Item>
  );
};
