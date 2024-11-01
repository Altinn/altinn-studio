import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { toast } from 'react-toastify';

export const useInstanceIdQuery = (org: string, app: string): UseQueryResult<string> => {
  const { getInstanceIdForPreview } = useServicesContext();
  return useQuery({
    queryKey: [(QueryKey.InstanceId, org, app)],
    queryFn: () =>
      getInstanceIdForPreview(org, app).catch((error) => {
        toast.error('useInstanceIdQuery --- ', error);

        return error;
      }),
  });
};
