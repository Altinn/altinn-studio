import React from 'react';

import { Grid, makeStyles, Paper, Typography } from '@material-ui/core';
import { Buldings3Icon, ChevronRightCircleFillIcon, PersonIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { AltinnCollapsableList } from 'src/components/AltinnCollapsableList';
import { useLanguage } from 'src/hooks/useLanguage';
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
    padding: '1.25rem',
    gap: '0.75rem',
    '&:hover': {
      cursor: 'pointer',
    },
  },
  partyWrapperDisabled: {
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
    fontWeight: 700,
  },
  partyInfo: {
    fontWeight: 300,
    fontSize: '0.875rem',
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
    gap: '0.75rem',
    borderTop: `1px solid ${theme.altinnPalette.primary.greyMedium}`,
  },
  subUnit: {
    width: '100%',
    padding: '0 1.25rem',
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
  subUnitListHeaderIcon: {
    fontSize: '2rem',
    color: theme.altinnPalette.primary.blue,
  },
  subUnitTextWrapper: {
    padding: '1.25rem',
    paddingLeft: '3rem',
    gap: '0.75rem',
    borderTop: `1px solid ${theme.altinnPalette.primary.greyMedium}`,
  },
  subUnitTextBold: {
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

export function AltinnParty({ party, onSelectParty, showSubUnits }: IAltinnPartyProps) {
  const classes = useStyles();
  const { lang, langAsString } = useLanguage();

  const [subUnitsExpanded, setSubUnitsExpanded] = React.useState<boolean>(false);
  const isOrg: boolean = party.orgNumber != null;

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
              alignItems='center'
              className={classes.subUnitListHeaderWrapper}
            >
              <ChevronRightCircleFillIcon
                className={classes.subUnitListHeaderIcon}
                style={{
                  WebkitTransition: '-webkit-transform 0.5s',
                  transition: 'transform 0.5s',
                  transform: subUnitsExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                  WebkitTransform: subUnitsExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                }}
                aria-hidden
              />
              <Typography>
                {party.childParties.length}
                &nbsp;
                {lang('party_selection.unit_type_subunit_plural')}
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
              role='button'
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
                alignItems='center'
                className={classes.subUnitTextWrapper}
              >
                <Typography className={`${classes.partyName}`}>{childParty.name}</Typography>
                <Typography className={classes.partyInfo}>
                  &nbsp;
                  {lang('party_selection.unit_org_number')}
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
        role='button'
        data-testid='AltinnParty-PartyWrapper'
        container={true}
        direction='row'
        alignItems='center'
        className={cn(classes.partyWrapper, { [classes.partyWrapperDisabled]: party.onlyHierarchyElementWithNoAccess })}
        onClick={!party.onlyHierarchyElementWithNoAccess ? onClickParty.bind(null, party) : undefined}
        onKeyPress={!party.onlyHierarchyElementWithNoAccess ? onKeyPress.bind(null, party) : undefined}
        tabIndex={!party.onlyHierarchyElementWithNoAccess ? 0 : undefined}
      >
        {isOrg ? (
          <Buldings3Icon
            data-testid='org-icon'
            style={{ fontSize: '2rem' }}
            aria-hidden
          />
        ) : (
          <PersonIcon
            data-testid='person-icon'
            style={{ fontSize: '2rem' }}
            aria-hidden
          />
        )}
        <Typography className={classes.partyName}>
          {party.name + (party.isDeleted ? ` (${langAsString('party_selection.unit_deleted')}) ` : '')}
        </Typography>
        <Typography className={classes.partyInfo}>
          {isOrg
            ? `${langAsString('party_selection.unit_org_number')} ${party.orgNumber}`
            : `${langAsString('party_selection.unit_personal_number')} ${party.ssn}`}
        </Typography>
      </Grid>
      {renderSubunits()}
    </Paper>
  );
}
