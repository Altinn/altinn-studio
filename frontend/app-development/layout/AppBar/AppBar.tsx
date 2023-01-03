import React, { useState } from 'react';
import { AppBar as MuiAppBar, Grid, Toolbar } from '@mui/material';
import classNames from 'classnames';
import { Link, useParams } from 'react-router-dom';
import { altinnImgLogoHeaderUrl } from 'app-shared/cdn-paths';
import type { IMenuItem } from 'app-shared/navigation/drawer/drawerMenuSettings';
import TabletDrawerMenu from 'app-shared/navigation/drawer/TabletDrawerMenu';
import { getTopBarMenu } from './appBarConfig';
import { ProfileMenu } from 'app-shared/navigation/main-header/profileMenu';
import { getLanguageFromKey } from 'app-shared/utils/language';
import { VersionControlHeader } from 'app-shared/version-control/VersionControlHeader';
import { useAppSelector } from '../../common/hooks';
import { getRepositoryType } from 'app-shared/utils/repository';
import classes from './AppBar.module.css';
import { useMediaQuery } from '../../common/hooks';

export interface IAppBarProps {
  activeSubHeaderSelection?: string;
  activeLeftMenuSelection?: string;
  logoutButton?: boolean;
  user?: string;
  showSubMenu?: boolean;
  mainMenuItems?: IMenuItem[];
  subMenuItems?: { [key: string]: IMenuItem[] };
}

export const AppBar = ({
  activeLeftMenuSelection,
  activeSubHeaderSelection,
  logoutButton,
  user,
  mainMenuItems,
  subMenuItems,
  showSubMenu,
}: IAppBarProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const hiddenMdUp = useMediaQuery('(min-width: 1025px)');
  const hiddenSmDown = useMediaQuery('(max-width: 600px)');

  const language = useAppSelector((state) => state.languageState.language);
  const t = (key: string) => getLanguageFromKey(key, language);

  const handleDrawerMenuClick = () => {
    setIsMenuOpen((prev) => !prev);
  };
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
              {hiddenMdUp ? null : (
                <Grid item>
                  <TabletDrawerMenu
                    handleTabletDrawerMenu={handleDrawerMenuClick}
                    tabletDrawerOpen={isMenuOpen}
                    logoutButton={!logoutButton ? false : logoutButton}
                    activeSubHeaderSelection={activeSubHeaderSelection}
                    activeLeftMenuSelection={activeLeftMenuSelection}
                    mainMenuItems={mainMenuItems}
                    leftDrawerMenuItems={subMenuItems}
                  />
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
                    <VersionControlHeader language={language} />
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
