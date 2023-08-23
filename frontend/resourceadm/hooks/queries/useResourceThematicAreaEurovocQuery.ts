import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { ResourceThematic } from 'app-shared/types/ResourceAdm';

/**
 * Query to get the list of thematic area eurovoc for the resource. It only returns the
 * uri of the eurovoc from backend.
 *
 * @param org the organisation of the user
 *
 * @returns UseQueryResult with a list of thematic areas of ResourceThematic
 */
export const useResourceThematicAreaEurovocQuery = (
  org: string
): UseQueryResult<ResourceThematic[]> => {
  const { getResourceThematicEurovoc } = useServicesContext();

  return useQuery<ResourceThematic[]>(
    [QueryKey.ResourceThematicEurovoc, org],
    () => getResourceThematicEurovoc(org),
    {
      select: (data) =>
        data.map((d) => ({
          uri: d.uri,
        })),
    }
  );
};
