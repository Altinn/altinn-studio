import { useQuery, UseQueryResult } from "@tanstack/react-query";
import { useServicesContext } from "app-shared/contexts/ServicesContext";
import { QueryKey } from "app-shared/types/QueryKey";
import type { ResourceThematic } from "app-shared/types/ResourceAdm";

/**
 * Query to get the list of thematic area eurovoc for the los. It only returns the
 * uri of the eurovoc from backend.
 *
 * @param org the organisation of the user
 *
 * @returns UseQueryResult with a list of thematic areas of ResourceThematic
 */
export const useResourceThematicAreaLosQuery = (
  org: string
): UseQueryResult<ResourceThematic[]> => {
  const { getResourceThematicLos } = useServicesContext();

  return useQuery<ResourceThematic[]>(
    [QueryKey.ResourceThematicLos, org],
    () => getResourceThematicLos(org),
    {
      select: (data) =>
        data.map((d) => ({
          uri: d.uri,
        })),
    }
  );
};
