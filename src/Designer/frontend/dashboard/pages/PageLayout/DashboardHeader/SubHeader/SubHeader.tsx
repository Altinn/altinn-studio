import React, { type ReactElement } from 'react';
import { GiteaHeader } from 'app-shared/components/GiteaHeader';
import { useSelectedContext } from '../../../../hooks/useSelectedContext';
import { useOrgRepoName } from '../../../../hooks/useOrgRepoName';
import { isOrg } from '../../../../utils/orgUtils';
import { useRepoStatusQuery } from 'app-shared/hooks/queries';
import { StudioSpinner } from '@studio/components';
import { useTranslation } from 'react-i18next';

export const SubHeader = (): ReactElement | null => {
  const { t } = useTranslation();
  const selectedContext = useSelectedContext();
  const orgRepoName = useOrgRepoName();

  const {
    data: repoStatus,
    isLoading,
    error: repoStatusError,
  } = useRepoStatusQuery(selectedContext, orgRepoName, {
    hideDefaultError: !isOrg(selectedContext),
  });

  const hasMergeConflict: boolean = repoStatus?.hasMergeConflict;
  const hasRepoError: boolean = repoStatusError !== null;

  if (isLoading) return <StudioSpinner aria-hidden spinnerTitle={t('general.loading')} />;

  if (!orgRepoName || hasMergeConflict) return null;
  return (
    <GiteaHeader
      hasCloneModal
      hasRepoError={hasRepoError}
      owner={selectedContext}
      repoName={orgRepoName}
    />
  );
};
