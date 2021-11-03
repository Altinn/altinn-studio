import { createStyles, Grid, Paper, Typography, withStyles, WithStyles } from '@material-ui/core';
import * as React from 'react';
import { useSelector } from 'react-redux';
import {AltinnCollapsableList} from 'altinn-shared/components';
import {AltinnAppTheme} from 'altinn-shared/theme';
import { IParty } from 'altinn-shared/types';
import { IRuntimeState } from '../types';

const styles = createStyles({
  partyPaper: {
    marginBottom: '1.2rem',
    borderRadius: 0,
    backgroundColor: AltinnAppTheme.altinnPalette.primary.blueLighter,
    boxShadow: AltinnAppTheme.sharedStyles.boxShadow,
    width: '100%',
  },
  partyWrapper: {
    'paddingLeft': '2.4rem',
    'paddingRight': '2.4rem',
    '&:hover': {
      cursor: 'pointer',
    },
  },
  partyWrapperDisabled: {
    'paddingLeft': '2.4rem',
    'paddingRight': '2.4rem',
    '&:hover': {
      cursor: 'not-allowed',
    },
  },
  partyPaperDisabled: {
    marginBottom: '1.2rem',
    borderRadius: 0,
    backgroundColor: AltinnAppTheme.altinnPalette.primary.blueLighter,
    boxShadow: AltinnAppTheme.sharedStyles.boxShadow,
    color: AltinnAppTheme.altinnPalette.primary.grey,
    width: '100%',
  },
  partyIcon: {
    padding: '1.2rem',
    fontSize: '42px',
  },
  partyName: {
    padding: '1.2rem',
    paddingTop: '2.4rem',
    fontSize: '1.75rem',
    fontWeight: 700,
  },
  partyInfo: {
    paddingTop: '2.6rem',
    fontSize: '1.5rem',
    fontWeight: 300,
  },
  subUnitWrapper: {
    color: AltinnAppTheme.altinnPalette.primary.black,
  },
  subUnitListHeaderWrapper: {
    '&:hover': {
      cursor: 'pointer',
    },
    'paddingTop': '1.2rem',
    'paddingBottom': '1.2rem',
    'borderTop': `1px solid ${AltinnAppTheme.altinnPalette.primary.greyMedium}`,
  },
  subUnit: {
    'width': '100%',
    'paddingLeft': '2.4rem',
    'paddingRight': '2.4rem',
    '&:hover': {
      background: AltinnAppTheme.altinnPalette.primary.blueLight,
      cursor: 'pointer',
    },
  },
  subUnitListHeader: {
    'paddingLeft': '2.4rem',
    'paddingRight': '2.4rem',
    '&:hover': {
      background: AltinnAppTheme.altinnPalette.primary.blueLight,
      cursor: 'pointer',
    },
  },
  subUnitListHeaderText: {
    paddingTop: '1.2rem',
    color: AltinnAppTheme.altinnPalette.primary.black,
  },
  subUnitListHeaderIcon: {
    padding: '1.2rem',
    fontSize: '1.3rem',
    color: AltinnAppTheme.altinnPalette.primary.blue,
  },
  subUnitTextWrapper: {
    borderTop: `1px solid ${AltinnAppTheme.altinnPalette.primary.greyMedium}`,
    paddingRight: '2.1rem',
    paddingLeft: '4.8rem',
  },
  subUnitText: {
    fontSize: '1.6rem',
  },
  subUnitTextBold: {
    fontSize: '1.6rem',
    fontWeight: 700,
  },
  subUnitIcon: {
    paddingLeft: '2.8rem',
    fontSize: '4.2rem',
  },
});

export interface IAltinnPartyProps extends WithStyles<typeof styles> {
  party: IParty;
  onSelectParty: (party: IParty) => void;
  showSubUnits: boolean;
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

    if (!props.showSubUnits) {
      return null;
    }

    return (
      <AltinnCollapsableList
        transition={subUnitsExpanded}
        onClickExpand={expandSubUnits}
        listHeader={
          <Grid
            container={true}
            direction={'row'}
            className={classes.subUnitListHeader}
          >
            <Grid
              container={true}
              direction={'row'}
              className={classes.subUnitListHeaderWrapper}
            >
              <div
                className={classes.subUnitListHeaderIcon}
              >
                <i
                  className={'ai ai-expand-circle'}
                  style={{
                    WebkitTransition: '-webkit-transform 0.5s',
                    transition: 'transform 0.5s',
                    transform: subUnitsExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                    WebkitTransform: subUnitsExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  }}
                />
              </div>
              <Typography className={classes.subUnitListHeaderText}>
                {party.childParties.length}
                &nbsp;{language.party_selection.unit_type_subunit_plural ?
                  language.party_selection.unit_type_subunit_plural :
                  'language.party_selection.unit_type_subunit_plural'
                }
              </Typography>
            </Grid>
          </Grid>
        }
      >
        {party.childParties.map((childParty: IParty, index: number) => (
          <Grid
            key={index}
            container={true}
            direction={'column'}
            className={classes.subUnitWrapper}
          >
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
                <Typography className={`${classes.partyName}`}>
                  {childParty.name}
                </Typography>
                <Typography className={classes.partyInfo}>
                  &nbsp;{!language.party_selection ?
                    'party_selection.unit_org_number' :
                    language.party_selection.unit_org_number
                  }
                  &nbsp;{childParty.orgNumber}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
        ))}
      </AltinnCollapsableList>
    );
  }

  return (
    <Paper
      className={party.onlyHierarchyElementWithNoAccess ? classes.partyPaperDisabled : classes.partyPaper}
    >
      <Grid
        id={`party-${party.partyId}`}
        container={true}
        direction={'row'}
        className={party.onlyHierarchyElementWithNoAccess ? classes.partyWrapperDisabled : classes.partyWrapper}
        onClick={!party.onlyHierarchyElementWithNoAccess ? onClickParty.bind(null, party) : undefined}
        onKeyPress={!party.onlyHierarchyElementWithNoAccess ? onKeyPress.bind(null, party) : undefined}
        tabIndex={!party.onlyHierarchyElementWithNoAccess ? 0 : undefined}
      >
        <i className={classes.partyIcon + (isOrg ? ' fa fa-corp' : ' fa fa-private')} />
        <Typography className={classes.partyName}>
          {party.name + (party.isDeleted ? ` (${!language.party_selection ? 'party_selection.unit_deleted' : language.party_selection.unit_deleted}) ` : '')}
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
