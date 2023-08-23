import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { ResourceSector } from 'resourceadm/types/global';

/**
 * Query to get the list of sectors for the resource. It only returns the
 * code and the label of the sector from backend.
 *
 * @param org the organisation of the user
 *
 * @returns UseQueryResult with a list of sectors of ResourceSector
 */
export const useResourceSectorsQuery = (org: string): UseQueryResult<ResourceSector[]> => {
  const { getResourceSectors } = useServicesContext();

  return useQuery<ResourceSector[]>(
    [QueryKey.ResourceSectors, org],
    () => getResourceSectors(org),
    {
      select: (data) =>
        data.map((d) => ({
          code: d.code,
          label: d.label,
        })),
    }
  );
};
