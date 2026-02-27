import React, { useState } from 'react';
import { Form, useParams } from 'react-router';

import { Checkbox, Heading, Paragraph } from '@digdir/designsystemet-react';
import { Buildings3Icon, ChevronRightCircleFillIcon, PersonIcon, PlusIcon } from '@navikt/aksel-icons';
import cn from 'classnames';
import { Button } from 'nextsrc/core/components/Button/Button';
import { GlobalData } from 'nextsrc/core/globalData';
import { usePartiesAllowedToInstantiate } from 'nextsrc/core/queries/parties';
import classes from 'nextsrc/routes/party-selection/party-selection.route.module.css';

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
  const { data: parties = [], isLoading } = usePartiesAllowedToInstantiate();

  const defaultShowDeleted = parties.length > 0 && parties.every((party) => party.isDeleted);

  const [filterString, setFilterString] = useState('');
  const [numberOfPartiesShown, setNumberOfPartiesShown] = useState(4);
  const [showSubUnits, setShowSubUnits] = useState(true);
  const [showDeleted, setShowDeleted] = useState(defaultShowDeleted);

  const appPromptForPartyOverride = GlobalData.applicationMetadata.promptForParty;

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
      <Form method='put'>
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
      </Form>
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
  showSubUnits: boolean;
}

function AltinnParty({ party, showSubUnits }: AltinnPartyProps) {
  const [subUnitsExpanded, setSubUnitsExpanded] = useState(false);
  const isOrg = party.partyTypeName === PartyType.Organisation;

  return (
    <div className={party.onlyHierarchyElementWithNoAccess ? classes.partyPaperDisabled : classes.partyPaper}>
      <button
        id={`party-${party.partyId}`}
        data-testid='AltinnParty-PartyWrapper'
        className={cn(classes.partyWrapper, {
          [classes.partyWrapperDisabled]: party.onlyHierarchyElementWithNoAccess,
        })}
        name='partyId'
        value={party.partyId}
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
      </button>
      {showSubUnits && party.childParties && party.childParties.length > 0 && (
        <SubUnits
          party={party}
          expanded={subUnitsExpanded}
          onToggle={() => setSubUnitsExpanded(!subUnitsExpanded)}
        />
      )}
    </div>
  );
}

interface SubUnitsProps {
  party: IParty;
  expanded: boolean;
  onToggle: () => void;
}

function SubUnits({ party, expanded, onToggle }: SubUnitsProps) {
  const childParties = party.childParties ?? [];

  return (
    <div>
      <button
        onClick={onToggle}
        tabIndex={0}
        className={classes.subUnitListHeader}
        name='partyId'
        value={party.partyId}
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
      </button>
      <div className={cn(classes.collapsible, { [classes.collapsibleClosed]: !expanded })}>
        {childParties.map((childParty, index) => (
          <div
            data-testid='AltinnParty-SubUnitWrapper'
            key={index}
            className={classes.subUnitWrapper}
          >
            <button
              name='partyId'
              value={party.partyId}
              className={classes.subUnit}
              tabIndex={expanded ? 0 : undefined}
            >
              <div className={classes.subUnitTextWrapper}>
                <Paragraph className={classes.partyName}>{childParty.name}</Paragraph>
                <Paragraph className={classes.partyInfo}>
                  &nbsp;{texts.unitOrgNumber}&nbsp;{childParty.orgNumber}
                </Paragraph>
              </div>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
