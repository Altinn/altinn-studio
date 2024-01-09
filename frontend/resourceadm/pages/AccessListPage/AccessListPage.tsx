import React from 'react';
import { useTranslation } from 'react-i18next';
import { StudioSpinner } from '@studio/components';
import { AccessListDetail } from 'resourceadm/components/AccessListDetails';
import { useGetAccessListQuery } from 'resourceadm/hooks/queries/useGetAccessListQuery';
import { getAccessListPageUrl } from 'resourceadm/utils/urlUtils';
import { useUrlParams } from 'resourceadm/hooks/useSelectedContext';

export const AccessListPage = (): React.ReactNode => {
  const { t } = useTranslation();

  const { selectedContext, repo, env, accessListId } = useUrlParams();

  const { data: list, isLoading: isLoadingList } = useGetAccessListQuery(
    selectedContext,
    accessListId,
    env,
  );

  if (isLoadingList) {
    return <StudioSpinner spinnerText={t('general.loading')} />;
  }

  return (
    <AccessListDetail
      org={selectedContext}
      env={env}
      list={list}
      backUrl={getAccessListPageUrl(selectedContext, repo, env)}
    />
  );
};
