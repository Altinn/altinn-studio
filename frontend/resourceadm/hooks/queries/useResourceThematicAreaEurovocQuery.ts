import { useQuery, UseQueryResult } from "@tanstack/react-query"
import { useServicesContext } from "app-shared/contexts/ServicesContext";
import { QueryKey } from "app-shared/types/QueryKey";

// TODO - Add type once agreement reached on which details to show
export const useResourceThematicAreaEurovocQuery = (org: string): UseQueryResult<any> => {
  const { getResourceThematicEurovoc } = useServicesContext();

  return useQuery<any>(
    [QueryKey.ResourceThematicEurovoc, org],
    () => getResourceThematicEurovoc(org)
    )
}
