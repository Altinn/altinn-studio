import AltinnStudioLogo from 'app-shared/navigation/main-header/AltinnStudioLogo';
import React from 'react';
import classes from './AltinnHeader.module.css';
import { AltinnSubMenu } from '../altinnSubHeader';
import { AltinnHeaderMenu } from '../altinnHeaderMenu';
import { AltinnHeaderButton } from '../altinnHeaderButtons/AltinnHeaderButton';
import { AltinnHeaderProfile } from '../AltinnHeaderProfile';
import { User } from 'app-shared/types/User';
import classnames from 'classnames';
import { AltinnButtonActionItem, AltinnHeaderVariant } from './types';
import { AltinnHeaderMenuItem } from '../altinnHeaderMenu/AltinnHeaderMenu';
import { Repository } from 'app-shared/types/Repository';

export interface AltinnHeaderProps {
  menu: AltinnHeaderMenuItem[];
  activeMenuSelection?: string;
  showSubMenu: boolean;
  subMenuContent?: JSX.Element;
  repository: Repository;
  user: User;
  org: string;
  app: string;
  variant?: AltinnHeaderVariant;
  buttonActions: AltinnButtonActionItem[];
}

export const AltinnHeader = ({
  menu,
  showSubMenu,
  activeMenuSelection,
  repository,
  org,
  app,
  user,
  subMenuContent,
  buttonActions,
  variant = 'regular',
}: AltinnHeaderProps) => {
  return (
    <div id='altinn-header-container'>
      <div className={classnames(classes.altinnHeaderBar, classes[variant])}>
        <div className={classes.leftContent}>
          <a href='/'>
            <AltinnStudioLogo />
          </a>
          <span className={classes.bigSlash}>/</span>
          <span className={classes.appName}>{app || ''}</span>
        </div>
        <AltinnHeaderMenu activeSubHeaderSelection={activeMenuSelection} menu={menu} />
        <div className={classes.rightContent}>
          {buttonActions && (
            <div className={classes.rightContentButtons}>
              {buttonActions.map((action) => (
                <div key={action.menuKey}>
                  <AltinnHeaderButton action={action} />
                </div>
              ))}
            </div>
          )}
          <AltinnHeaderProfile org={org} repository={repository} user={user} />
        </div>
      </div>
      {showSubMenu && <AltinnSubMenu variant={variant}>{subMenuContent}</AltinnSubMenu>}
    </div>
  );
};
