import { createStyles, Grid, Paper, Typography, withStyles, WithStyles } from '@material-ui/core';
import * as React from 'react';
import altinnTheme from '../../../../shared/src/theme/altinnAppTheme';
import { IParty } from '../resources/party';

const styles = createStyles({
  partyPaper: {
    'marginBottom': 12,
    'borderRadius': 0,
    'backgroundColor': altinnTheme.altinnPalette.primary.blueLight,
    'boxShadow': altinnTheme.sharedStyles.boxShadow,
    'width': '100%',
    '&:hover': {
      cursor: 'pointer',
    },
  },
  partyCurrent: {
    'marginBottom': 12,
    'borderRadius': 0,
    'backgroundColor': altinnTheme.altinnPalette.primary.greyLight,
    'boxShadow': altinnTheme.sharedStyles.boxShadow,
    'width': '100%',
    'cursor': 'point',
    '&:hover': {
      cursor: 'pointer',
    },
  },
  partyIcon: {
    padding: 12,
    paddingLeft: 28,
    fontSize: '42px',
  },
  partyName: {
    padding: 12,
    paddingTop: 24,
    fontSize: '1.75rem',
    fontWeight: 700,
  },
  partyInfo: {
    paddingTop: 26,
    fontSize: '1.5rem',
    fontWeight: 300,
  },
});

export interface IAltinnPartyProps extends WithStyles<typeof styles> {
  party: IParty;
  isCurrent: boolean;
  onSelectParty: (party: IParty) => void;
}

function AltinnParty(props: IAltinnPartyProps) {
  const { classes, party, isCurrent, onSelectParty } = props;
  const isOrg: boolean = party.orgNumber != null;

  function onClickParty(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    event.preventDefault();
    onSelectParty(party);
  }

  return (
    <Paper className={isCurrent ? classes.partyCurrent : classes.partyPaper} onClick={onClickParty}>
      <Grid container={true}>
        <i className={classes.partyIcon + (isOrg ? ' fa fa-corp' : ' fa fa-private')}/>
        <Typography className={classes.partyName}>
          {party.name + (party.isDeleted ? ' (slettet)' : '')}
        </Typography>
        <Typography className={classes.partyInfo}>
          {
            isOrg ?
            'org.nr. ' + party.orgNumber :
            'personnr. ' + party.ssn
          }
        </Typography>
      </Grid>
    </Paper>
  );
}

export default withStyles(styles)(AltinnParty);
