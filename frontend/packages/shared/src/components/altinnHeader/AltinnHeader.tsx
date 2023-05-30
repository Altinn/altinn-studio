import AltinnStudioLogo from 'app-shared/navigation/main-header/AltinnStudioLogo';
import React from 'react';
import classes from './AltinnHeader.module.css';
import { AltinnSubMenu } from '../altinnSubHeader';
import { AltinnHeaderMenu } from '../altinnHeaderMenu';
import { AltinnHeaderButton } from '../altinnHeaderButtons/AltinnHeaderButton';
import { AltinnHeaderProfile } from '../AltinnHeaderProfile/AltinnHeaderProfile';
import { IRepository } from 'app-shared/types/global';
import { User } from 'app-shared/types/User';
import classnames from 'classnames';
import { AltinnButtonActionItem, AltinnHeaderVariant } from './types';
import { AltinnHeaderMenuItem } from '../altinnHeaderMenu/AltinnHeaderMenu';

export interface AltinnHeaderProps {
  menu: AltinnHeaderMenuItem[];
  activeMenuSelection?: string;
  showSubMenu: boolean;
  subMenuContent?: JSX.Element;
  repository: IRepository;
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
        <div className={classes.rightContent} data-testid='altinn-header-buttons'>
          {buttonActions && (
            <div className={classes.rightContentButtons}>
              {buttonActions.map((action) => (
                <AltinnHeaderButton key={action.menuKey} action={action} />
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
