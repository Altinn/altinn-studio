import { Button, Heading, Spinner, Textfield } from '@digdir/design-system-react';
import { BrregOrganization, PartyListMember } from 'app-shared/types/ResourceAdm';
import React, { useState } from 'react';
import { useDebounce } from 'react-use';
import {
  useEnhetsregisterOrganizationQuery,
  useEnhetsregisterUnderOrganizationQuery,
} from 'resourceadm/hooks/queries/useEnhetsregisterOrganizationQuery';

interface PartyListSearchProps {
  existingMembers: PartyListMember[];
  handleAddMember: (org: PartyListMember) => void;
}

export const PartyListSearch = ({
  existingMembers,
  handleAddMember,
}: PartyListSearchProps): React.ReactNode => {
  const [searchText, setSearchText] = useState<string>('');
  const [debouncedSearchText, setDebouncedSearchText] = useState<string>('');
  useDebounce(() => setDebouncedSearchText(searchText), 500, [searchText]);

  const { data: enheterSearchData, isLoading: isLoadingEnheterSearch } =
    useEnhetsregisterOrganizationQuery(debouncedSearchText);
  const { data: underenheterSearchData, isLoading: isLoadingUnderenheterSearch } =
    useEnhetsregisterUnderOrganizationQuery(debouncedSearchText);

  const renderEnhetsliste = (
    enheter: BrregOrganization[],
    erUnderenhet: boolean,
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
              disabled={existingMembers.some((x) => x.orgNr === org.organisasjonsnummer)}
              onClick={() => {
                handleAddMember({
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
            {renderEnhetsliste(enheterSearchData?._embedded?.enheter || [], false)}
            {renderEnhetsliste(underenheterSearchData?._embedded?.underenheter || [], true)}
          </div>
        )}
    </div>
  );
};
