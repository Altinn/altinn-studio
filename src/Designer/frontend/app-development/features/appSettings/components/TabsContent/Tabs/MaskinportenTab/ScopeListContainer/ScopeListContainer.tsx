import type { ReactElement } from 'react';
import { StudioSpinner } from '@studio/components';
import { isAxiosError } from 'axios';
import { useGetScopesQuery } from 'app-development/hooks/queries/useGetScopesQuery';
import { useTranslation } from 'react-i18next';
import { useGetSelectedScopesQuery } from 'app-development/hooks/queries/useGetSelectedScopesQuery';
import { NoScopesAlert } from './NoScopesAlert';
import { NoOrgAccessAlert } from './NoOrgAccessAlert';
import { ScopeList } from './ScopeList';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppVersionQuery } from 'app-shared/hooks/queries';
import { shouldShowDefaultMaskinportenScopesOptIn } from 'app-development/utils/maskinportenScopes';
import { ServerCodes } from 'app-shared/enums/ServerCodes';

export function ScopeListContainer(): ReactElement {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const {
    data: maskinPortenScopes,
    isPending: isPendingMaskinportenScopes,
    error: maskinportenScopesError,
  } = useGetScopesQuery();
  const { data: selectedScopes, isPending: isPendingAppScopes } = useGetSelectedScopesQuery();
  const { data: appVersion, isPending: isPendingAppVersion } = useAppVersionQuery(org, app);

  const hasScopes: boolean =
    maskinPortenScopes?.scopes?.length > 0 || selectedScopes?.scopes?.length > 0;
  const shouldShowDefaultScopesOptIn: boolean = shouldShowDefaultMaskinportenScopesOptIn(
    appVersion?.backendVersion,
    selectedScopes,
  );
  const hasPendingScopeQueries: boolean =
    isPendingMaskinportenScopes || isPendingAppScopes || (!hasScopes && isPendingAppVersion);

  if (hasPendingScopeQueries) {
    return <StudioSpinner aria-hidden spinnerTitle={t('general.loading')} />;
  }

  if (isForbiddenError(maskinportenScopesError)) {
    return <NoOrgAccessAlert />;
  }

  if (hasScopes || shouldShowDefaultScopesOptIn) {
    return (
      <ScopeList
        maskinPortenScopes={maskinPortenScopes?.scopes ?? []}
        selectedScopes={selectedScopes?.scopes ?? []}
      />
    );
  }

  return <NoScopesAlert />;
}

function isForbiddenError(error: unknown): boolean {
  return isAxiosError(error) && error.response?.status === ServerCodes.Forbidden;
}
