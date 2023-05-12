import { useAppSelector } from 'app-development/hooks';
import { useUserQuery } from 'app-development/hooks/queries/useUserQuery';
import AltinnStudioLogo from 'app-shared/navigation/main-header/AltinnStudioLogo';
import { ProfileMenu } from 'app-shared/navigation/main-header/profileMenu';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import classes from './AltinnHeader.module.css';
import headerButtonsClasses from '../altinnHeaderButtons/AltinnHeaderbuttons.module.css';
import { AltinnSubMenu } from '../altinnSubHeader';
import { AltinnHeaderMenu } from '../altinnHeaderMenu';
import { AltinnHeaderButtons } from '../altinnHeaderButtons';
import { getRepositoryType } from 'app-shared/utils/repository';
import { getTopBarMenu } from 'app-development/layout/AppBar/appBarConfig';
import { previewPath, publiserPath } from 'app-shared/api-paths';
import { TopBarMenu } from 'app-development/layout/AppBar/appBarConfig';
import { ButtonVariant } from '@digdir/design-system-react';
export interface AltinnHeaderProps {
  showSubMenu: boolean;
}

export const AltinnHeader = ({ showSubMenu }: AltinnHeaderProps) => {
  const repository = useAppSelector((state) => state.serviceInformation.repositoryInfo);
  const { t } = useTranslation();
  const { org, app } = useParams();
  const { data: user } = useUserQuery();
  const repositoryType = getRepositoryType(org, app);
  const menu = getTopBarMenu(repositoryType);
  const actions = [
    {
      title: 'top_menu.preview',
      path: previewPath,
      menuKey: TopBarMenu.Preview,
      buttonVariant: ButtonVariant.Outline,
      headerButtonsClasses: headerButtonsClasses.previewButton,
    },
    {
      title: 'top_menu.deploy',
      path: publiserPath,
      menuKey: TopBarMenu.Deploy,
      buttonVariant: ButtonVariant.Outline,
      headerButtonsClasses: undefined,
    },
  ];

  return (
    <div>
      <div className={classes.altinnHeaderBar}>
        <div className={classes.leftContent}>
          <a href='/'>
            <AltinnStudioLogo />
          </a>
          <span className={classes.bigSlash}>/</span>
          <span className={classes.appName}>{app || ''}</span>
        </div>
        <AltinnHeaderMenu menu={menu} />
        <AltinnHeaderButtons actions={actions} />
        <div className={classes.rightContent}>
          <div className={classes.profileMenuWrapper}>
            {user && (
              <>
                <span className={classes.userOrgNames}>
                  {user.login !== org
                    ? t('shared.header_user_for_org', {
                        user: user.login,
                        org: repository.owner.full_name || repository.owner.login,
                      })
                    : user.login}
                </span>
                <ProfileMenu showlogout user={user} />
              </>
            )}
          </div>
        </div>
      </div>
      {showSubMenu && <AltinnSubMenu />}
    </div>
  );
};
