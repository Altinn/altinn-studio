import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { DeploymentsResponse } from 'app-shared/types/api/DeploymentsResponse';

export type IsPublishedQueryResult = {
  /** Undefined while loading, or when the deployments cannot be fetched. */
  isPublished?: boolean;
  isPending: boolean;
};

/** Whether any version of the app is deployed to an environment. */
export const useIsPublishedQuery = (org: string, app: string): IsPublishedQueryResult => {
  const { getDeployments } = useServicesContext();
  const { data, isPending, isError } = useQuery<DeploymentsResponse>({
    queryKey: [QueryKey.AppDeployments, org, app],
    queryFn: () => getDeployments(org, app),
    // The answer only decides a default, so a failure is not worth an error message.
    meta: { hideDefaultError: true },
  });

  if (isPending) return { isPending: true };
  if (isError || !data) return { isPending: false };
  const deployments = data.kubernetesDeploymentList ?? [];
  return { isPublished: deployments.some(({ version }) => Boolean(version)), isPending: false };
};
