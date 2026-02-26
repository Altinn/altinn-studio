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

import { PartyType } from 'src/types/shared';
import type { IParty } from 'src/types/shared';

// TODO: Replace with i18n system when language support is added to nextsrc
const texts = {
  header: 'Hvem vil du sende inn for?',
  searchPlaceholder: 'Søk etter aktør',
  subheader: 'Dine aktører som kan starte tjenesten:',
  showDeleted: 'Vis slettede',
  showSubUnits: 'Vis underenheter',
  unitDeleted: 'slettet',
  unitOrgNumber: 'org.nr.',
  unitPersonalNumber: 'personnr.',
  unitTypeSubunit: 'underenhet',
  unitTypeSubunitPlural: 'underenheter',
  loadMore: 'Last flere',
  whySeeingThis: 'Hvorfor ser jeg dette?',
  seeingThisPreference:
    'Du kan endre profilinnstillingene dine for å ikke bli spurt om aktør hver gang du starter utfylling av et nytt skjema.',
  seeingThisOverride: 'Denne appen er satt opp til å alltid spørre om aktør.',
  invalidSelectionNonExisting:
    'Du har startet tjenesten med en aktør som enten ikke finnes eller som du ikke har tilgang på. Velg ny aktør under for å fortsette.',
  bindingWord: 'eller',
  unitTypePrivatePerson: 'privatperson',
  unitTypeCompany: 'virksomhet',
  unitTypeBankruptcyState: 'konkursbo',
} as const;

function getAppOwner(): string {
  const textResource = GlobalData.textResources?.resources.find((r) => r.id === 'appOwner');
  if (textResource?.value) {
    return textResource.value;
  }
  return GlobalData.orgName?.nb ?? GlobalData.org;
}

function getAppName(): string {
  const textResource = GlobalData.textResources?.resources.find((r) => r.id === 'appName');
  if (textResource?.value) {
    return textResource.value;
  }
  const oldTextResource = GlobalData.textResources?.resources.find((r) => r.id === 'ServiceName');
  if (oldTextResource?.value) {
    return oldTextResource.value;
  }
  return GlobalData.app;
}

function getPartyTypesString(): string {
  const { partyTypesAllowed } = GlobalData.applicationMetadata ?? {};
  const allDisallowed = partyTypesAllowed ? Object.values(partyTypesAllowed).every((value) => !value) : true;
  const partyTypes: string[] = [];

  if (allDisallowed || partyTypesAllowed?.person) {
    partyTypes.push(texts.unitTypePrivatePerson);
  }
  if (allDisallowed || partyTypesAllowed?.organisation) {
    partyTypes.push(texts.unitTypeCompany);
  }
  if (allDisallowed || partyTypesAllowed?.subUnit) {
    partyTypes.push(texts.unitTypeSubunit);
  }
  if (allDisallowed || partyTypesAllowed?.bankruptcyEstate) {
    partyTypes.push(texts.unitTypeBankruptcyState);
  }

  if (partyTypes.length === 1) {
    return partyTypes[0];
  }

  let result = '';
  for (let i = 0; i < partyTypes.length; i++) {
    if (i === 0) {
      result += partyTypes[i];
    } else if (i === partyTypes.length - 1) {
      result += ` ${texts.bindingWord} ${partyTypes[i]}`;
    } else {
      result += `, ${partyTypes[i]} `;
    }
  }
  return result;
}

export const PartySelectionPage = () => {
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

  if (parties.length === 0) {
    return (
      <div className={classes.container}>
        <InstantiateHeader />
        <title>{`${texts.header} - ${getAppName()} - ${getAppOwner()}`}</title>
        <span data-testid='StatusCode'>403</span>
      </div>
    );
  }

  return (
    <div className={classes.container}>
      {!isLoading && <div id='finishedLoading' />}

      <InstantiateHeader />
      <title>{`${texts.header} - ${getAppName()} - ${getAppOwner()}`}</title>
      <Heading
        level={1}
        className={classes.title}
      >
        {texts.header}
      </Heading>
      {errorCode === '403' && <ErrorMessage />}
      <div className={classes.searchFieldContainer}>
        <input
          placeholder={texts.searchPlaceholder}
          onChange={(e) => setFilterString(e.target.value)}
          value={filterString}
          inputMode='search'
        />
      </div>
      <div>
        <div className={classes.subTitleContainer}>
          <Paragraph className={classes.subTitle}>{texts.subheader}</Paragraph>
          <div className={classes.checkboxContainer}>
            <Checkbox
              data-size='sm'
              value='showDeleted'
              checked={showDeleted}
              onChange={() => setShowDeleted(!showDeleted)}
              label={texts.showDeleted}
            />
            <Checkbox
              data-size='sm'
              value='showSubUnits'
              checked={showSubUnits}
              onChange={() => setShowSubUnits(!showSubUnits)}
              label={texts.showSubUnits}
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
              {texts.loadMore}
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
              {texts.whySeeingThis}
            </Heading>
            <Paragraph>
              {appPromptForPartyOverride === 'always' ? texts.seeingThisOverride : texts.seeingThisPreference}
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

function ErrorMessage() {
  const selectedParty = GlobalData.selectedParty;
  const partyName = selectedParty?.name ? capitalize(selectedParty.name) : '';

  return (
    <Paragraph
      className={classes.error}
      id='party-selection-error'
    >
      {!selectedParty
        ? texts.invalidSelectionNonExisting
        : `Du har startet tjenesten som ${partyName}. Denne tjenesten er kun tilgjengelig for ${getPartyTypesString()}. Velg ny aktør under.`}
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
          {party.name + (party.isDeleted ? ` (${texts.unitDeleted}) ` : '')}
        </Paragraph>
        <Paragraph className={classes.partyInfo}>
          {isOrg ? `${texts.unitOrgNumber} ${party.orgNumber}` : `${texts.unitPersonalNumber} ${party.ssn}`}
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
            <span>{childParties.length === 1 ? texts.unitTypeSubunit : texts.unitTypeSubunitPlural}</span>
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
                  &nbsp;{texts.unitOrgNumber}&nbsp;{childParty.orgNumber}
                </Paragraph>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
