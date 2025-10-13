import React, { useEffect, useState as useReactState } from 'react';
import { useMatch, useNavigate } from 'react-router-dom';

import { Checkbox, Heading, Paragraph } from '@digdir/designsystemet-react';
import { PlusIcon } from '@navikt/aksel-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import cn from 'classnames';

import { Button } from 'src/app-components/Button/Button';
import { Flex } from 'src/app-components/Flex/Flex';
import { Input } from 'src/app-components/Input/Input';
import { AltinnParty } from 'src/components/altinnParty';
import { useAppMutations, useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { Loader } from 'src/core/loading/Loader';
import { useAppName, useAppOwner } from 'src/core/texts/appTexts';
import {
  ApplicationMetadataProvider,
  useApplicationMetadata,
} from 'src/features/applicationMetadata/ApplicationMetadataProvider';
import { DataModelsProvider } from 'src/features/datamodel/DataModelsProvider';
import { LayoutSetsProvider } from 'src/features/form/layoutSets/LayoutSetsProvider';
import { InstantiationContainer } from 'src/features/instantiate/containers/InstantiationContainer';
import { NoValidPartiesError } from 'src/features/instantiate/containers/NoValidPartiesError';
import classes from 'src/features/instantiate/containers/PartySelection.module.css';
import { Lang } from 'src/features/language/Lang';
import { useLanguage } from 'src/features/language/useLanguage';
import { NavigationEffectProvider } from 'src/features/navigation/NavigationEffectContext';
import { OrgsProvider } from 'src/features/orgs/OrgsProvider';
import { useSelectedParty } from 'src/features/party/PartiesProvider';
import { flattenParties } from 'src/features/party/partyUtils';
import { AltinnPalette } from 'src/theme/altinnAppTheme';
import { changeBodyBackground } from 'src/utils/bodyStyling';
import { getPageTitle } from 'src/utils/getPageTitle';
import { HttpStatusCodes } from 'src/utils/network/networking';
import { capitalizeName } from 'src/utils/stringHelper';
import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { IParty } from 'src/types/shared';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

export const PartyelectionWrapper = () => (
  <NavigationEffectProvider>
    <OrgsProvider>
      <LayoutSetsProvider>
        <ApplicationMetadataProvider>
          <DataModelsProvider>
            <PartySelection />
          </DataModelsProvider>
        </ApplicationMetadataProvider>
      </LayoutSetsProvider>
    </OrgsProvider>
  </NavigationEffectProvider>
);

export const PartySelection = () => {
  changeBodyBackground(AltinnPalette.white);
  const match = useMatch(`/party-selection/:errorCode`);
  const errorCode = match?.params.errorCode;

  // Fetch parties allowed to instantiate
  const { fetchPartiesAllowedToInstantiate } = useAppQueries();
  const {
    data: partiesData,
    isLoading: isLoadingParties,
    error: partiesError,
  } = useQuery({
    queryKey: ['parties', 'allowedToInstantiate'],
    queryFn: fetchPartiesAllowedToInstantiate,
  });

  // Mutation to set selected party
  const { doSetSelectedParty } = useAppMutations();
  const [sentToMutation, setSentToMutation] = useReactState<IParty | undefined>(undefined);
  const {
    mutateAsync,
    data: dataFromMutation,
    error: mutationError,
  } = useMutation({
    mutationKey: ['doSetSelectedParty'],
    mutationFn: (party: IParty) => doSetSelectedParty(party.partyId),
    onError: (error: HttpClientError) => {
      window.logError('Setting current party failed:\n', error);
    },
  });

  const selectedParty = useSelectedParty();
  const [userHasSelectedParty, setUserHasSelectedParty] = useReactState(false);

  const appMetadata = useApplicationMetadata();

  const { langAsString } = useLanguage();

  const partiesAllowedToInstantiate = flattenParties(partiesData ?? []);

  const defaultShowDeleted = partiesAllowedToInstantiate.every((party) => party.isDeleted);

  const [filterString, setFilterString] = React.useState('');
  const [numberOfPartiesShown, setNumberOfPartiesShown] = React.useState(4);
  const [showSubUnits, setShowSubUnits] = React.useState(true);
  const [showDeleted, setShowDeleted] = React.useState(defaultShowDeleted);
  const navigate = useNavigate();

  const appName = useAppName();
  const appOwner = useAppOwner();
  useEffect(() => {
    if (partiesError) {
      window.logError('Fetching parties failed:\n', partiesError);
    }
  }, [partiesError]);

  if (isLoadingParties) {
    return <Loader reason='parties' />;
  }

  const error = mutationError || partiesError;
  if (error) {
    return <DisplayError error={error} />;
  }

  if (!partiesAllowedToInstantiate.length) {
    return <NoValidPartiesError />;
  }

  // Like on altinn.no, we tick the "show deleted" checkbox by default when the
  // user only has deleted parties to choose from.

  const appPromptForPartyOverride = appMetadata.promptForParty;

  const onSelectParty = async (party: IParty) => {
    try {
      setSentToMutation(party);
      const result = await mutateAsync(party);
      if (result === 'Party successfully updated') {
        setUserHasSelectedParty(true);
        // eslint-disable-next-line react-compiler/react-compiler
        window.location.href = `/${window.org}/${window.app}/instance/${party.partyId}`;
      }
    } catch (_err) {
      // Error is handled by mutation's onError
    }
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
