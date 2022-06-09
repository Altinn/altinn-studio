import { AppBar, Grid, Toolbar } from '@material-ui/core';
import {
  createTheme,
  createStyles,
  withStyles,
} from '@material-ui/core/styles';
import * as React from 'react';
import { AltinnLogo } from 'altinn-shared/components';
import { AltinnAppTheme } from 'altinn-shared/theme';
import { getLanguageFromKey, returnUrlToMessagebox } from 'altinn-shared/utils';
import { ILanguage, IProfile } from 'altinn-shared/types';
import {
  returnUrlToAllSchemas,
  returnUrlToProfile,
} from 'altinn-shared/utils/urlHelper';
import { renderParty } from '../resources/utils/party';
import { LandmarkShortcuts } from 'altinn-shared/components/LandmarkShortcuts';

export interface IHeaderProps {
  classes: any;
  language: ILanguage;
  profile: IProfile;
  type?: string;
}

const theme = createTheme(AltinnAppTheme);

const styles = createStyles({
  appBarWrapper: {
    flexGrow: 1,
    '& header': {
      boxShadow: 'none',
    },
  },
  blueDark: {
    color: AltinnAppTheme.altinnPalette.primary.blueDark,
  },
  blueDarker: {
    color: AltinnAppTheme.altinnPalette.primary.blueDarker,
  },
  default: {
    backgroundColor: 'transparent',
  },
  headerLink: {
    color: AltinnAppTheme.altinnPalette.primary.blueDark,
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
      color: AltinnAppTheme.altinnPalette.primary.blueDark,
      borderBottom: 0,
    },
    '& a:hover': {
      color: AltinnAppTheme.altinnPalette.primary.blueDark,
      borderBottom: `3px solid ${AltinnAppTheme.altinnPalette.primary.blueDark}`,
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
});

const spanStyle = {
  marginBottom: '10px',
};

const gridStyle = { flexGrow: 1 };

const emptyObj = {};

const AltinnAppHeader = ({
  classes,
  type,
  profile,
  language,
}: IHeaderProps) => {
  const party = profile ? profile.party : null;
  return (
    <div className={classes.appBarWrapper}>
      <LandmarkShortcuts shortcuts={[{ id: 'main-content', text: getLanguageFromKey('navigation.to_main_content', language) }]} />
      <AppBar position='static' className={classes.default}>
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
                <a
                  href={returnUrlToMessagebox(
                    window.location.origin,
                    party?.partyId,
                  )}
                >
                  {getLanguageFromKey('instantiate.inbox', language)}
                </a>
              </li>
              <li className={classes.headerLink}>
                <a href={returnUrlToAllSchemas(window.location.origin)}>
                  {getLanguageFromKey('instantiate.all_forms', language)}
                </a>
              </li>
              <li className={classes.headerLink}>
                <a
                  href={returnUrlToProfile(
                    window.location.origin,
                    party?.partyId,
                  )}
                >
                  {getLanguageFromKey('instantiate.profile', language)}
                </a>
              </li>
            </ul>
          )}
          {party &&
            <div className='a-personSwitcher' title={renderParty(profile)}>
              <span className='a-personSwitcher-name' style={spanStyle}>
                {!type && (
                  <>
                    <span
                      className={`d-block ${type ? classes.blueDark : classes.blueDarker
                        }`}
                    >
                      {renderParty(profile)}
                    </span>
                    <span
                      className={type ? classes.blueDark : classes.blueDarker}
                    >
                      {party &&
                        party.organisation &&
                        `${getLanguageFromKey(
                          'general.for',
                          language,
                        )} ${party.organisation.name.toUpperCase()}`}
                    </span>
                  </>
                )}
                <span className='d-block' />
              </span>
              {party && party.organisation ? (
                <i
                  className={`fa fa-corp-circle-big ${classes.partyIcon} ${type ? classes.blueDark : classes.blueDarker
                    }`}
                  aria-hidden='true'
                />
              ) : (
                <i
                  className={`fa fa-private-circle-big ${classes.partyIcon} ${type ? classes.blueDark : classes.blueDarker
                    }`}
                  aria-hidden='true'
                />
              )}
            </div>
          }
        </Toolbar>
      </AppBar>
    </div>
  );
};

export default withStyles(styles)(AltinnAppHeader);
