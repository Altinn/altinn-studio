import React, { useEffect } from 'react';
import { StudioPageSpinner } from '@studio/components';
import { gitCommitPath } from 'app-shared/api/paths';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useBranchStatusQuery } from 'app-development/hooks/queries';
import { useTranslation } from 'react-i18next';

export const LatestCommit = (): React.ReactElement => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { data: newMasterBranchStatus } = useBranchStatusQuery(org, app, 'master');
  const latestCommitId = newMasterBranchStatus?.commit?.id;

  useEffect(() => {
    if (latestCommitId) {
      const commitPath = gitCommitPath(org, app, latestCommitId);
      window.location.href = commitPath;
    }
  }, [app, latestCommitId, org]);
  return <StudioPageSpinner spinnerTitle={t('process_editor.loading')} />;
};
