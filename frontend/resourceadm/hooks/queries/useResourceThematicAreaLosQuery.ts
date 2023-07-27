import { useQuery, UseQueryResult } from "@tanstack/react-query"
import { useServicesContext } from "app-shared/contexts/ServicesContext";
import { QueryKey } from "app-shared/types/QueryKey";

export const useResourceThematicAreaLosQuery = (org: string): UseQueryResult<any> => {
  const { getResourceThematicLos } = useServicesContext();

  return useQuery<any>(
    [QueryKey.ResourceThematicLos, org],
    () => getResourceThematicLos(org)
    )
}
