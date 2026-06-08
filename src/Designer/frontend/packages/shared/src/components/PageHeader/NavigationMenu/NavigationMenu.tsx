import type { ReactElement } from 'react';
import { StudioLink, StudioPageHeader } from '@studio/components';
import { useTranslation } from 'react-i18next';
import cn from 'classnames';
import classes from './NavigationMenu.module.css';
import type { NavigationMenuItem } from './NavigationMenuItem';

type NavigationMenuProps = {
  items: NavigationMenuItem[];
};

export const NavigationMenu = ({ items }: NavigationMenuProps): ReactElement => {
  const { t } = useTranslation();

  return (
    <ul className={classes.menu}>
      {items.map((item) => (
        <li key={item.textKey}>
          <StudioPageHeader.HeaderLink
            isBeta={item.isBeta}
            renderLink={(props) => (
              <StudioLink href={item.href} {...props}>
                <span className={cn({ [classes.active]: item.isActive })}>{t(item.textKey)}</span>
              </StudioLink>
            )}
          />
        </li>
      ))}
    </ul>
  );
};
