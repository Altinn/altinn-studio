import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { DeployWarnings } from 'app-shared/types/api/DeployWarnings';

/**
 * Asks what the user should know before deploying the release to the environment, once a release is chosen, so the
 * answer is usually there when the deploy confirmation opens.
 * @param appDeployedVersion The version that runs in the environment. A deploy that changes it asks again, so the
 * confirmation does not compare with a version that no longer runs.
 */
export const useDeployWarningsQuery = (
  owner: string,
  app: string,
  envName: string,
  tagName: string,
  appDeployedVersion: string | undefined,
): UseQueryResult<DeployWarnings> => {
  const { getDeployWarnings } = useServicesContext();
  return useQuery<DeployWarnings>({
    queryKey: [QueryKey.DeployWarnings, owner, app, envName, tagName, appDeployedVersion],
    queryFn: () => getDeployWarnings(owner, app, tagName, envName),
    enabled: !!tagName,
    // Without the warnings, the confirmation shows as it did before them, so a failed check needs no error message.
    meta: { hideDefaultError: true },
  });
};
