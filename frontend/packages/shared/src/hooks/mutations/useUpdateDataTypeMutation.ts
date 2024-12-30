import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { DataType } from '../../types/DataType';

export const useUpdateDataTypeMutation = (org: string, app: string, modelName: string) => {
  const { updateDataType } = useServicesContext();

  return useMutation({
    mutationFn: (payload: DataType) =>
      updateDataType(org, app, modelName, payload).then(() => {
        return;
      }),
  });
};
