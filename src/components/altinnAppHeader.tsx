import React from 'react';

import { AppBar, Grid, Toolbar } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

import { AltinnLogo } from 'src/components/AltinnLogo';
import { LandmarkShortcuts } from 'src/components/LandmarkShortcuts';
import { useLanguage } from 'src/hooks/useLanguage';
import { AltinnAppTheme } from 'src/theme/altinnAppTheme';
import { renderParty } from 'src/utils/party';
import { returnUrlToAllSchemas, returnUrlToMessagebox, returnUrlToProfile } from 'src/utils/urls/urlHelper';
import type { IProfile } from 'src/types/shared';

export interface IHeaderProps {
  profile: IProfile;
  type?: string;
}

const useStyles = makeStyles((theme) => ({
  appBarWrapper: {
    flexGrow: 1,
    '& header': {
      boxShadow: 'none',
    },
  },
  blueDark: {
    color: theme.altinnPalette.primary.blueDark,
  },
  blueDarker: {
    color: theme.altinnPalette.primary.blueDarker,
  },
  default: {
    backgroundColor: 'transparent',
  },
  headerLink: {
    color: theme.altinnPalette.primary.blueDark,
    fontSize: '1.25rem',
    lineHeight: '1.5',
    marginLeft: '2.25rem',
    paddingBottom: '3px',
    [theme.breakpoints.down('sm')]: {
      fontSize: '1.125rem',
    },
    '&:hover': {
      padding: 0,
    },
    '& a': {
      color: theme.altinnPalette.primary.blueDark,
      borderBottom: 0,
    },
    '& a:hover': {
      color: theme.altinnPalette.primary.blueDark,
      borderBottom: `3px solid ${theme.altinnPalette.primary.blueDark}`,
    },
  },
  headerLinkList: {
    flexGrow: 1,
    listStyle: 'none',
    margin: 0,
    padding: 0,
    float: 'left',
    '& li': {
      display: 'inline',
    },
  },
  headerProfile: {
    float: 'right',
  },
  languageDropdown: {
    fontSize: '0.875rem',
  },
  logo: {
    marginRight: '0.75rem',
  },
  partyIcon: {
    fontSize: '1.9375rem !important',
    marginLeft: '5px',
  },
  toolbarContainer: {
    paddingTop: '1.875rem',
    marginBottom: '2.25rem',
    '& .a-personSwitcher': {
      marginTop: '0',
      marginLeft: '1.5rem',
    },
    paddingLeft: '0',
    paddingRight: '0',
  },
}));

const spanStyle = {
  marginBottom: '10px',
};

const gridStyle = { flexGrow: 1 };

const emptyObj = {};

export const AltinnAppHeader = ({ type, profile }: IHeaderProps) => {
  const party = profile?.party;
  const classes = useStyles();
  const { langAsString } = useLanguage();
  const blueClass = type ? classes.blueDark : classes.blueDarker;

  return (
    <div
      className={classes.appBarWrapper}
      data-testid='AltinnAppHeader'
    >
      <LandmarkShortcuts
        shortcuts={[
          {
            id: 'main-content',
            text: langAsString('navigation.to_main_content'),
          },
        ]}
      />
      <AppBar
        position='static'
        className={classes.default}
      >
        <Toolbar className={classes.toolbarContainer}>
          <Grid
            item={true}
            className={classes.logo}
            style={!type ? gridStyle : emptyObj}
          >
            <AltinnLogo
              color={
                type === 'partyChoice'
                  ? AltinnAppTheme.altinnPalette.primary.blueDark
                  : AltinnAppTheme.altinnPalette.primary.blueDarker
              }
            />
          </Grid>
          {type && party && (
            <ul className={classes.headerLinkList}>
              <li className={classes.headerLink}>
                <a href={returnUrlToMessagebox(window.location.origin, party?.partyId) || '#'}>
                  {langAsString('instantiate.inbox')}
                </a>
              </li>
              <li className={classes.headerLink}>
                <a href={returnUrlToAllSchemas(window.location.origin) || '#'}>
                  {langAsString('instantiate.all_forms')}
                </a>
              </li>
              <li className={classes.headerLink}>
                <a href={returnUrlToProfile(window.location.origin, party?.partyId) || '#'}>
                  {langAsString('instantiate.profile')}
                </a>
              </li>
            </ul>
          )}
          {party && (
            <div
              className='a-personSwitcher'
              title={renderParty(profile) || ''}
            >
              <span
                className='a-personSwitcher-name'
                style={spanStyle}
              >
                {!type && (
                  <>
                    <span className={`d-block ${blueClass}`}>{renderParty(profile)}</span>
                    <span className={blueClass}>
                      {party &&
                        party.organization &&
                        `${langAsString('general.for')} ${party.organization.name.toUpperCase()}`}
                    </span>
                  </>
                )}
                <span className='d-block' />
              </span>
              {party && party.organization ? (
                <i
                  className={`fa fa-corp-circle-big ${classes.partyIcon} ${blueClass}`}
                  aria-hidden='true'
                />
              ) : (
                <i
                  className={`fa fa-private-circle-big ${classes.partyIcon} ${blueClass}`}
                  aria-hidden='true'
                />
              )}
            </div>
          )}
        </Toolbar>
      </AppBar>
    </div>
  );
};
