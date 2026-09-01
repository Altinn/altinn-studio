import React from 'react';

import { Flex } from '@app/form-component';
import { Paragraph } from '@digdir/designsystemet-react';
import { Buildings3Icon, ChevronRightCircleFillIcon, PersonIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { AltinnCollapsibleList } from 'src/components/AltinnCollapsible';
import classes from 'src/components/altinnParty.module.css';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { PartyType } from 'src/types/shared';
import { maskSsn } from 'src/utils/maskSsn';
import type { IParty } from 'src/types/shared';

export interface IAltinnPartyProps {
  party: IParty;
  onSelectParty: (party: IParty) => Promise<void> | void;
  showSubUnits: boolean;
  selectedPartyId?: number;
}

/** State of a party element. 'selectable' means it can be selected, 'noAccess' means the user has no access, 'selected' means it is currently selected, and 'blocked' means another party is selected. */
export type AltinnPartyState = 'selectable' | 'noAccess' | 'selected' | 'blocked';

function getPartyState(party: IParty, selectedPartyId: number | undefined): AltinnPartyState {
  if (party.onlyHierarchyElementWithNoAccess) {
    return 'noAccess';
  }
  if (party.partyId === selectedPartyId) {
    return 'selected';
  }
  if (selectedPartyId !== undefined) {
    return 'blocked';
  }
  return 'selectable';
}

export function AltinnParty({ party, onSelectParty, showSubUnits, selectedPartyId }: IAltinnPartyProps) {
  const { langAsString } = useLanguage();

  const [subUnitsExpanded, setSubUnitsExpanded] = React.useState<boolean>(false);
  const isOrg = party.partyTypeName === PartyType.Organization;
  const partyState = getPartyState(party, selectedPartyId);

  function onClickParty(selectedParty: IParty, event: React.MouseEvent<HTMLDivElement, MouseEvent>) {
    event.stopPropagation();
    onSelectParty(selectedParty);
  }

  function onKeyPressParty(selectedParty: IParty, event: React.KeyboardEvent) {
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
      <AltinnCollapsibleList
        open={subUnitsExpanded}
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
              <Paragraph>
                {party.childParties.length}
                &nbsp;
                <Lang
                  id={
                    party.childParties.length === 1
                      ? 'party_selection.unit_type_subunit'
                      : 'party_selection.unit_type_subunit_plural'
                  }
                />
              </Paragraph>
            </Flex>
          </Flex>
        }
      >
        {party.childParties.map((childParty: IParty) => (
          <SubUnit
            key={childParty.partyId}
            party={childParty}
            selectedPartyId={selectedPartyId}
            tabbable={subUnitsExpanded}
            onClick={(event) => onClickParty(childParty, event)}
            onKeyPress={(event) => onKeyPressParty(childParty, event)}
          />
        ))}
      </AltinnCollapsibleList>
    );
  }

  return (
    <div className={partyState === 'noAccess' ? classes.partyPaperDisabled : classes.partyPaper}>
      <Flex
        id={`party-${party.partyId}`}
        role='button'
        data-testid='AltinnParty-PartyWrapper'
        container
        direction='row'
        alignItems='center'
        className={cn(classes.partyWrapper, {
          [classes.partyWrapperSelectable]: partyState === 'selectable',
          [classes.partyWrapperDisabled]: partyState === 'noAccess',
          [classes.partyWrapperSelected]: partyState === 'selected',
        })}
        onClick={partyState !== 'noAccess' ? (event) => onClickParty(party, event) : undefined}
        onKeyPress={partyState !== 'noAccess' ? (event) => onKeyPressParty(party, event) : undefined}
        tabIndex={partyState !== 'noAccess' ? 0 : undefined}
        aria-busy={partyState === 'selected'}
        aria-disabled={partyState === 'noAccess' || partyState === 'blocked'}
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
        <Paragraph className={classes.partyName}>
          {party.name + (party.isDeleted ? ` (${langAsString('party_selection.unit_deleted')}) ` : '')}
        </Paragraph>
        <Paragraph className={classes.partyInfo}>
          {isOrg
            ? `${langAsString('party_selection.unit_org_number')} ${party.orgNumber}`
            : `${langAsString('party_selection.unit_personal_number')} ${maskSsn(party.ssn)}`}
        </Paragraph>
      </Flex>
      {renderSubunits()}
    </div>
  );
}

interface ISubUnitProps {
  party: IParty;
  selectedPartyId: number | undefined;
  tabbable: boolean;
  onClick: (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => void;
  onKeyPress: (event: React.KeyboardEvent) => void;
}

function SubUnit({ party, selectedPartyId, tabbable, onClick, onKeyPress }: ISubUnitProps) {
  const partyState = getPartyState(party, selectedPartyId);

  return (
    <Flex
      data-testid='AltinnParty-SubUnitWrapper'
      container
      direction='column'
      className={classes.subUnitWrapper}
    >
      <Flex
        role='button'
        className={cn(classes.subUnit, {
          [classes.subUnitSelectable]: partyState === 'selectable',
          [classes.subUnitSelected]: partyState === 'selected',
        })}
        container
        direction='column'
        onClick={onClick}
        onKeyPress={onKeyPress}
        tabIndex={tabbable ? 0 : undefined}
        aria-busy={partyState === 'selected'}
        aria-disabled={partyState === 'noAccess' || partyState === 'blocked'}
      >
        <Flex
          container
          direction='row'
          alignItems='center'
          className={classes.subUnitTextWrapper}
        >
          <Paragraph className={classes.partyName}>{party.name}</Paragraph>
          <Paragraph className={classes.partyInfo}>
            &nbsp;
            <Lang id='party_selection.unit_org_number' />
            &nbsp;{party.orgNumber}
          </Paragraph>
        </Flex>
      </Flex>
    </Flex>
  );
}
