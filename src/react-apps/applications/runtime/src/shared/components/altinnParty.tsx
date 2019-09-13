import { createStyles, Grid, Paper, Typography, withStyles, WithStyles } from '@material-ui/core';
import * as React from 'react';
import { useSelector } from 'react-redux';
import AltinnCollapsableList from '../../../../shared/src/components/AltinnCollapsableList';
import altinnTheme from '../../../../shared/src/theme/altinnAppTheme';
import { IRuntimeState } from '../../types';
import { IParty } from '../resources/party';

const styles = createStyles({
  partyPaper: {
    marginBottom: 12,
    paddingLeft: 12,
    paddingRight: 12,
    borderRadius: 0,
    backgroundColor: altinnTheme.altinnPalette.primary.blueLighter,
    boxShadow: altinnTheme.sharedStyles.boxShadow,
    width: '100%',
  },
  partyWrapper: {
    '&:hover': {
      cursor: 'pointer',
      backgroundColor: altinnTheme.altinnPalette.primary.blueLight,
    },
  },
  partyWrapperDisabled: {
    '&:hover': {
      cursor: 'not-allowed',
    },
  },
  partyPaperDisabled: {
    marginBottom: 12,
    paddingLeft: 24,
    paddingRight: 24,
    borderRadius: 0,
    backgroundColor: altinnTheme.altinnPalette.primary.blueLighter,
    boxShadow: altinnTheme.sharedStyles.boxShadow,
    color: altinnTheme.altinnPalette.primary.grey,
    width: '100%',
  },
  partyIcon: {
    padding: 12,
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
  subUnitWrapper: {
    'color': altinnTheme.altinnPalette.primary.black,
  },
  subUnitListHeaderWrapper: {
    'borderTop': `1px solid ${altinnTheme.altinnPalette.primary.greyMedium}`,
    '&:hover': {
      cursor: 'pointer',
    },
  },
  subUnit: {
    '&:hover': {
      cursor: 'pointer',
      backgroundColor: altinnTheme.altinnPalette.primary.blueLight,
    },
    'borderTop': `1px solid ${altinnTheme.altinnPalette.primary.greyMedium}`,
    'paddingTop': 12,
    'paddingBottom': 12,
    'width': '100%',
  },
  subUnitListHeader: {
    paddingTop: 20,
    paddingLeft: 10,
  },
  subUnitListHeaderIcon: {
    padding: 12,
    paddingTop: 21,
    paddingBottom: 21,
    fontSize: '1.3rem',
    color: altinnTheme.altinnPalette.primary.blue,
  },
  subUnitTextWrapper: {
    paddingTop: 12,
    paddingLeft: 60,
  },
  subUnitText: {
    fontSize: '1.6rem',
  },
  subUnitTextBold: {
    fontSize: '1.6rem',
    fontWeight: 700,
  },
  subUnitIcon: {
    paddingLeft: 28,
    fontSize: '42px',
  },
});

export interface IAltinnPartyProps extends WithStyles<typeof styles> {
  party: IParty;
  onSelectParty: (party: IParty) => void;
}

function AltinnParty(props: IAltinnPartyProps) {
  const [subUnitsExpanded, setSubUnitsExpanded] = React.useState<boolean>(false);
  const { classes, party, onSelectParty } = props;
  const isOrg: boolean = party.orgNumber != null;
  const language = useSelector((state: IRuntimeState) => state.language.language);

  function onClickParty(selectedParty: IParty, event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    event.stopPropagation();
    onSelectParty(selectedParty);
  }

  function onKeyPress(selectedParty: IParty, event: React.KeyboardEvent) {
    event.stopPropagation();
    if (event.key === 'Enter' || event.key === ' ') {
      onSelectParty(selectedParty);
    }
  }

  function expandSubUnits() {
    setSubUnitsExpanded(!subUnitsExpanded);
  }

  function renderSubunits() {
    if (!party.childParties || party.childParties.length === 0) {
      return null;
    }

    return (
      <>
        <AltinnCollapsableList
          transition={subUnitsExpanded}
          onClickExpand={expandSubUnits}
          expandIconClass={'ai ai-expand-circle'}
          listHeader={
            <Typography className={classes.subUnitListHeader}>
              {party.childParties.length} underenheter
            </Typography>
          }
          rotateExpandIcon={true}
          listStylingClasses={{
            listWrapper: classes.subUnitListWrapper,
            listHeader: classes.subUnitListHeaderWrapper,
            listHeaderIcon: classes.subUnitListHeaderIcon,
          }}
        >
          {party.childParties.map((childParty: IParty, index: number) => (
            <Grid item={true} className={classes.subUnitWrapper}>
              <Grid
                key={index}
                className={classes.subUnit}
                container={true}
                direction={'column'}
                onClick={onClickParty.bind(null, childParty)}
                onKeyPress={onKeyPress.bind(null, childParty)}
                tabIndex={subUnitsExpanded ? 0 : undefined}
              >
                <Grid container={true} direction={'row'} className={classes.subUnitTextWrapper}>
                  <Typography className={`${classes.subUnitTextBold}`}>
                    {childParty.name}
                  </Typography>
                  <Typography className={classes.subUnitText}>
                    {/* tslint:disable-next-line*/}
                    &nbsp;{!language.party_selection ? 'party_selection.unit_org_number' : language.party_selection.unit_org_number} {childParty.orgNumber}
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          ))}
        </AltinnCollapsableList>
      </>
    );
  }

  return (
    <Paper
      className={party.onlyHiearhyElementWithNoAccess ? classes.partyPaperDisabled : classes.partyPaper}
      onClick={!party.onlyHiearhyElementWithNoAccess ? onClickParty.bind(null, party) : undefined}
      tabIndex={!party.onlyHiearhyElementWithNoAccess ? 0 : undefined}
      onKeyPress={!party.onlyHiearhyElementWithNoAccess ? onKeyPress.bind(null, party) : undefined}
    >
      <Grid
        container={true}
        direction={'row'}
        className={party.onlyHiearhyElementWithNoAccess ? classes.partyWrapperDisabled : classes.partyWrapper}
      >
        <i className={classes.partyIcon + (isOrg ? ' fa fa-corp' : ' fa fa-private')} />
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
      {renderSubunits()}
    </Paper>
  );
}

export default withStyles(styles)(AltinnParty);
