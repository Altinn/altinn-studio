import { useQuery, UseQueryResult } from "@tanstack/react-query"
import { useServicesContext } from "app-shared/contexts/ServicesContext";
import { QueryKey } from "app-shared/types/QueryKey";

export const useResourceSectorsQuery = (org: string): UseQueryResult<any> => {
  const { getResourceSectors } = useServicesContext();

  return useQuery<any>(
    [QueryKey.ResourceSectors, org],
    () => getResourceSectors(org)
  )
}
