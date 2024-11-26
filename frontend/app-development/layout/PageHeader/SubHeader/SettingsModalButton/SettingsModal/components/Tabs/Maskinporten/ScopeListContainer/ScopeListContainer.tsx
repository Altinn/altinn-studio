import React, { type ReactElement } from 'react';
import { StudioSpinner } from '@studio/components';
import { useGetScopesQuery } from 'app-development/hooks/queries/useGetScopesQuery';
import { useTranslation } from 'react-i18next';
import { useGetSelectedScopesQuery } from 'app-development/hooks/queries/useGetSelectedScopesQuery';
import { NoScopesAlert } from './NoScopesAlert';
import { ScopeList } from './ScopeList';

export const ScopeListContainer = (): ReactElement => {
  const { t } = useTranslation();
  const { data: maskinPortenScopes, isPending: isPendingMaskinportenScopes } = useGetScopesQuery();
  const { data: selectedScopes, isPending: isPendingAppScopes } = useGetSelectedScopesQuery();

  const hasScopes: boolean = maskinPortenScopes?.length > 0 || selectedScopes?.length > 0;
  const hasPendingScopeQueries: boolean = isPendingMaskinportenScopes || isPendingAppScopes;

  if (hasPendingScopeQueries) {
    return <StudioSpinner spinnerTitle={t('general.loading')} />;
  }

  if (hasScopes) {
    return <ScopeList maskinPortenScopes={maskinPortenScopes} selectedScopes={selectedScopes} />;
  }

  return <NoScopesAlert />;
};
