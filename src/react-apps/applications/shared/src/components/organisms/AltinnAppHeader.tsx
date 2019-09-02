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
    marginTop: 33,
    boxShadow: 'none',
    WebkitBoxShadow: 'none',
    MozBoxShadow: 'none',
  },
  mainContent: {
    marginLeft: '10%',
    marginRight: '10%',
    width: 'auto',
  },
  appHeaderText: {
    fontSize: 14,
  },
});

export function AltinnAppHeader(props: IAltinnAppHeaderProps) {
  const {classes, logoColor, headerBackgroundColor: headerColor, party, userParty} = props;
  return (
    <AppBar position={'relative'} classes={{root: classes.altinnAppHeader}} style={{backgroundColor: headerColor}}>
      <Grid
        container={true}
        className={classes.mainContent}
        alignItems={'center'}
      >
        <Grid
          container={true}
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
          xs={6}
        >
          <Grid item={true}>
            {(party.partyId === userParty.partyId) &&
              <Typography className={classes.appHeaderText}>
                {renderPartyName(userParty)}
              </Typography>
            }
            {(party.partyId !== userParty.partyId) &&
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
            {party.ssn &&
              <AltinnIcon
                iconClass={'fa fa-private-circle-big'}
                iconColor={logoColor}
                iconSize={46}
                margin={'0px 0px 0px 5px'}
              />
            }
            {party.orgNumber &&
              <AltinnIcon
                iconClass={'fa fa-corp-circle-big'}
                iconColor={logoColor}
                iconSize={46}
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
