import React from 'react';
import { useMatch, useNavigate } from 'react-router-dom';

import { Checkbox, Heading, Paragraph } from '@digdir/designsystemet-react';
import { PlusIcon } from '@navikt/aksel-icons';
import cn from 'classnames';

import { Button } from 'src/app-components/Button/Button';
import { Flex } from 'src/app-components/Flex/Flex';
import { Input } from 'src/app-components/Input/Input';
import { AltinnParty } from 'src/components/altinnParty';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import { useApplicationMetadata } from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { InstantiationContainer } from 'src/features/instantiate/containers/InstantiationContainer';
import classes from 'src/features/instantiate/containers/PartySelection.module.css';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import {
  usePartiesAllowedToInstantiate,
  useSelectedParty,
  useSetHasSelectedParty,
  useSetSelectedParty,
} from 'src/features/party/PartiesProvider';
import { AltinnPalette } from 'src/theme/altinnAppTheme';
import { changeBodyBackground } from 'src/utils/bodyStyling';
import { getPageTitle } from 'src/utils/getPageTitle';
import { HttpStatusCodes } from 'src/utils/network/networking';
import { capitalizeName } from 'src/utils/stringHelper';
import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { IParty } from 'src/types/shared';

export const PartySelection = () => {
  changeBodyBackground(AltinnPalette.white);
  const match = useMatch(`/party-selection/:errorCode`);
  const errorCode = match?.params.errorCode;

  const selectParty = useSetSelectedParty();
  const selectedParty = useSelectedParty();
  const setUserHasSelectedParty = useSetHasSelectedParty();

  const partiesAllowedToInstantiate = usePartiesAllowedToInstantiate() ?? [];
  const appMetadata = useApplicationMetadata();

  // Like on altinn.no, we tick the "show deleted" checkbox by default when the
  // user only has deleted parties to choose from.
  const defaultShowDeleted = partiesAllowedToInstantiate.every((party) => party.isDeleted);

  const appPromptForPartyOverride = appMetadata.promptForParty;
  const { langAsString } = useLanguage();

  const [filterString, setFilterString] = React.useState('');
  const [numberOfPartiesShown, setNumberOfPartiesShown] = React.useState(4);
  const [showSubUnits, setShowSubUnits] = React.useState(true);
  const [showDeleted, setShowDeleted] = React.useState(defaultShowDeleted);
  const navigate = useNavigate();

  const appName = useAppName();
  const appOwner = useAppOwner();

  const onSelectParty = async (party: IParty) => {
    await selectParty(party);
    setUserHasSelectedParty(true);
    navigate('/');
  };

  const filteredParties = partiesAllowedToInstantiate.filter(
    (party) => party.name.toUpperCase().includes(filterString.toUpperCase()) && !(party.isDeleted && !showDeleted),
  );

  const hasMoreParties = filteredParties.length > numberOfPartiesShown;
  const partiesSubset = filteredParties.slice(0, numberOfPartiesShown);

  function renderParties() {
    return (
      <>
        {partiesSubset.map((party, index) => (
          <AltinnParty
            key={index}
            party={party}
            onSelectParty={onSelectParty}
            showSubUnits={showSubUnits}
          />
        ))}
        {hasMoreParties ? (
          <Flex
            container
            direction='row'
          >
            <Button
              variant='secondary'
              onClick={() => setNumberOfPartiesShown(numberOfPartiesShown + 4)}
            >
              <PlusIcon
                fontSize='1rem'
                aria-hidden
              />
              <Lang id='party_selection.load_more' />
            </Button>
          </Flex>
        ) : null}
      </>
    );
  }

  const onFilterStringChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterString(event.target.value);
  };

  const toggleShowDeleted = () => {
    setShowDeleted(!showDeleted);
  };

  const toggleShowSubUnits = () => {
    setShowSubUnits(!showSubUnits);
  };

  return (
    <InstantiationContainer>
      <title>{`${getPageTitle(appName, langAsString('party_selection.header'), appOwner)}`}</title>
      <Flex
        container
        direction='row'
        style={{
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        <Heading
          level={1}
          className={classes.title}
        >
          <Lang id='party_selection.header' />
        </Heading>
        {errorCode === '403' && <TemplateErrorMessage selectedParty={selectedParty} />}
      </Flex>
      <Flex
        container
        direction='column'
        className={classes.searchFieldContainer}
      >
        <Input
          size='md'
          aria-label={langAsString('party_selection.search_placeholder')}
          placeholder={langAsString('party_selection.search_placeholder')}
          onChange={onFilterStringChange}
          value={filterString}
          inputMode='search'
        />
      </Flex>
      <Flex
        container
        direction='column'
      >
        <Flex
          container
          justifyContent='space-between'
          direction='row'
          className={classes.subTitleContainer}
        >
          <Flex item>
            <Paragraph className={cn(classes.subTitle, classes.padding)}>
              <Lang id='party_selection.subheader' />
            </Paragraph>
          </Flex>

          <Flex item>
            <Flex
              container
              direction='row'
              className={cn(classes.checkboxContainer, classes.padding)}
            >
              <Flex item>
                <Checkbox
                  data-size='sm'
                  value='showDeleted'
                  checked={showDeleted}
                  onChange={toggleShowDeleted}
                  label={<Lang id='party_selection.show_deleted' />}
                />
              </Flex>
              <Flex item>
                <Checkbox
                  data-size='sm'
                  value='showSubUnits'
                  checked={showSubUnits}
                  onChange={toggleShowSubUnits}
                  label={<Lang id='party_selection.show_sub_unit' />}
                />
              </Flex>
            </Flex>
          </Flex>
        </Flex>
        {renderParties()}
        {errorCode === 'explained' && (
          <Flex style={{ padding: 12 }}>
            <Heading
              level={2}
              data-size='md'
              style={{ fontSize: '1.5rem', fontWeight: '500', marginBottom: 12 }}
            >
              <Lang id='party_selection.why_seeing_this' />
            </Heading>
            <Paragraph>
              <Lang
                id={
                  appPromptForPartyOverride === 'always'
                    ? 'party_selection.seeing_this_override'
                    : 'party_selection.seeing_this_preference'
                }
              />
            </Paragraph>
          </Flex>
        )}
      </Flex>
    </InstantiationContainer>
  );
};

function TemplateErrorMessage({ selectedParty }: { selectedParty: IParty | undefined }) {
  const appMetadata = useApplicationMetadata();
  const { langAsString } = useLanguage();

  return (
    <Paragraph
      data-testid={`error-code-${HttpStatusCodes.Forbidden}`}
      className={classes.error}
      id='party-selection-error'
    >
      {!selectedParty ? (
        <Lang id='party_selection.invalid_selection_non_existing_party' />
      ) : (
        <Lang
          id='party_selection.invalid_selection_existing_party'
          params={[getRepresentedPartyName({ selectedParty }), templatePartyTypesString({ appMetadata, langAsString })]}
        />
      )}
    </Paragraph>
  );
}

function getRepresentedPartyName({ selectedParty }: { selectedParty: IParty | undefined }): string {
  if (!selectedParty || selectedParty.name === null) {
    return '';
  }
  return capitalizeName(selectedParty.name);
}

function templatePartyTypesString({
  appMetadata,
  langAsString,
}: {
  appMetadata: ApplicationMetadata;
  langAsString: (id: string) => string;
}): string {
  /*
      This method we always return the strings in an order of:
      1. private person
      2. organisation
      3. sub unit
      4. bankruptcy state
    */
  const { partyTypesAllowed } = appMetadata ?? {};
  const partyTypes: string[] = [];
  const allDisallowed = Object.values(partyTypesAllowed).every((value) => !value);

  let returnString = '';

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

  for (let i = 0; i < partyTypes.length; i++) {
    if (i === 0) {
      returnString += partyTypes[i];
    } else if (i === partyTypes.length - 1) {
      returnString += ` ${langAsString('party_selection.binding_word')} ${partyTypes[i]}`;
    } else {
      returnString += `, ${partyTypes[i]} `;
    }
  }

  return returnString;
}
