import { AppBar, Grid, Toolbar } from '@material-ui/core';
import { createMuiTheme, createStyles, withStyles } from '@material-ui/core/styles';
import * as React from 'react';
import AltinnLogo from '../../../../shared/src/components/AltinnLogo';
import altinnTheme from '../../../../shared/src/theme/altinnStudioTheme';
import { getLanguageFromKey } from '../../../../shared/src/utils/language';
import { IProfile } from '../resources/profile';
import { renderParty } from '../resources/utils/party';

export interface IHeaderprops {
  classes: any;
  language: any;
  profile: IProfile;
  type?: string;
}

const theme = createMuiTheme(altinnTheme);

const styles = createStyles({
  appBarWrapper: {
    'flexGrow': 1,
    '& header': {
      boxShadow: 'none',
    },
  },
  blueDark: {
    color: altinnTheme.altinnPalette.primary.blueDark,
  },
  blueDarker: {
    color: altinnTheme.altinnPalette.primary.blueDarker,
  },
  default: {
    backgroundColor: 'transparent',
  },
  headerLink: {
    'color': altinnTheme.altinnPalette.primary.blueDark,
    'fontSize': '2.4rem',
    'lineHeight': '1.5',
    'marginLeft': '3.6rem',
    'paddingBottom': '3px',
    [theme.breakpoints.down('sm')]: {
      fontSize: '1.8rem',
    },
    '&:hover': {
      padding: 0,
    },
    '& a': {
      color: altinnTheme.altinnPalette.primary.blueDark,
      borderBottom: 0,
    },
    '& a:hover': {
      color: altinnTheme.altinnPalette.primary.blueDark,
      borderBottom: '3px solid ' + altinnTheme.altinnPalette.primary.blueDark,
    },
  },
  headerLinkList: {
    'flexGrow': 1,
    'listStyle': 'none',
    'float': 'left',
    '& li': {
      display: 'inline',
    },
  },
  headerProfile: {
    float: 'right',
  },
  partyChoice: {
    backgroundColor: '#F5F5F5',
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
    'paddingTop': '3rem !important',
    'marginBottom': '3.6rem',
    '& .a-personSwitcher': {
      marginTop: '0 !important',
      marginLeft: '2.4rem',
    },
  },
});

const Header = (props: IHeaderprops) => {
  const { classes, type } = props;
  const party = props.profile ? props.profile.party : null;
  return (
    <div className={classes.appBarWrapper}>
    <AppBar
      position='static'
      className={type === 'partyChoice' ? classes.partyChoice : classes.default}
    >
      <Toolbar className={'container ' + classes.toolbarContainer}>
        <Grid
          item={true}
          className={classes.logo}
          style={!type ? {flexGrow: 1} : {}}
        >
          <AltinnLogo
            color={
              type === 'partyChoice' ? altinnTheme.altinnPalette.primary.blueDark :
              altinnTheme.altinnPalette.primary.blueDarker}
          />
        </Grid>
            {
              type &&
              <ul
                className={classes.headerLinkList}
              >
                <li
                  className={classes.headerLink}
                >
                  <a href='https://altinn.no/ui/messagebox'>
                    {getLanguageFromKey('instantiate.inbox', props.language)}
                  </a>
                </li>
                <li
                  className={classes.headerLink}
                >
                  <a href='https://altinn.no/nn/skjemaoversikt/'>
                    {getLanguageFromKey('instantiate.all_forms', props.language)}
                  </a>
                </li>
                <li
                  className={classes.headerLink}
                >
                  <a href='https://altinn.no/ui/profile'>
                    {getLanguageFromKey('instantiate.profile', props.language)}
                  </a>
                </li>
              </ul>
            }
        <div
          className={'a-personSwitcher'}
          title={renderParty(props.profile)}
        >
          <span className='a-personSwitcher-name' style={{ marginBottom: '10px' }}>
            { !type &&
            <>
              <span className={'d-block ' + (type ? classes.blueDark : classes.blueDarker)}>
                {renderParty(props.profile)}
              </span>
              <span className={type ? classes.blueDark : classes.blueDarker}>
                {
                  party && party.organization &&
                  getLanguageFromKey('general.for', props.language) + ' ' +
                  party.organization.toUpperCase()
                }
              </span>
            </>
            }
            <span className='d-block' />
          </span>
          {party && party.organization ?
            <i
              className={'fa fa-corp-circle-big ' + classes.partyIcon + ' ' +
                (type ? classes.blueDark : classes.blueDarker)}
              aria-hidden='true'
            />
            :
            <i
              className={'fa fa-private-circle-big ' + classes.partyIcon + ' ' +
                (type ? classes.blueDark : classes.blueDarker)}
              aria-hidden='true'
            />
          }
        </div>
      </Toolbar>
    </AppBar>
    </div>
  );
};

export default withStyles(styles)(Header);
