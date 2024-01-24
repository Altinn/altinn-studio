import AltinnStudioLogo from 'app-shared/navigation/main-header/AltinnStudioLogo';
import React from 'react';
import classes from './AltinnHeader.module.css';
import { AltinnSubMenu } from '../altinnSubHeader';
import { AltinnHeaderMenu } from '../altinnHeaderMenu';
import { AltinnHeaderButton } from '../altinnHeaderButtons/AltinnHeaderButton';
import { AltinnHeaderProfile } from '../AltinnHeaderProfile';
import type { User } from 'app-shared/types/Repository';
import classnames from 'classnames';
import type { AltinnButtonActionItem, AltinnHeaderVariant } from './types';
import type { Repository } from 'app-shared/types/Repository';
import type { TopBarMenuItem } from 'app-shared/types/TopBarMenuItem';
import { getRepositoryType } from 'app-shared/utils/repository';
import { RepositoryType } from 'app-shared/types/global';
import { TopBarMenu } from 'app-shared/enums/TopBarMenu';

export interface AltinnHeaderProps {
  menuItems: TopBarMenuItem[];
  showSubMenu: boolean;
  subMenuContent?: JSX.Element;
  repository: Repository;
  user: User;
  org: string;
  app: string;
  variant?: AltinnHeaderVariant;
  repoOwnerIsOrg?: boolean;
  buttonActions: AltinnButtonActionItem[];
}

export const AltinnHeader = ({
  menuItems,
  showSubMenu,
  repository,
  org,
  app,
  user,
  subMenuContent,
  buttonActions,
  variant = 'regular',
  repoOwnerIsOrg,
}: AltinnHeaderProps) => {
  const repositoryType = getRepositoryType(org, app);

  return (
    <div role='banner'>
      <div className={classnames(classes.altinnHeaderBar, classes[variant])}>
        <div className={classes.leftContent}>
          <a href='/'>
            <AltinnStudioLogo />
          </a>
          {app && (
            <>
              <span className={classes.bigSlash}>/</span>
              <span className={classes.appName}>{app}</span>
            </>
          )}
        </div>
        <AltinnHeaderMenu menuItems={menuItems} />
        <div className={classes.rightContent}>
          {buttonActions && (
            <div className={classes.rightContentButtons}>
              {buttonActions.map((action) =>
                !repoOwnerIsOrg && action.menuKey === TopBarMenu.Deploy
                  ? null
                  : repositoryType !== RepositoryType.Datamodels && (
                      <AltinnHeaderButton key={action.menuKey} action={action} />
                    ),
              )}
            </div>
          )}
          <AltinnHeaderProfile org={org} repository={repository} user={user} />
        </div>
      </div>
      {showSubMenu && <AltinnSubMenu variant={variant}>{subMenuContent}</AltinnSubMenu>}
    </div>
  );
};
