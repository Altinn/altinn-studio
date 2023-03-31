import React from 'react';
import { AppBar as MuiAppBar, Grid, Toolbar } from '@mui/material';
import classNames from 'classnames';
import { Link, useParams } from 'react-router-dom';
// import { altinnImgLogoHeaderUrl } from 'app-shared/cdn-paths';
import { getTopBarMenu } from './appBarConfig';
import { ProfileMenu } from 'app-shared/navigation/main-header/profileMenu';
import { VersionControlHeader } from '../version-control/VersionControlHeader';
import { getRepositoryType } from 'app-shared/utils/repository';
import classes from './AppBar.module.css';
import { useMediaQuery } from '../../common/hooks';
import { useTranslation } from 'react-i18next';

import AltinnStudioLogo from 'app-shared/navigation/main-header/AltinnStudioLogo';
import { ThreeDotsMenu } from 'app-shared/navigation/main-header/ThreeDotsMenu';

import { AiOutlineBranches } from 'react-icons/ai';

export interface IAppBarProps {
  activeSubHeaderSelection?: string;
  activeLeftMenuSelection?: string;
  user?: string;
  showSubMenu?: boolean;
}

export const AppBar = ({
  activeLeftMenuSelection,
  activeSubHeaderSelection,
  user,
  showSubMenu,
}: IAppBarProps) => {
  const hiddenMdUp = useMediaQuery('(min-width: 1025px)');
  const hiddenSmDown = useMediaQuery('(max-width: 600px)');
  const { t } = useTranslation();
  const { org, app } = useParams();
  const repositoryType = getRepositoryType(org, app);
  const menu = getTopBarMenu(repositoryType);
  return (
    <div className={classes.root}>
      <MuiAppBar
        position='fixed'
        className={classNames([
          !app ? classes.appBarDashboard : classes.appBarEditor,
          classes.appBar,
        ])}
        elevation={5}
        sx={{
          backgroundColor: '#022F51',
          boxShadow: 'none',
          color: 'white',
        }}
      >
        <Toolbar className={classes.muiToolbar}>
          <Grid container direction='row' justifyContent='space-between'>
            <Grid item xs container>
              <Grid item className={classes.appOrg}>
                <a href='/' className={classes.aImgStyling}>
                  <AltinnStudioLogo />
                </a>
                <div className={classes.appName}>{org && app ? ` / ${app}` : ''}</div>
              </Grid>

              {hiddenMdUp ? null : (
                <Grid item className={classes.breadCrumb}>
                  {activeSubHeaderSelection && `/ ${t(activeSubHeaderSelection)}`} /
                  <span className={classes.breadCrumbSubApp}> {activeLeftMenuSelection} </span>
                </Grid>
              )}
            </Grid>

            {menu.map((item) => (
              <Grid item key={item.key} className={classes.subHeader}>
                <Link
                  to={item.link.replace(':org', org).replace(':app', app)}
                  className={classNames(classes.subHeaderLink, {
                    [classes.subHeaderLinkActive]: activeSubHeaderSelection === item.key,
                  })}
                  data-testid={item.key}
                >
                  {t(item.key)}
                </Link>
              </Grid>
            ))}
            <Grid item xs container direction='row' alignItems='center' justifyContent='flex-end'>
              {hiddenSmDown ? null : (
                <div className={classes.paper}>
                  {/**{org && app ? `${org} / ${app}` : ''} */}
                  {org && app ? `${org}` : ''} {t('shared.header_for')} {org && app ? `${org}` : ''}
                </div>
              )}
              {user || ''}
              {hiddenSmDown ? null : (
                <Grid item>
                  <ProfileMenu showlogout />
                </Grid>
              )}
            </Grid>
          </Grid>
        </Toolbar>
        <div className={classes.subToolBar}>
          {hiddenSmDown
            ? null
            : showSubMenu && (
                <Toolbar className={classes.muiToolbar}>
                  <div className={classes.branchIcon}>
                    <AiOutlineBranches />
                  </div>
                  <Grid container direction='row'>
                    <Grid item xs container className={classes.versionControlAndSettingStyle}>
                      <VersionControlHeader />
                    </Grid>
                  </Grid>

                  <Grid>
                    <ThreeDotsMenu />
                  </Grid>
                </Toolbar>
              )}
          <div></div>
        </div>
      </MuiAppBar>
    </div>
  );
};
