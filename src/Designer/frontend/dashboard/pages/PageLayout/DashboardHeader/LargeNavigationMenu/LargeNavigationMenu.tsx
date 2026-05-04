import type { ReactElement } from 'react';
import type { HeaderMenuItem } from '../../../../types/HeaderMenuItem';
import { useSelectedContext } from '../../../../hooks/useSelectedContext';
import { StudioLink, StudioPageHeader } from '@studio/components';
import { NavLink } from 'react-router-dom';
import classes from './LargeNavigationMenu.module.css';
import cn from 'classnames';
import { useSubroute } from '../../../../hooks/useSubRoute';

type LargeNavigationMenuProps = {
  menuItems: HeaderMenuItem[];
};

export const LargeNavigationMenu = ({ menuItems }: LargeNavigationMenuProps): ReactElement => {
  return (
    <ul className={classes.menu}>
      {menuItems.map((menuItem: HeaderMenuItem) => (
        <NavigationMenuItem key={menuItem.name} menuItem={menuItem} />
      ))}
    </ul>
  );
};

type NavigationMenuItemProps = {
  menuItem: HeaderMenuItem;
};

function NavigationMenuItem({ menuItem }: NavigationMenuItemProps): ReactElement {
  const selectedContext: string = useSelectedContext();
  const subroute = useSubroute();
  const path: string = menuItem.getLink(selectedContext);

  return (
    <li key={menuItem.key}>
      <StudioPageHeader.HeaderLink
        isBeta={menuItem.isBeta}
        renderLink={(props) =>
          menuItem.isExternalLink ? (
            <StudioLink href={path} {...props}>
              {menuItem.name}
            </StudioLink>
          ) : (
            <NavLink to={path} {...props}>
              <span
                className={cn({
                  [classes.active]: path.startsWith('/' + subroute),
                })}
              >
                {menuItem.name}
              </span>
            </NavLink>
          )
        }
      />
    </li>
  );
}
