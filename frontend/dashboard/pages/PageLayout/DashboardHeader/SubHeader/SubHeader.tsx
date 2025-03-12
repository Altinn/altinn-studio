import React, { type ReactElement } from 'react';
import { GiteaHeader } from 'app-shared/components/GiteaHeader';
import { REPO_NAME_TTD_FOR_CODELISTS } from '../../../../constants';
import { useSelectedContext } from 'dashboard/hooks/useSelectedContext';

export type SubHeaderProps = {
  hasRepoError?: boolean;
};

export const SubHeader = ({ hasRepoError }: SubHeaderProps): ReactElement => {
  const selectedContext = useSelectedContext();
  return (
    <GiteaHeader
      hasCloneModal
      hasRepoError={hasRepoError}
      owner={selectedContext}
      repoName={REPO_NAME_TTD_FOR_CODELISTS}
    />
  );
};
