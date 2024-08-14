import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { Alert, Textfield, Radio } from '@digdir/designsystemet-react';
import classes from './AccessListMembers.module.css';
import type { AccessList, AccessListMember, ResourceError } from 'app-shared/types/ResourceAdm';
import { FieldWrapper } from '../FieldWrapper';
import { useRemoveAccessListMemberMutation } from '../../hooks/mutations/useRemoveAccessListMemberMutation';
import { useAddAccessListMemberMutation } from '../../hooks/mutations/useAddAccessListMemberMutation';
import { usePartiesRegistryQuery } from '../../hooks/queries/usePartiesRegistryQuery';
import { useSubPartiesRegistryQuery } from '../../hooks/queries/useSubPartiesRegistryQuery';
import { getPartiesQueryUrl } from '../../utils/urlUtils';
import { StudioButton, useDebounce } from '@studio/components';
import { PlusIcon } from '@studio/icons';
import { AccessListMembersPaging } from './AccessListMembersPaging';
import { AccessListMembersTable } from './AccessListMembersTable';
import { isOrgNrString } from '../../utils/stringUtils';
import { useGetAccessListMembersQuery } from '../../hooks/queries/useGetAccessListMembersQuery';
import { ServerCodes } from 'app-shared/enums/ServerCodes';
import { AccessListPreconditionFailedToast } from '../AccessListPreconditionFailedToast';

const PARTY_SEARCH_TYPE = 'PARTY';
const SUBPARTY_SEARCH_TYPE = 'SUBPARTY';
const INVALID_ORG_ERROR_CODE = 'RR-00001';

export interface AccessListMembersProps {
  org: string;
  env: string;
  list: AccessList;
  latestEtag: string;
  setLatestEtag: (newETag: string) => void;
}

export const AccessListMembers = ({
  org,
  env,
  list,
  latestEtag,
  setLatestEtag,
}: AccessListMembersProps): React.JSX.Element => {
  const { t } = useTranslation();

  // if list has more than 100 members and not all are loaded, keep added members in local array for display
  const [localItems, setLocalItems] = useState<AccessListMember[]>([]);
  const [invalidOrgnrs, setInvalidOrgnrs] = useState<string[]>([]);
  const [isAddMode, setIsAddMode] = useState<boolean>(false);
  const [isSubPartySearch, setIsSubPartySearch] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>('');
  const [searchUrl, setSearchUrl] = useState<string>('');
  const { debounce } = useDebounce({ debounceTimeInMs: 500 });
  debounce(() => setSearchUrl(searchText ? getPartiesQueryUrl(searchText, isSubPartySearch) : ''));

  const { mutate: removeListMember, isPending: isRemovingMember } =
    useRemoveAccessListMemberMutation(org, list.identifier, env);
  const { mutate: addListMember, isPending: isAddingNewListMember } =
    useAddAccessListMemberMutation(org, list.identifier, env);

  const { data: partiesSearchData } = usePartiesRegistryQuery(!isSubPartySearch ? searchUrl : '');
  const { data: subPartiesSearchData } = useSubPartiesRegistryQuery(
    isSubPartySearch ? searchUrl : '',
  );
  const {
    data: members,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useGetAccessListMembersQuery(org, list.identifier, env);

  useEffect(() => {
    if (members?.pages?.length === 0) {
      setIsAddMode(true);
    }
  }, [members]);

  const checkForEtagVersionError = (error: Error): void => {
    if ((error as ResourceError).response.status === ServerCodes.PreconditionFailed) {
      toast.error(<AccessListPreconditionFailedToast />);
    }
  };

  const handleAddMember = (memberToAdd: AccessListMember): void => {
    addListMember(
      { data: [memberToAdd.orgNr], etag: latestEtag },
      {
        onSuccess: (data) => {
          setLatestEtag(data.etag);
          setLocalItems((prev) => [...prev, memberToAdd]);
        },
        onError: (error: Error) => {
          if (
            ((error as ResourceError).response?.data as { code: string }).code ===
            INVALID_ORG_ERROR_CODE
          ) {
            setInvalidOrgnrs((old) => [...old, memberToAdd.orgNr]);
          } else {
            checkForEtagVersionError(error);
          }
        },
      },
    );
  };

  const handleRemoveMember = (memberIdToRemove: string): void => {
    removeListMember(
      { data: [memberIdToRemove], etag: latestEtag },
      {
        onSuccess: (data) => {
          setLatestEtag(data.etag);
          setLocalItems((prev) => prev.filter((item) => item.orgNr !== memberIdToRemove));
        },
        onError: (error: Error) => {
          checkForEtagVersionError(error);
        },
      },
    );
  };

  const getResultData = () => {
    if (
      (partiesSearchData?.parties?.length === 0 || subPartiesSearchData?.parties?.length === 0) &&
      isOrgNrString(searchText) &&
      env !== 'prod'
    ) {
      return {
        parties: [
          {
            orgNr: searchText,
            orgName: t('resourceadm.listadmin_list_tenor_org'),
            isSubParty: false,
          },
        ],
      };
    } else if (partiesSearchData) {
      return partiesSearchData;
    } else if (subPartiesSearchData) {
      return subPartiesSearchData;
    } else {
      return undefined;
    }
  };

  const getMergedMembersData = (): AccessListMember[] => {
    const returnData = [...(members?.pages ?? [])];
    // if hasNextPage is true, there are more members in the list that can be shown. Always show newly added items
    if (hasNextPage) {
      localItems.forEach((localItem) => {
        if (!returnData.some((member) => member.orgNr === localItem.orgNr)) {
          returnData.push(localItem);
        }
      });
    }
    return returnData;
  };

  const resultData = getResultData();

  return (
    <FieldWrapper
      label={t('resourceadm.listadmin_list_organizations')}
      description={t('resourceadm.listadmin_list_organizations_description')}
    >
      <AccessListMembersTable
        listItems={getMergedMembersData()}
        isLoading={isRemovingMember}
        onButtonClick={(item: AccessListMember) => handleRemoveMember(item.orgNr)}
      />
      {hasNextPage && (
        <StudioButton
          disabled={isFetchingNextPage}
          variant='tertiary'
          onClick={() => fetchNextPage()}
        >
          {t('resourceadm.listadmin_load_more', {
            unit: t('resourceadm.listadmin_member_unit'),
          })}
        </StudioButton>
      )}
      {!!members && members.pages?.length === 0 && (
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
            isLoading={isAddingNewListMember}
            disabledItems={getMergedMembersData()}
            invalidItems={invalidOrgnrs}
            isAdd
            onButtonClick={handleAddMember}
          />
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
            size='medium'
          >
            {t('resourceadm.listadmin_search_add_more')}
          </StudioButton>
        </div>
      )}
    </FieldWrapper>
  );
};
