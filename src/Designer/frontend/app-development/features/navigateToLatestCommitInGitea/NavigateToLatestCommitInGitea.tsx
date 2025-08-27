import React, { useEffect } from 'react';
import { StudioPageSpinner } from '@studio/components-legacy';
import { gitCommitPath } from 'app-shared/api/paths';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useBranchStatusQuery } from 'app-development/hooks/queries';
import { useTranslation } from 'react-i18next';

export const NavigateToLatestCommitInGitea = (): React.ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: masterBranchStatus } = useBranchStatusQuery(org, app, 'master');
  const latestCommitId = masterBranchStatus?.commit?.id;

  useEffect(() => {
    if (latestCommitId) {
      window.location.href = gitCommitPath(org, app, latestCommitId);
    }
  }, [app, latestCommitId, org]);
  return <StudioPageSpinner spinnerTitle={t('general.loading')} />;
};
