import { Button, Heading, Spinner, Textfield } from '@digdir/design-system-react';
import { BrregOrganization, PartyListMember } from 'app-shared/types/ResourceAdm';
import React, { useState } from 'react';
import { useDebounce } from 'react-use';
import {
  useEnhetsregisterOrganizationQuery,
  useEnhetsregisterUnderOrganizationQuery,
} from 'resourceadm/hooks/queries/useEnhetsregisterOrganizationQuery';

interface PartyListSearchProps {
  handleAddMember: (org: PartyListMember) => void;
}

// TODO: filtrer/disable enheter som allerede finnes
const enhetsListe = (
  enheter: BrregOrganization[],
  erUnderenhet: boolean,
  onSelectEnhet: (org: PartyListMember) => void,
): React.ReactNode => {
  if (enheter.length === 0) {
    return <div>{erUnderenhet ? 'Fant ingen underenheter' : 'Fant ingen enheter'}</div>;
  }
  return (
    <>
      <Heading level={2} size='medium'>
        {erUnderenhet ? 'Underenheter' : 'Enheter'}
      </Heading>
      {enheter.map((org) => {
        return (
          <Button
            key={org.organisasjonsnummer}
            size='small'
            variant='tertiary'
            onClick={() => {
              onSelectEnhet({
                orgNr: org.organisasjonsnummer,
                orgName: org.navn,
                isUnderenhet: erUnderenhet,
              });
            }}
          >
            {`${org.organisasjonsnummer} - ${org.navn}`}
          </Button>
        );
      })}
    </>
  );
};

export const PartyListSearch = ({ handleAddMember }: PartyListSearchProps): React.ReactNode => {
  const [searchText, setSearchText] = useState<string>('');
  const [debouncedSearchText, setDebouncedSearchText] = useState<string>('');
  useDebounce(() => setDebouncedSearchText(searchText), 500, [searchText]);

  const { data: enheterSearchData, isLoading: isLoadingEnheterSearch } =
    useEnhetsregisterOrganizationQuery(debouncedSearchText);
  const { data: underenheterSearchData, isLoading: isLoadingUnderenheterSearch } =
    useEnhetsregisterUnderOrganizationQuery(debouncedSearchText);

  return (
    <div>
      <Textfield
        value={searchText}
        placeholder='søk etter enhet'
        onChange={(event) => {
          setSearchText(event.target.value);
        }}
      />
      {(isLoadingEnheterSearch || isLoadingUnderenheterSearch) && debouncedSearchText && (
        <Spinner size='xlarge' variant='interaction' title='Laster...' />
      )}
      {debouncedSearchText.length > 0 &&
        !isLoadingEnheterSearch &&
        !isLoadingUnderenheterSearch && (
          <div>
            {enhetsListe(enheterSearchData?._embedded?.enheter || [], false, handleAddMember)}
            {enhetsListe(
              underenheterSearchData?._embedded?.underenheter || [],
              true,
              handleAddMember,
            )}
          </div>
        )}
    </div>
  );
};
