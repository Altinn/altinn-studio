import React from 'react';
import { AppBar as MuiAppBar, Grid, Toolbar } from '@mui/material';
import classNames from 'classnames';
import { Link, useParams } from 'react-router-dom';
import { altinnImgLogoHeaderUrl } from 'app-shared/cdn-paths';
import { getTopBarMenu } from './appBarConfig';
import { ProfileMenu } from 'app-shared/navigation/main-header/profileMenu';
import { VersionControlHeader } from 'app-shared/version-control/VersionControlHeader';
import { getRepositoryType } from 'app-shared/utils/repository';
import classes from './AppBar.module.css';
import { useMediaQuery } from '../../common/hooks';
import { useTranslation } from 'react-i18next';

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
          backgroundColor: '#EFEFEF',
          boxShadow: 'none',
          color: 'black',
        }}
      >
        <Toolbar className={classes.muiToolbar}>
          <Grid container direction='row' alignItems='center' justifyContent='space-between'>
            <Grid item xs container>
              <Grid item>
                <a href='/' className={classes.aImgStyling}>
                  <img src={altinnImgLogoHeaderUrl()} alt='Altinn logo' />
                </a>
              </Grid>
              {hiddenMdUp ? null : (
                <Grid item className={classes.breadCrumb}>
                  {activeSubHeaderSelection && `/ ${t(activeSubHeaderSelection)}`} /
                  <span className={classes.breadCrumbSubApp}> {activeLeftMenuSelection} </span>
                </Grid>
              )}
            </Grid>
            {hiddenSmDown ? null : (
              <Grid xs item className={classes.paper}>
                {org && app ? `${org} / ${app}` : ''}
              </Grid>
            )}
            <Grid item xs container direction='row' alignItems='center' justifyContent='flex-end'>
              {user || ''}
              {hiddenSmDown ? null : (
                <Grid item>
                  <ProfileMenu showlogout />
                </Grid>
              )}
            </Grid>
          </Grid>
        </Toolbar>
        {hiddenSmDown
          ? null
          : showSubMenu && (
              <Toolbar className={classes.muiToolbar}>
                <Grid container direction='row' justifyContent='center' alignItems='center'>
                  <Grid xs item>
                    <VersionControlHeader />
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
                  <Grid xs item /> {/** Used to keep menu centered */}
                </Grid>
              </Toolbar>
            )}
      </MuiAppBar>
    </div>
  );
};
