import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router';

import { Checkbox, Heading, Paragraph } from '@digdir/designsystemet-react';
import { Buildings3Icon, ChevronRightCircleFillIcon, PersonIcon, PlusIcon } from '@navikt/aksel-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import cn from 'classnames';
import { partiesAllowedToInstantiateHierarchicalQuery, PartiesApi } from 'nextsrc/core/apiClient/partiesApi';
import { Button } from 'nextsrc/core/components/Button/Button';
import { GlobalData } from 'nextsrc/core/globalData';
import classes from 'nextsrc/features/instantiate/pages/party-selection/PartySelectionPage.module.css';
import { useLanguage } from 'nextsrc/libs/form-client/react/useLanguage';

import { PartyType } from 'src/types/shared';
import type { IParty } from 'src/types/shared';

function getAppOwner(langAsString: (key: string) => string): string {
  const resolved = langAsString('appOwner');
  if (resolved !== 'appOwner') {
    return resolved;
  }
  return GlobalData.orgName?.nb ?? GlobalData.org;
}

function getAppName(langAsString: (key: string) => string): string {
  const resolved = langAsString('appName');
  if (resolved !== 'appName') {
    return resolved;
  }
  const serviceName = langAsString('ServiceName');
  if (serviceName !== 'ServiceName') {
    return serviceName;
  }
  return GlobalData.app;
}

function getPartyTypesString(langAsString: (key: string) => string): string {
  const { partyTypesAllowed } = GlobalData.applicationMetadata ?? {};
  const allDisallowed = partyTypesAllowed ? Object.values(partyTypesAllowed).every((value) => !value) : true;
  const partyTypes: string[] = [];

  if (allDisallowed || partyTypesAllowed?.person) {
    partyTypes.push(langAsString('party_selection.unit_type_private_person'));
  }
  if (allDisallowed || partyTypesAllowed?.organisation) {
    partyTypes.push(langAsString('party_selection.unit_type_company'));
  }
  if (allDisallowed || partyTypesAllowed?.subUnit) {
    partyTypes.push(langAsString('party_selection.unit_type_subunit'));
  }
  if (allDisallowed || partyTypesAllowed?.bankruptcyEstate) {
    partyTypes.push(langAsString('party_selection.unit_type_bankruptcy_state'));
  }

  if (partyTypes.length === 1) {
    return partyTypes[0];
  }

  const bindingWord = langAsString('party_selection.binding_word');
  let result = '';
  for (let i = 0; i < partyTypes.length; i++) {
    if (i === 0) {
      result += partyTypes[i];
    } else if (i === partyTypes.length - 1) {
      result += ` ${bindingWord} ${partyTypes[i]}`;
    } else {
      result += `, ${partyTypes[i]} `;
    }
  }
  return result;
}

