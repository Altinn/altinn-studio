import React, { useState, MouseEvent } from 'react';
import classNames from 'classnames';
import { Link, useParams } from 'react-router-dom';
import { getTopBarMenu, TopBarMenu } from './appBarConfig';
import { ProfileMenu } from 'app-shared/navigation/main-header/profileMenu';
import { VersionControlHeader } from '../version-control/VersionControlHeader';
import { getRepositoryType } from 'app-shared/utils/repository';
import classes from './AppBar.module.css';
import { useTranslation } from 'react-i18next';
import AltinnStudioLogo from 'app-shared/navigation/main-header/AltinnStudioLogo';
import { ThreeDotsMenu } from './ThreeDotsMenu';
import { BranchingIcon } from '@navikt/aksel-icons';
import { Button, ButtonVariant } from '@digdir/design-system-react';
import { Popover } from '@mui/material';
import { InformationIcon } from '@navikt/aksel-icons';
import { previewPath, publiserPath } from 'app-shared/api-paths';
import { useUserQuery } from 'app-development/hooks/queries/useUserQuery';
import { useAppSelector } from '../../hooks';

export interface IAppBarProps {
  activeSubHeaderSelection?: string;
  activeLeftMenuSelection?: string;
  showSubMenu?: boolean;
}

export const AppBar = ({ activeSubHeaderSelection, showSubMenu }: IAppBarProps) => {
  const repository = useAppSelector((state) => state.serviceInformation.repositoryInfo);
  const { t } = useTranslation();
  const { org, app } = useParams();
  const repositoryType = getRepositoryType(org, app);
  const menu = getTopBarMenu(repositoryType);
  const handlePubliserClick = () => {
    window.location.href = publiserPath(org, app);
  };
  const { data: user } = useUserQuery();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  const handlePreviewClick = () => {
    window.open(previewPath(org, app), '_blank');
  };

  const handlePopoverOpen = (event: MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handlePopoverClose = () => {
    setAnchorEl(null);
  };

  return (
    <div className={classes.root}>
      <div className={classes.appBar}>
        <div className={classes.leftContent}>
          <a href='/'>
            <AltinnStudioLogo />
          </a>
          <span className={classes.bigSlash}>/</span>
          <span className={classes.appName}>{(org && app) || ''}</span>
        </div>
        <ul className={classes.menu}>
          {menu.map((item) => (
            <li
              key={item.key}
              className={classNames(
                classes.menuItem,
                activeSubHeaderSelection === item.key && classes.active
              )}
            >
              <Link to={item.link.replace(':org', org).replace(':app', app)} data-testid={item.key}>
                {t(item.key)}
              </Link>
            </li>
          ))}
        </ul>
        <div className={classes.rightContent}>
          <div className={classes.rightContentButtons}>
            <Button
              className={classes.previewButton}
              onClick={handlePreviewClick}
              variant={ButtonVariant.Outline}
              data-testid={TopBarMenu.Preview}
            >
              {t('top_menu.preview')}
              <span
                aria-haspopup="true"
                onMouseEnter={handlePopoverOpen}
                onMouseLeave={handlePopoverClose}
              >
                <InformationIcon
                className={classes.infoIcon}
                />
              </span>
              <Popover
                open={!!anchorEl}
                onClose={handlePopoverClose}
                anchorEl={anchorEl}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
                transformOrigin={{ vertical: 'top', horizontal: 'left' }}
                disableRestoreFocus
                sx={{ pointerEvents: 'none', }}
              >
                <span className={classes.infoPreviewIsBetaMessage}>
                  {t('top_menu.preview_is_beta_message')}
                </span>
              </Popover>
            </Button>
            <Button
              onClick={handlePubliserClick}
              variant={ButtonVariant.Outline}
              data-testid={TopBarMenu.Deploy}
            >
              {t('top_menu.deploy')}
            </Button>
          </div>
          <div className={classes.profileMenuWrapper}>
            {user && (
              <>
                <span className={classes.userOrgNames}>
                  {user.login === org
                    ? user.login
                    : t('shared.header_user_for_org', {
                        user: user.login,
                        org: repository.owner.full_name,
                      })}
                </span>

                <ProfileMenu showlogout user={user} />
              </>
            )}
          </div>
        </div>
      </div>
      {showSubMenu && (
        <div className={classes.subToolbar}>
          <div className={classes.leftContent}>
            <BranchingIcon width={24} height={24} />
          </div>
          <div className={classes.rightContent}>
            <VersionControlHeader />

            <ThreeDotsMenu />
          </div>
        </div>
      )}
    </div>
  );
};
