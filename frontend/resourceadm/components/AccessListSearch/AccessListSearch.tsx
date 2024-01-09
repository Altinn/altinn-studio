import React, { useState } from 'react';
import { useDebounce } from 'react-use';
import { useTranslation } from 'react-i18next';
import { Button, Heading, Spinner, Textfield } from '@digdir/design-system-react';
import { BrregOrganization, AccessListMember } from 'app-shared/types/ResourceAdm';
import { usePartiesRegistryQuery } from 'resourceadm/hooks/queries/usePartiesRegistryQuery';
import { useSubPartiesRegistryQuery } from 'resourceadm/hooks/queries/useSubPartiesRegistryQuery';

interface AccessListSearchProps {
  existingMembers: AccessListMember[];
  handleAddMember: (org: AccessListMember) => void;
}

export const AccessListSearch = ({
  existingMembers,
  handleAddMember,
}: AccessListSearchProps): React.ReactNode => {
  const { t } = useTranslation();

  const [searchText, setSearchText] = useState<string>('');
  const [debouncedSearchText, setDebouncedSearchText] = useState<string>('');
  useDebounce(() => setDebouncedSearchText(searchText), 500, [searchText]);

  const { data: partiesSearchData, isLoading: isLoadingPartiesSearch } =
    usePartiesRegistryQuery(debouncedSearchText);
  const { data: subPartiesSearchData, isLoading: isLoadingSubPartiesSearch } =
    useSubPartiesRegistryQuery(debouncedSearchText);

  const renderPartiesList = (
    parties: BrregOrganization[],
    isSubParty: boolean,
  ): React.ReactNode => {
    if (parties.length === 0) {
      return (
        <div>
          {isSubParty
            ? t('resourceadm.listadmin_search_no_sub_parties')
            : t('resourceadm.listadmin_search_no_parties')}
        </div>
      );
    }
    return (
      <>
        <Heading level={2} size='medium'>
          {isSubParty ? t('resourceadm.listadmin_sub_parties') : t('resourceadm.listadmin_parties')}
        </Heading>
        {parties.map((org) => {
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
                  isSubParty: isSubParty,
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
        data-testid='party-search'
        value={searchText}
        placeholder={t('resourceadm.listadmin_search')}
        onChange={(event) => setSearchText(event.target.value)}
      />
      {(isLoadingPartiesSearch || isLoadingSubPartiesSearch) && debouncedSearchText && (
        <Spinner size='xlarge' variant='interaction' title={t('general.loading')} />
      )}
      {debouncedSearchText.length > 0 && !isLoadingPartiesSearch && !isLoadingSubPartiesSearch && (
        <div>
          {renderPartiesList(partiesSearchData?._embedded?.enheter || [], false)}
          {renderPartiesList(subPartiesSearchData?._embedded?.underenheter || [], true)}
        </div>
      )}
    </div>
  );
};