export const PartySelectionPage = () => {
  const { langAsString } = useLanguage();
  const { errorCode } = useParams<{ errorCode?: string }>();
  const navigate = useNavigate();
  const { data: parties = [], isLoading } = useQuery(partiesAllowedToInstantiateHierarchicalQuery);

  const defaultShowDeleted = parties.length > 0 && parties.every((party) => party.isDeleted);

  const [filterString, setFilterString] = useState('');
  const [numberOfPartiesShown, setNumberOfPartiesShown] = useState(4);
  const [showSubUnits, setShowSubUnits] = useState(true);
  const [showDeleted, setShowDeleted] = useState(defaultShowDeleted);

  const appPromptForPartyOverride = GlobalData.applicationMetadata.promptForParty;

  const selectPartyMutation = useMutation({
    mutationFn: (party: IParty) => PartiesApi.setSelectedParty(party.partyId),
    onSuccess: () => {
      navigate('/');
    },
  });

  const onSelectParty = (party: IParty) => {
    selectPartyMutation.mutate(party);
  };

  const filteredParties = parties.filter(
    (party) => party.name.toUpperCase().includes(filterString.toUpperCase()) && !(party.isDeleted && !showDeleted),
  );

  const hasMoreParties = filteredParties.length > numberOfPartiesShown;
  const partiesSubset = filteredParties.slice(0, numberOfPartiesShown);

  const header = langAsString('party_selection.header');
  const appName = getAppName(langAsString);
  const appOwner = getAppOwner(langAsString);

  if (parties.length === 0) {
    return (
      <div className={classes.container}>
        <InstantiateHeader />
        <title>{`${header} - ${appName} - ${appOwner}`}</title>
        <span data-testid='StatusCode'>403</span>
      </div>
    );
  }

  return (
    <div className={classes.container}>
      {!isLoading && <div id='finishedLoading' />}

      <InstantiateHeader />
      <title>{`${header} - ${appName} - ${appOwner}`}</title>
      <Heading
        level={1}
        className={classes.title}
      >
        {header}
      </Heading>
      {errorCode === '403' && <ErrorMessage langAsString={langAsString} />}
      <div className={classes.searchFieldContainer}>
        <input
          placeholder={langAsString('party_selection.search_placeholder')}
          onChange={(e) => setFilterString(e.target.value)}
          value={filterString}
          inputMode='search'
        />
      </div>
      <div>
        <div className={classes.subTitleContainer}>
          <Paragraph className={classes.subTitle}>{langAsString('party_selection.subheader')}</Paragraph>
          <div className={classes.checkboxContainer}>
            <Checkbox
              data-size='sm'
              value='showDeleted'
              checked={showDeleted}
              onChange={() => setShowDeleted(!showDeleted)}
              label={langAsString('party_selection.show_deleted')}
            />
            <Checkbox
              data-size='sm'
              value='showSubUnits'
              checked={showSubUnits}
              onChange={() => setShowSubUnits(!showSubUnits)}
              label={langAsString('party_selection.show_sub_unit')}
            />
          </div>
        </div>
        {partiesSubset.map((party, index) => (
          <AltinnParty
            key={index}
            party={party}
            onSelectParty={onSelectParty}
            showSubUnits={showSubUnits}
          />
        ))}
        {hasMoreParties && (
          <div className={classes.loadMoreContainer}>
            <Button
              variant='secondary'
              onClick={() => setNumberOfPartiesShown(numberOfPartiesShown + 4)}
            >
              <PlusIcon
                fontSize='1rem'
                aria-hidden
              />
              {langAsString('party_selection.load_more')}
            </Button>
          </div>
        )}
        {errorCode === 'explained' && (
          <div className={classes.explainedSection}>
            <Heading
              level={2}
              data-size='md'
              className={classes.explainedHeading}
            >
              {langAsString('party_selection.why_seeing_this')}
            </Heading>
            <Paragraph>
              {appPromptForPartyOverride === 'always'
                ? langAsString('party_selection.seeing_this_override')
                : langAsString('party_selection.seeing_this_preference')}
            </Paragraph>
          </div>
        )}
      </div>
    </div>
  );
};

function InstantiateHeader() {
  const profile = GlobalData.userProfile;
  const party = profile?.party;

  return (
    <div data-testid='InstantiateHeader'>
      {party && (
        <span>
          {party.orgNumber ? (
            <Buildings3Icon
              aria-hidden='true'
              color='white'
            />
          ) : (
            <PersonIcon
              aria-hidden='true'
              color='white'
            />
          )}
        </span>
      )}
    </div>
  );
}

function ErrorMessage({ langAsString }: { langAsString: (key: string, params?: (string | number)[]) => string }) {
  const selectedParty = GlobalData.selectedParty;
  const partyName = selectedParty?.name ? capitalize(selectedParty.name) : '';

  return (
    <Paragraph
      className={classes.error}
      id='party-selection-error'
    >
      {!selectedParty
        ? langAsString('party_selection.invalid_selection_non_existing_party')
        : langAsString('party_selection.invalid_selection_existing_party', [
            partyName,
            getPartyTypesString(langAsString),
          ])}
    </Paragraph>
  );
}

