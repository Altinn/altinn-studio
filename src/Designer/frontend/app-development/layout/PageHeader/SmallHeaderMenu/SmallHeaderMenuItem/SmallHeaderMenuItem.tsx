import type { ReactElement } from 'react';
import classes from './SmallHeaderMenuItem.module.css';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StudioDropdown, studioBetaTagClasses } from '@studio/components';
import { UrlUtils } from '@studio/pure-functions';
import { type NavigationMenuSmallItem } from 'app-development/types/HeaderMenu/NavigationMenuSmallItem';

export type SmallHeaderMenuItemProps = {
  menuItem: NavigationMenuSmallItem;
};

export const SmallHeaderMenuItem = ({ menuItem }: SmallHeaderMenuItemProps): ReactElement => {
  const { t } = useTranslation();

  const location = useLocation();
  const currentRoutePath: string = UrlUtils.extractLastRouterParam(location.pathname);

  if (menuItem.action.type === 'button') {
    return (
      <StudioDropdown.Item>
        <StudioDropdown.Button role='menuitem' onClick={menuItem.action.onClick}>
          {menuItem.name}
        </StudioDropdown.Button>
      </StudioDropdown.Item>
    );
  }

  if (menuItem.action.isOutsideRouter) {
    const { href, openInNewTab } = menuItem.action;
    return (
      <StudioDropdown.Item>
        <StudioDropdown.Button asChild>
          <a
            href={href}
            target={openInNewTab ? '_blank' : undefined}
            rel={openInNewTab ? 'noopener noreferrer' : undefined}
            role='menuitem'
          >
            {menuItem.name}
          </a>
        </StudioDropdown.Button>
      </StudioDropdown.Item>
    );
  }

  const linkTarget: string = menuItem.action.openInNewTab ? '_blank' : '';
  const linkRel: string = menuItem.action.openInNewTab ? 'noopener noreferrer' : '';

  const linkItemClassName: string =
    UrlUtils.extractLastRouterParam(menuItem.action.href) === currentRoutePath
      ? classes.active
      : '';

  return (
    <StudioDropdown.Item>
      <StudioDropdown.Button asChild>
        <NavLink
          className={`${linkItemClassName} ${menuItem.isBeta ? studioBetaTagClasses.isBeta : ''}`}
          to={menuItem.action.href}
          role='menuitem'
          target={linkTarget}
          rel={linkRel}
        >
          {t(menuItem.name)}
        </NavLink>
      </StudioDropdown.Button>
    </StudioDropdown.Item>
  );
};
