import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Textfield, Radio } from '@digdir/design-system-react';
import classes from './AccessListMembers.module.css';
import type { AccessList, AccessListMember } from 'app-shared/types/ResourceAdm';
import { FieldWrapper } from '../FieldWrapper';
import { useRemoveAccessListMemberMutation } from '../../hooks/mutations/useRemoveAccessListMemberMutation';
import { useAddAccessListMemberMutation } from '../../hooks/mutations/useAddAccessListMemberMutation';
import { useDebounce } from 'react-use';
import { usePartiesRegistryQuery } from '../../hooks/queries/usePartiesRegistryQuery';
import { useSubPartiesRegistryQuery } from '../../hooks/queries/useSubPartiesRegistryQuery';
import { getPartiesQueryUrl } from '../../utils/urlUtils';
import { StudioSpinner, StudioButton } from '@studio/components';
import { PlusIcon, PlusCircleIcon, MinusCircleIcon } from '@studio/icons';
import { AccessListMembersPaging } from './AccessListMembersPaging';
import { AccessListMembersTable } from './AccessListMembersTable';

const PARTY_SEARCH_TYPE = 'PARTY';
const SUBPARTY_SEARCH_TYPE = 'SUBPARTY';

export interface AccessListMembersProps {
  org: string;
  env: string;
  list: AccessList;
}

export const AccessListMembers = ({
  org,
  env,
  list,
}: AccessListMembersProps): React.JSX.Element => {
  const { t } = useTranslation();

  const [listItems, setListItems] = useState<AccessListMember[]>(list.members ?? []);
  const [isAddMode, setIsAddMode] = useState<boolean>((list.members ?? []).length === 0);
  const [isSubPartySearch, setIsSubPartySearch] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');
  const [searchUrl, setSearchUrl] = useState<string>('');
  useDebounce(
    () => setSearchUrl(searchText ? getPartiesQueryUrl(searchText, isSubPartySearch) : ''),
    500,
    [searchText, isSubPartySearch],
  );

  const { mutate: removeListMember } = useRemoveAccessListMemberMutation(org, list.identifier, env);
  const { mutate: addListMember } = useAddAccessListMemberMutation(org, list.identifier, env);

  const { data: partiesSearchData, isLoading: isLoadingParties } = usePartiesRegistryQuery(
    !isSubPartySearch ? searchUrl : '',
  );
  const { data: subPartiesSearchData, isLoading: isLoadingSubParties } = useSubPartiesRegistryQuery(
    isSubPartySearch ? searchUrl : '',
  );

  const handleAddMember = (memberToAdd: AccessListMember): void => {
    addListMember(memberToAdd.orgNr);
    setListItems((old) => [...old, memberToAdd]);
  };

  const handleRemoveMember = (memberIdToRemove: string): void => {
    removeListMember(memberIdToRemove);
    setListItems((old) => old.filter((x) => x.orgNr !== memberIdToRemove));
  };

  const resultData = partiesSearchData ?? subPartiesSearchData ?? undefined;

  return (
    <FieldWrapper
      label={t('resourceadm.listadmin_list_organizations')}
      description={t('resourceadm.listadmin_list_organizations_description')}
    >
      <AccessListMembersTable
        listItems={listItems}
        buttonNode={
          <>
            {t('resourceadm.listadmin_remove_from_list')}
            <MinusCircleIcon className={classes.buttonIcon} />
          </>
        }
        onButtonClick={(item: AccessListMember) => handleRemoveMember(item.orgNr)}
      />
      {listItems.length === 0 && (
        <Alert severity='info'>{t('resourceadm.listadmin_empty_list')}</Alert>
      )}
      {isAddMode && (
        <>
          <div className={classes.searchWrapper}>
            <FieldWrapper label={t('resourceadm.listadmin_search')} fieldId='party-search'>
              <Textfield
                id='party-search'
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
              />
              <div className={classes.noSearchResults} aria-live='polite'>
                {resultData?.parties?.length === 0 && (
                  <div>
                    {isSubPartySearch
                      ? t('resourceadm.listadmin_search_no_sub_parties')
                      : t('resourceadm.listadmin_search_no_parties')}
                  </div>
                )}
              </div>
            </FieldWrapper>
            <Radio.Group
              hideLegend
              onChange={() => setIsSubPartySearch((old) => !old)}
              value={isSubPartySearch ? SUBPARTY_SEARCH_TYPE : PARTY_SEARCH_TYPE}
              inline
              legend={t('resourceadm.listadmin_search_party_type')}
            >
              <Radio value={PARTY_SEARCH_TYPE}>{t('resourceadm.listadmin_parties')}</Radio>
              <Radio value={SUBPARTY_SEARCH_TYPE}>{t('resourceadm.listadmin_sub_parties')}</Radio>
            </Radio.Group>
          </div>
          <AccessListMembersTable
            isHeaderHidden
            listItems={resultData?.parties ?? []}
            disableButtonFn={(disableItem: AccessListMember) =>
              !!listItems.find((listItem) => disableItem.orgNr === listItem.orgNr)
            }
            buttonNode={
              <>
                {t('resourceadm.listadmin_add_to_list')}
                <PlusCircleIcon className={classes.buttonIcon} />
              </>
            }
            onButtonClick={handleAddMember}
          />
          {(isLoadingParties || isLoadingSubParties) && (
            <div className={classes.spinnerContainer}>
              <StudioSpinner />
            </div>
          )}
          <AccessListMembersPaging resultData={resultData} setSearchUrl={setSearchUrl} />
        </>
      )}
      {!isAddMode && (
        <div className={classes.addMoreWrapper}>
          <StudioButton
            variant='secondary'
            icon={<PlusIcon />}
            iconPlacement='left'
            onClick={() => setIsAddMode(true)}
          >
            {t('resourceadm.listadmin_search_add_more')}
          </StudioButton>
        </div>
      )}
    </FieldWrapper>
  );
};
