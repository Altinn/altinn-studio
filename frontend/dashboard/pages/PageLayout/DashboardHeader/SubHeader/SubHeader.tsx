import React, { type ReactElement } from 'react';
import { GiteaHeader } from 'app-shared/components/GiteaHeader';
import { useSelectedContext } from '../../../../hooks/useSelectedContext';
import { useOrgRepoName } from '../../../../hooks/useOrgRepoName';

export type SubHeaderProps = {
  hasRepoError?: boolean;
};

export const SubHeader = ({ hasRepoError }: SubHeaderProps): ReactElement => {
  const selectedContext = useSelectedContext();
  const orgRepoName = useOrgRepoName();

  if (!orgRepoName) return null;
  return (
    <GiteaHeader
      hasCloneModal
      hasRepoError={hasRepoError}
      owner={selectedContext}
      repoName={orgRepoName}
    />
  );
};
