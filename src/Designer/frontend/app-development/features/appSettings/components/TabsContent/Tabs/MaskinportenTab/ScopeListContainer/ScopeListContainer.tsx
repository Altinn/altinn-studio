import React, { type ReactElement } from 'react';
import { StudioSpinner } from 'libs/studio-components/src';
import { useGetScopesQuery } from '../../../../../../../hooks/queries/useGetScopesQuery';
import { useTranslation } from 'react-i18next';
import { useGetSelectedScopesQuery } from '../../../../../../../hooks/queries/useGetSelectedScopesQuery';
import { NoScopesAlert } from './NoScopesAlert';
import { ScopeList } from './ScopeList';

export function ScopeListContainer(): ReactElement {
  const { t } = useTranslation();
  const { data: maskinPortenScopes, isPending: isPendingMaskinportenScopes } = useGetScopesQuery();
  const { data: selectedScopes, isPending: isPendingAppScopes } = useGetSelectedScopesQuery();

  const hasScopes: boolean =
    maskinPortenScopes?.scopes?.length > 0 || selectedScopes?.scopes?.length > 0;
  const hasPendingScopeQueries: boolean = isPendingMaskinportenScopes || isPendingAppScopes;

  if (hasPendingScopeQueries) {
    return <StudioSpinner aria-hidden spinnerTitle={t('general.loading')} />;
  }

  if (hasScopes) {
    return (
      <ScopeList
        maskinPortenScopes={maskinPortenScopes?.scopes ?? []}
        selectedScopes={selectedScopes?.scopes ?? []}
      />
    );
  }

  return <NoScopesAlert />;
}
