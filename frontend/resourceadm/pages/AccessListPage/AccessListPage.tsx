import React from 'react';
import { useTranslation } from 'react-i18next';
import { Alert } from '@digdir/design-system-react';
import { StudioSpinner } from '@studio/components';
import { AccessListDetail } from '../../components/AccessListDetails';
import { useGetAccessListQuery } from '../../hooks/queries/useGetAccessListQuery';
import { getAccessListPageUrl } from '../../utils/urlUtils';
import { useUrlParams } from '../../hooks/useSelectedContext';

export const AccessListPage = (): React.JSX.Element => {
  const { t } = useTranslation();

  const { selectedContext, repo, env, accessListId } = useUrlParams();

  const {
    data: list,
    isLoading: isLoadingList,
    isError: isLoadListError,
  } = useGetAccessListQuery(selectedContext, accessListId, env);

  if (isLoadingList) {
    return <StudioSpinner spinnerText={t('general.loading')} />;
  }

  if (isLoadListError) {
    return <Alert severity='danger'>{t('resourceadm.listadmin_list_load_error')}</Alert>;
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
