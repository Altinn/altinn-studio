import { useQuery, UseQueryResult } from "@tanstack/react-query"
import { useServicesContext } from "app-shared/contexts/ServicesContext";
import { QueryKey } from "app-shared/types/QueryKey";
import { ResourceSectorType } from "resourceadm/types/global";

export const useResourceSectorsQuery = (org: string): UseQueryResult<ResourceSectorType[]> => {
  const { getResourceSectors } = useServicesContext();

  return useQuery<ResourceSectorType[]>(
    [QueryKey.ResourceSectors, org],
    () => getResourceSectors(org), { select: (data) => data.map(d => ({
      code: d.code,
      label: d.label
    })) }
  )
}
