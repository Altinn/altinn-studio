import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { MigrateDelegationsRequest } from 'app-shared/types/ResourceAdm';

/**
 * Mutation to set migration time for delegation migration from Altinn 2 to Altinn 3
 *
 * @param org the organisation of the user
 * @param repo the repo the user is in
 * @param id the id of the resource
 */
export const useMigrateDelegationsMutation = (org: string, env: string) => {
  const { migrateDelegations } = useServicesContext();

  return useMutation({
    mutationFn: (payload: MigrateDelegationsRequest) => migrateDelegations(org, env, payload),
  });
};
