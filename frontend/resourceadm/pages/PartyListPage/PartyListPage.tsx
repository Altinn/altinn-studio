import React from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StudioSpinner } from '@studio/components';
import { PartyListDetail } from 'resourceadm/components/PartyListDetails/PartyListDetail';
import { useGetPartyListQuery } from 'resourceadm/hooks/queries/useGetPartyList';
import { getPartyListPageUrl } from 'resourceadm/utils/urlUtils/urlUtils';

export const PartyListPage = (): React.ReactNode => {
  const { t } = useTranslation();

  const { selectedContext, env, listId } = useParams();
  const repo = `${selectedContext}-resources`;

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
