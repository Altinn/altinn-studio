import React from 'react';

import { Paper, Typography } from '@material-ui/core';
import { Buildings3Icon, ChevronRightCircleFillIcon, PersonIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { Flex } from 'src/app-components/Flex/Flex';
import { AltinnCollapsableList } from 'src/components/AltinnCollapsableList';
import classes from 'src/components/altinnParty.module.css';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { PartyType } from 'src/types/shared';
import type { IParty } from 'src/types/shared';

export interface IAltinnPartyProps {
  party: IParty;
  onSelectParty: (party: IParty) => void;
  showSubUnits: boolean;
}

export function AltinnParty({ party, onSelectParty, showSubUnits }: IAltinnPartyProps) {
  const { langAsString } = useLanguage();

  const [subUnitsExpanded, setSubUnitsExpanded] = React.useState<boolean>(false);
  const isOrg = party.partyTypeName === PartyType.Organisation;

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
          <Flex
            container
            direction='row'
            className={classes.subUnitListHeader}
          >
            <Flex
              container
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
                <Lang id='party_selection.unit_type_subunit_plural' />
              </Typography>
            </Flex>
          </Flex>
        }
      >
        {party.childParties.map((childParty: IParty, index: number) => (
          <Flex
            data-testid='AltinnParty-SubUnitWrapper'
            key={index}
            container
            direction='column'
            className={classes.subUnitWrapper}
          >
            <Flex
              key={index}
              role='button'
              className={classes.subUnit}
              container
              direction='column'
              onClick={onClickParty.bind(null, childParty)}
              onKeyPress={onKeyPress.bind(null, childParty)}
              tabIndex={subUnitsExpanded ? 0 : undefined}
            >
              <Flex
                container
                direction='row'
                alignItems='center'
                className={classes.subUnitTextWrapper}
              >
                <Typography className={classes.partyName}>{childParty.name}</Typography>
                <Typography className={classes.partyInfo}>
                  &nbsp;
                  <Lang id='party_selection.unit_org_number' />
                  &nbsp;{childParty.orgNumber}
                </Typography>
              </Flex>
            </Flex>
          </Flex>
        ))}
      </AltinnCollapsableList>
    );
  }

  return (
    <Paper className={party.onlyHierarchyElementWithNoAccess ? classes.partyPaperDisabled : classes.partyPaper}>
      <Flex
        id={`party-${party.partyId}`}
        role='button'
        data-testid='AltinnParty-PartyWrapper'
        container
        direction='row'
        alignItems='center'
        className={cn(classes.partyWrapper, { [classes.partyWrapperDisabled]: party.onlyHierarchyElementWithNoAccess })}
        onClick={!party.onlyHierarchyElementWithNoAccess ? onClickParty.bind(null, party) : undefined}
        onKeyPress={!party.onlyHierarchyElementWithNoAccess ? onKeyPress.bind(null, party) : undefined}
        tabIndex={!party.onlyHierarchyElementWithNoAccess ? 0 : undefined}
      >
        {isOrg ? (
          <Buildings3Icon
            data-testid='org-icon'
            fontSize='2rem'
            aria-hidden
          />
        ) : (
          <PersonIcon
            data-testid='person-icon'
            fontSize='2rem'
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
      </Flex>
      {renderSubunits()}
    </Paper>
  );
}
