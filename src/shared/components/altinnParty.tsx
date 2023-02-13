import React from 'react';

import { Grid, makeStyles, Paper, Typography } from '@material-ui/core';

import { useAppSelector } from 'src/common/hooks';
import { AltinnCollapsableList } from 'src/components/shared';
import { getLanguageFromKey } from 'src/utils/sharedUtils';
import type { IParty } from 'src/types/shared';

const useStyles = makeStyles((theme) => ({
  partyPaper: {
    marginBottom: '0.75rem',
    borderRadius: 0,
    backgroundColor: theme.altinnPalette.primary.blueLighter,
    boxShadow: theme.sharedStyles.boxShadow,
    width: '100%',
  },
  partyWrapper: {
    paddingLeft: '1.5rem',
    paddingRight: '1.5rem',
    '&:hover': {
      cursor: 'pointer',
    },
  },
  partyWrapperDisabled: {
    paddingLeft: '1.5rem',
    paddingRight: '1.5rem',
    '&:hover': {
      cursor: 'not-allowed',
    },
  },
  partyPaperDisabled: {
    marginBottom: '0.75rem',
    borderRadius: 0,
    backgroundColor: theme.altinnPalette.primary.blueLighter,
    boxShadow: theme.sharedStyles.boxShadow,
    color: theme.altinnPalette.primary.grey,
    width: '100%',
  },
  partyIcon: {
    padding: '0.75rem',
    fontSize: '42px',
  },
  partyName: {
    padding: '0.75rem',
    paddingTop: '1.5rem',
    fontSize: '1.093rem',
    fontWeight: 700,
  },
  partyInfo: {
    paddingTop: '1.625rem',
    fontSize: '0.9375rem',
    fontWeight: 300,
  },
  subUnitWrapper: {
    color: theme.altinnPalette.primary.black,
  },
  subUnitListHeaderWrapper: {
    '&:hover': {
      cursor: 'pointer',
    },
    paddingTop: '0.75rem',
    paddingBottom: '0.75rem',
    borderTop: `1px solid ${theme.altinnPalette.primary.greyMedium}`,
  },
  subUnit: {
    width: '100%',
    paddingLeft: '1.5rem',
    paddingRight: '1.5rem',
    '&:hover': {
      background: theme.altinnPalette.primary.blueLight,
      cursor: 'pointer',
    },
  },
  subUnitListHeader: {
    paddingLeft: '1.5rem',
    paddingRight: '1.5rem',
    '&:hover': {
      background: theme.altinnPalette.primary.blueLight,
      cursor: 'pointer',
    },
  },
  subUnitListHeaderText: {
    paddingTop: '0.75rem',
    color: theme.altinnPalette.primary.black,
  },
  subUnitListHeaderIcon: {
    padding: '0.75rem',
    fontSize: '0.8125rem',
    color: theme.altinnPalette.primary.blue,
  },
  subUnitTextWrapper: {
    borderTop: `1px solid ${theme.altinnPalette.primary.greyMedium}`,
    paddingRight: '1.3125rem',
    paddingLeft: '3rem',
  },
  subUnitText: {
    fontSize: '1rem',
  },
  subUnitTextBold: {
    fontSize: '1rem',
    fontWeight: 700,
  },
  subUnitIcon: {
    paddingLeft: '1.75rem',
    fontSize: '2.625rem',
  },
}));

export interface IAltinnPartyProps {
  party: IParty;
  onSelectParty: (party: IParty) => void;
  showSubUnits: boolean;
}

function AltinnParty({ party, onSelectParty, showSubUnits }: IAltinnPartyProps) {
  const classes = useStyles();

  const [subUnitsExpanded, setSubUnitsExpanded] = React.useState<boolean>(false);
  const isOrg: boolean = party.orgNumber != null;
  const _language = useAppSelector((state) => state.language.language);

  if (_language === null) {
    return null;
  }

  const language = _language;

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

    if (!showSubUnits) {
      return null;
    }

    return (
      <AltinnCollapsableList
        transition={subUnitsExpanded}
        onClickExpand={expandSubUnits}
        listHeader={
          <Grid
            container={true}
            direction='row'
            className={classes.subUnitListHeader}
          >
            <Grid
              container={true}
              direction='row'
              className={classes.subUnitListHeaderWrapper}
            >
              <div className={classes.subUnitListHeaderIcon}>
                <i
                  className='ai ai-expand-circle'
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
                &nbsp;
                {getLanguageFromKey('party_selection.unit_type_subunit_plural', language)}
              </Typography>
            </Grid>
          </Grid>
        }
      >
        {party.childParties.map((childParty: IParty, index: number) => (
          <Grid
            data-testid='AltinnParty-SubUnitWrapper'
            key={index}
            container={true}
            direction='column'
            className={classes.subUnitWrapper}
          >
            <Grid
              key={index}
              className={classes.subUnit}
              container={true}
              direction='column'
              onClick={onClickParty.bind(null, childParty)}
              onKeyPress={onKeyPress.bind(null, childParty)}
              tabIndex={subUnitsExpanded ? 0 : undefined}
            >
              <Grid
                container={true}
                direction='row'
                className={classes.subUnitTextWrapper}
              >
                <Typography className={`${classes.partyName}`}>{childParty.name}</Typography>
                <Typography className={classes.partyInfo}>
                  &nbsp;
                  {getLanguageFromKey('party_selection.unit_org_number', language)}
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
    <Paper className={party.onlyHierarchyElementWithNoAccess ? classes.partyPaperDisabled : classes.partyPaper}>
      <Grid
        id={`party-${party.partyId}`}
        data-testid='AltinnParty-PartyWrapper'
        container={true}
        direction='row'
        className={party.onlyHierarchyElementWithNoAccess ? classes.partyWrapperDisabled : classes.partyWrapper}
        onClick={!party.onlyHierarchyElementWithNoAccess ? onClickParty.bind(null, party) : undefined}
        onKeyPress={!party.onlyHierarchyElementWithNoAccess ? onKeyPress.bind(null, party) : undefined}
        tabIndex={!party.onlyHierarchyElementWithNoAccess ? 0 : undefined}
      >
        <i
          data-testid='AltinnParty-partyIcon'
          className={classes.partyIcon + (isOrg ? ' fa fa-corp' : ' fa fa-private')}
        />
        <Typography className={classes.partyName}>
          {party.name + (party.isDeleted ? ` (${getLanguageFromKey('party_selection.unit_deleted', language)}) ` : '')}
        </Typography>
        <Typography className={classes.partyInfo}>
          {isOrg
            ? `${getLanguageFromKey('party_selection.unit_org_number', language)} ${party.orgNumber}`
            : `${getLanguageFromKey('party_selection.unit_personal_number', language)} ${party.ssn}`}
        </Typography>
      </Grid>
      {renderSubunits()}
    </Paper>
  );
}

export default AltinnParty;
