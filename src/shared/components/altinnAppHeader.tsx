import React from 'react';

import { AppBar, Grid, Toolbar } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

import { LandmarkShortcuts } from 'src/components/LandmarkShortcuts';
import { AltinnLogo } from 'src/components/shared';
import { renderParty } from 'src/shared/resources/utils/party';
import { AltinnAppTheme } from 'src/theme';
import { getLanguageFromKey, returnUrlToMessagebox } from 'src/utils/sharedUtils';
import { returnUrlToAllSchemas, returnUrlToProfile } from 'src/utils/urls/urlHelper';
import type { ILanguage, IProfile } from 'src/types/shared';

export interface IHeaderProps {
  language: ILanguage;
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
    fontSize: '2.4rem',
    lineHeight: '1.5',
    marginLeft: '3.6rem',
    paddingBottom: '3px',
    [theme.breakpoints.down('sm')]: {
      fontSize: '1.8rem',
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
    float: 'left',
    '& li': {
      display: 'inline',
    },
  },
  headerProfile: {
    float: 'right',
  },
  languageDropdown: {
    fontSize: '1.4rem',
  },
  logo: {
    marginRight: '1.2rem',
  },
  menuButton: {
    [theme.breakpoints.up('xs')]: {
      display: 'none !important',
    },
  },
  partyIcon: {
    fontSize: '3.1rem !important',
    marginLeft: '5px',
  },
  toolbarContainer: {
    paddingTop: '3rem !important',
    marginBottom: '3.6rem',
    '& .a-personSwitcher': {
      marginTop: '0 !important',
      marginLeft: '2.4rem',
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

const AltinnAppHeader = ({ type, profile, language }: IHeaderProps) => {
  const party = profile?.party;
  const classes = useStyles();

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
            text: getLanguageFromKey('navigation.to_main_content', language),
          },
        ]}
      />
      <AppBar
        position='static'
        className={classes.default}
      >
        <Toolbar className={`container ${classes.toolbarContainer}`}>
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
                  {getLanguageFromKey('instantiate.inbox', language)}
                </a>
              </li>
              <li className={classes.headerLink}>
                <a href={returnUrlToAllSchemas(window.location.origin) || '#'}>
                  {getLanguageFromKey('instantiate.all_forms', language)}
                </a>
              </li>
              <li className={classes.headerLink}>
                <a href={returnUrlToProfile(window.location.origin, party?.partyId) || '#'}>
                  {getLanguageFromKey('instantiate.profile', language)}
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
                        party.organisation &&
                        `${getLanguageFromKey('general.for', language)} ${party.organisation.name.toUpperCase()}`}
                    </span>
                  </>
                )}
                <span className='d-block' />
              </span>
              {party && party.organisation ? (
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

export default AltinnAppHeader;
