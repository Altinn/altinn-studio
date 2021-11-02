
import { AppBar, createStyles, Grid, Typography, withStyles, WithStyles } from '@material-ui/core';
import * as React from 'react';
import { IParty } from '../../types';
import { renderPartyName } from '../../utils/party';
import AltinnIcon from '../AltinnIcon';
import AltinnLogo from '../AltinnLogo';

export interface IAltinnAppHeaderProps extends WithStyles<typeof styles> {
  /** The party of the instance owner */
  party: IParty;
  /** The party of the currently logged in user */
  userParty: IParty;
  /** The color used for the logos in the header */
  logoColor: string;
  /** The header background color */
  headerBackgroundColor: string;
}

const styles = createStyles({
  altinnAppHeader: {
    boxShadow: 'none',
    WebkitBoxShadow: 'none',
    MozBoxShadow: 'none',
  },
  mainContent: {
    width: '100%',
    marginLeft: 'auto',
    marginRight: 'auto',
    padding: 24,
    '@media (min-width:576px)': {
      maxWidth: 540,
    },
    '@media (min-width:760px)': {
      maxWidth: 720,
    },
    '@media (min-width:992px)': {
      maxWidth: 960,
    },
    '@media (min-width:1200px)': {
      maxWidth: 1056,
      paddingRight: 0,
      paddingLeft: 0,
    },
  },
  appHeaderText: {
    fontSize: 14,
  },
});

export function AltinnAppHeader(props: IAltinnAppHeaderProps) {
  const {classes, logoColor, headerBackgroundColor: headerColor, party, userParty} = props;
  return (
    <AppBar
      position={'relative'}
      classes={{root: classes.altinnAppHeader}}
      style={{backgroundColor: headerColor, color: logoColor}}
    >
      <Grid
        container={true}
        className={classes.mainContent}
        alignItems={'center'}
      >
        <Grid
          container={true}
          item={true}
          xs={6}
        >
          <Grid item={true}>
            <AltinnLogo color={logoColor}/>
          </Grid>
        </Grid>
        <Grid
          container={true}
          justify={'flex-end'}
          alignItems={'center'}
          item={true}
          xs={6}
        >
          <Grid item={true}>
            {(party && userParty && party.partyId === userParty.partyId) &&
              <Typography className={classes.appHeaderText}>
                {renderPartyName(userParty)}
              </Typography>
            }
            {(party && userParty && party.partyId !== userParty.partyId) &&
              <Grid container={true} direction={'column'} alignItems={'flex-end'}>
                <Grid item={true}>
                  <Typography className={classes.appHeaderText}>
                    {renderPartyName(userParty)}
                  </Typography>
                </Grid>
                <Grid item={true}>
                  <Typography className={classes.appHeaderText}>
                    for {renderPartyName(party)}
                  </Typography>
                </Grid>
              </Grid>
            }
          </Grid>
          <Grid item={true}>
            {party && party.ssn &&
              <AltinnIcon
                iconClass={'fa fa-private-circle-big'}
                iconColor={logoColor}
                iconSize={31}
                margin={'0px 0px 0px 5px'}
              />
            }
            {party && party.orgNumber &&
              <AltinnIcon
                iconClass={'fa fa-corp-circle-big'}
                iconColor={logoColor}
                iconSize={31}
                margin={'0px 0px 0px 5px'}
              />
            }
          </Grid>
        </Grid>
      </Grid>
    </AppBar>
  );
}

export default withStyles(styles)(AltinnAppHeader);
