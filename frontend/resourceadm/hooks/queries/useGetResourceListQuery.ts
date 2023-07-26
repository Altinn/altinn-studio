import { useQuery, UseQueryResult } from "@tanstack/react-query"
import { useServicesContext } from "app-shared/contexts/ServicesContext";
import { QueryKey } from "app-shared/types/QueryKey";
import { ResourceType } from "resourceadm/types/global";
import { sortResourceListByDateAndMap } from "resourceadm/utils/mapperUtils";

// Maps the date and filters it
export const useGetResourceListQuery = (org: string): UseQueryResult<ResourceType[]> =>  {
  const { getResourceList } = useServicesContext();

  return useQuery<ResourceType[]>(
    [QueryKey.ResourceList, org],
    () => getResourceList(org), { select: (data) => sortResourceListByDateAndMap(data) }
  )
}
