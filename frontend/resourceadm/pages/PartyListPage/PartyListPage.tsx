import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioSpinner } from '@studio/components';
import { PartyListDetail } from 'resourceadm/components/PartyListDetails';
import { useGetPartyListQuery } from 'resourceadm/hooks/queries/useGetPartyList';
import { getPartyListPageUrl } from 'resourceadm/utils/urlUtils';
import { useUrlParams } from 'resourceadm/hooks/useSelectedContext';

export const PartyListPage = (): React.ReactNode => {
  const { t } = useTranslation();

  const { selectedContext, repo, env, listId } = useUrlParams();

  const { data: list, isLoading: isLoadingList } = useGetPartyListQuery(
    selectedContext,
    listId,
    env,
  );

  if (isLoadingList) {
    return <StudioSpinner spinnerText={t('general.loading')} />;
  }

  return (
    <PartyListDetail
      org={selectedContext}
      env={env}
      list={list}
      backUrl={getPartyListPageUrl(selectedContext, repo, env)}
    />
  );
};