function capitalize(name: string): string {
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

interface AltinnPartyProps {
  party: IParty;
  onSelectParty: (party: IParty) => void;
  showSubUnits: boolean;
}

function AltinnParty({ party, onSelectParty, showSubUnits }: AltinnPartyProps) {
  const { langAsString } = useLanguage();
  const [subUnitsExpanded, setSubUnitsExpanded] = useState(false);
  const isOrg = party.partyTypeName === PartyType.Organisation;

  function onClickParty(selectedParty: IParty, event: React.MouseEvent) {
    event.stopPropagation();
    onSelectParty(selectedParty);
  }

  function onKeyPress(selectedParty: IParty, event: React.KeyboardEvent) {
    event.stopPropagation();
    if (event.key === 'Enter' || event.key === ' ') {
      onSelectParty(selectedParty);
    }
  }

  return (
    <div className={party.onlyHierarchyElementWithNoAccess ? classes.partyPaperDisabled : classes.partyPaper}>
      <div
        id={`party-${party.partyId}`}
        role='button'
        data-testid='AltinnParty-PartyWrapper'
        className={cn(classes.partyWrapper, {
          [classes.partyWrapperDisabled]: party.onlyHierarchyElementWithNoAccess,
        })}
        onClick={!party.onlyHierarchyElementWithNoAccess ? (e) => onClickParty(party, e) : undefined}
        onKeyPress={!party.onlyHierarchyElementWithNoAccess ? (e) => onKeyPress(party, e) : undefined}
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
        <Paragraph className={classes.partyName}>
          {party.name + (party.isDeleted ? ` (${langAsString('party_selection.unit_deleted')}) ` : '')}
        </Paragraph>
        <Paragraph className={classes.partyInfo}>
          {isOrg
            ? `${langAsString('party_selection.unit_org_number')} ${party.orgNumber}`
            : `${langAsString('party_selection.unit_personal_number')} ${party.ssn}`}
        </Paragraph>
      </div>
      {showSubUnits && party.childParties && party.childParties.length > 0 && (
        <SubUnits
          party={party}
          expanded={subUnitsExpanded}
          onToggle={() => setSubUnitsExpanded(!subUnitsExpanded)}
          onSelectParty={onSelectParty}
        />
      )}
    </div>
  );
}

interface SubUnitsProps {
  party: IParty;
  expanded: boolean;
  onToggle: () => void;
  onSelectParty: (party: IParty) => void;
}

function SubUnits({ party, expanded, onToggle, onSelectParty }: SubUnitsProps) {
  const { langAsString } = useLanguage();
  const childParties = party.childParties ?? [];

  function onKeyPress(event: React.KeyboardEvent) {
    event.stopPropagation();
    if (event.key === 'Enter' || event.key === ' ') {
      onToggle();
    }
  }

  return (
    <div>
      <div
        role='button'
        onClick={onToggle}
        onKeyPress={onKeyPress}
        tabIndex={0}
        className={classes.subUnitListHeader}
      >
        <div className={classes.subUnitListHeaderWrapper}>
          <ChevronRightCircleFillIcon
            className={classes.subUnitListHeaderIcon}
            style={{
              transition: 'transform 0.5s',
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
            }}
            aria-hidden
          />
          <Paragraph>
            {childParties.length}
            &nbsp;
            <span>
              {childParties.length === 1
                ? langAsString('party_selection.unit_type_subunit')
                : langAsString('party_selection.unit_type_subunit_plural')}
            </span>
          </Paragraph>
        </div>
      </div>
      <div className={cn(classes.collapsible, { [classes.collapsibleClosed]: !expanded })}>
        {childParties.map((childParty, index) => (
          <div
            data-testid='AltinnParty-SubUnitWrapper'
            key={index}
            className={classes.subUnitWrapper}
          >
            <div
              role='button'
              className={classes.subUnit}
              onClick={(e) => {
                e.stopPropagation();
                onSelectParty(childParty);
              }}
              onKeyPress={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelectParty(childParty);
                }
              }}
              tabIndex={expanded ? 0 : undefined}
            >
              <div className={classes.subUnitTextWrapper}>
                <Paragraph className={classes.partyName}>{childParty.name}</Paragraph>
                <Paragraph className={classes.partyInfo}>
                  &nbsp;{langAsString('party_selection.unit_org_number')}&nbsp;{childParty.orgNumber}
                </Paragraph>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
