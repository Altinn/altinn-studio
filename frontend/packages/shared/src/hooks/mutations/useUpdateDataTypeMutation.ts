import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { DataType } from '../../types/DataType';
import { QueryKey } from '../../types/QueryKey';

export const useUpdateDataTypeMutation = (org: string, app: string, modelName: string) => {
  const { updateDataType } = useServicesContext();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: DataType) => updateDataType(org, app, modelName, payload),
    onSuccess: (data) => {
      queryClient.setQueryData([QueryKey.DataType, org, app, modelName], data);
    },
  });
};
