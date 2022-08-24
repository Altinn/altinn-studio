import MuiAppBar from '@material-ui/core/AppBar';
import Grid from '@material-ui/core/Grid';
import useMediaQuery from '@material-ui/core/useMediaQuery';
import { createStyles, makeStyles } from '@material-ui/core/styles';
import type { Theme } from '@material-ui/core/styles';
import Toolbar from '@material-ui/core/Toolbar';
import classNames from 'classnames';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { altinnImgLogoHeaderUrl } from 'app-shared/utils/urlHelper';
import type { IMenuItem } from 'app-shared/navigation/drawer/drawerMenuSettings';
import TabletDrawerMenu from 'app-shared/navigation/drawer/TabletDrawerMenu';
import { menu } from './appBarConfig';
import ProfileMenu from 'app-shared/navigation/main-header/profileMenu';

export interface IAppBarProps {
  activeSubHeaderSelection?: string;
  activeLeftMenuSelection?: string;
  logoutButton?: boolean;
  org?: string;
  app?: string;
  user?: string;
  showSubMenu?: boolean;
  mainMenuItems?: IMenuItem[];
  subMenuItems?: { [key: string]: IMenuItem[] };
}
export interface IAppBarComponentState {
  anchorEl?: any;
  tabletDrawerOpen: boolean;
}

const styles = (theme: Theme) =>
  createStyles({
    root: {
      flexGrow: 1,
      zIndex: 1,
      color: theme.altinnPalette.primary.black,
    },
    appBar: {
      borderBottom: '1px solid',
      borderBottomColor: '#C9C9C9',
      color: theme.altinnPalette.primary.black,
      position: 'fixed',
    },
    appBarDashboard: {
      backgroundColor: theme.altinnPalette.primary.white,
    },
    appBarEditor: {
      backgroundColor: theme.altinnPalette.primary.greyLight,
    },
    breadCrumb: {
      paddingLeft: 30,
      fontSize: 20,
    },
    breadCrumbSubApp: {
      color: '#0062BA',
    },
    paper: {
      textAlign: 'center',
    },
    subHeader: {
      paddingLeft: 12,
      paddingRight: 12,
      paddingBottom: 0,
      fontSize: 20,
    },
    subHeaderLink: {
      borderBottom: '1px solid',
      borderBottomColor: 'transparent', // To mitigate the 1 pixel adjustment
      '&:hover': {
        borderBottom: '1px solid',
        borderBottomColor: theme.altinnPalette.primary.blueDark,
        color: theme.altinnPalette.primary.blueDark,
      },
    },
    subHeaderLinkActive: {
      borderBottom: '1px solid',
      borderBottomColor: theme.altinnPalette.primary.blueDark,
      color: theme.altinnPalette.primary.blueDark,
      fontWeight: 500,
      '&:hover': {
        borderBottom: '1px solid',
        borderBottomColor: theme.altinnPalette.primary.blueDark,
        color: theme.altinnPalette.primary.blueDark,
      },
    },
    topRightService: {
      paddingRight: 22,
    },
    aImgStyling: {
      borderBottom: 'none',
      '&:hover': {
        borderBottom: 'none',
      },
      '&:active': {
        borderBottom: 'none',
      },
    },
  });

const useStyles = makeStyles(styles);

export const AppBar = ({
  activeLeftMenuSelection,
  activeSubHeaderSelection,
  logoutButton,
  org,
  app,
  user,
  mainMenuItems,
  subMenuItems,
  showSubMenu,
}: IAppBarProps) => {
  const classes = useStyles();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const hiddenMdUp = useMediaQuery((theme: Theme) =>
    theme.breakpoints.up('md'),
  );
  const hiddenSmDown = useMediaQuery((theme: Theme) =>
    theme.breakpoints.down('sm'),
  );

  const handleDrawerMenuClick = () => {
    setIsMenuOpen((prev) => !prev);
  };

  return (
    <div className={classes.root}>
      <MuiAppBar
        position='static'
        className={classNames([
          classes.appBar,
          !app ? classes.appBarDashboard : classes.appBarEditor,
        ])}
        elevation={0}
      >
        <Toolbar>
          <Grid
            container
            direction='row'
            alignItems='center'
            justifyContent='space-between'
          >
            <Grid item xs container>
              <Grid item>
                <a href='/' className={classes.aImgStyling}>
                  <img src={altinnImgLogoHeaderUrl} alt='Altinn logo' />
                </a>
              </Grid>
              {hiddenMdUp ? null : (
                <Grid item className={classes.breadCrumb}>
                  {activeSubHeaderSelection && `/ ${activeSubHeaderSelection}`}{' '}
                  /
                  <span className={classes.breadCrumbSubApp}>
                    {' '}
                    {activeLeftMenuSelection}{' '}
                  </span>
                </Grid>
              )}
            </Grid>
            {hiddenSmDown ? null : (
              <Grid xs item className={classes.paper}>
                {org && app ? `${org} / ${app}` : ''}
              </Grid>
            )}
            <Grid
              item
              xs
              container
              direction='row'
              alignItems='center'
              justifyContent='flex-end'
            >
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
              <Toolbar>
                <Grid
                  container
                  direction='row'
                  justifyContent='center'
                  alignItems='center'
                >
                  {menu.map((item) => (
                    <Grid
                      item
                      key={item.key}
                      className={classNames(classes.subHeader)}
                    >
                      <Link
                        to={item.link}
                        className={classNames(classes.subHeaderLink, {
                          [classes.subHeaderLinkActive]:
                            activeSubHeaderSelection ===
                            item.activeSubHeaderSelection,
                        })}
                      >
                        {item.key}
                      </Link>
                    </Grid>
                  ))}
                </Grid>
              </Toolbar>
            )}
      </MuiAppBar>
    </div>
  );
};
