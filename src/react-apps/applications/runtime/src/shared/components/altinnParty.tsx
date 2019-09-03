import { createStyles, Grid, Paper, Typography, withStyles, WithStyles } from '@material-ui/core';
import * as React from 'react';
import { useSelector } from 'react-redux';
import altinnTheme from '../../../../shared/src/theme/altinnAppTheme';
import { IRuntimeState } from '../../types';
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
  partyWrapper: {

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
  onSelectParty: (party: IParty) => void;
}

function AltinnParty(props: IAltinnPartyProps) {
  const { classes, party, onSelectParty } = props;
  const isOrg: boolean = party.orgNumber != null;
  const language = useSelector((state: IRuntimeState) => state.language.language);

  function onClickParty(event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    event.preventDefault();
    onSelectParty(party);
  }

  function onKeyPress(event: React.KeyboardEvent) {
    if (event.key === 'Enter' || event.key === ' ') {
      onSelectParty(party);
    }
  }

  return (
    <Paper className={classes.partyPaper} onClick={onClickParty} tabIndex={0} onKeyPress={onKeyPress} >
      <Grid container={true}>
        <i className={classes.partyIcon + (isOrg ? ' fa fa-corp' : ' fa fa-private')}/>
        <Typography className={classes.partyName}>
          {party.name + (party.isDeleted ? ` (
            ${!language.party_selection ?
              'party_selection.unit_deleted' :
              language.party_selection.unit_deleted
            }) ` : '')}
        </Typography>
        <Typography className={classes.partyInfo}>
          {
            isOrg ?
            `${!language.party_selection ?
              'party_selection.unit_org_number' :
              language.party_selection.unit_org_number
            } ` + party.orgNumber :
            `${!language.party_selection ?
              'party_selection.unit_personal_number' :
              language.party_selection.unit_personal_number
            } ` + party.ssn
          }
        </Typography>
      </Grid>
    </Paper>
  );
}

export default withStyles(styles)(AltinnParty);
