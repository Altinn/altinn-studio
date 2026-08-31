import { useOrgListQuery } from 'app-development/hooks/queries';
import { useRepoMetadataQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export const useIsRepoOwnerOrg = (): boolean => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: orgs } = useOrgListQuery();
  const { data: repository } = useRepoMetadataQuery(org, app);

  const repositoryOwner = repository?.owner?.login;

  return Boolean(orgs && Object.keys(orgs).includes(repositoryOwner));
};
