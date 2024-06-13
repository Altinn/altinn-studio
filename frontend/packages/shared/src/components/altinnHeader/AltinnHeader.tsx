import AltinnStudioLogo from 'app-shared/navigation/main-header/AltinnStudioLogo';
import React from 'react';
import classes from './AltinnHeader.module.css';
import { AltinnSubMenu } from '../altinnSubHeader';
import { AltinnHeaderMenu } from '../altinnHeaderMenu';
import { AltinnHeaderButton } from '../altinnHeaderButtons/AltinnHeaderButton';
import { AltinnHeaderProfile } from '../AltinnHeaderProfile';
import type { User, Repository } from 'app-shared/types/Repository';
import classnames from 'classnames';
import type { AltinnButtonActionItem, AltinnHeaderVariant } from './types';

import type { TopBarMenuItem } from 'app-shared/types/TopBarMenuItem';
import { getRepositoryType } from 'app-shared/utils/repository';
import { RepositoryType } from 'app-shared/types/global';
import { TopBarMenu } from 'app-shared/enums/TopBarMenu';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

  const repositoryType = getRepositoryType(org, app);
  const isOrgRepo = user.login !== org;

  return (
    <div role='banner'>
      <div className={classnames(classes.altinnHeaderBar, classes[variant])}>
        <div className={classes.leftContent}>
          <a href={`/dashboard/${isOrgRepo ? org : ''}`} aria-label={t('top_menu.dashboard')}>
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
                  : repositoryType !== RepositoryType.DataModels && (
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
