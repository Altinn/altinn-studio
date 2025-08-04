import { toast } from 'react-toastify';

import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { useAppMutations } from 'src/core/contexts/AppQueriesProvider';
import { useInvalidateInstanceData, useStrictInstanceId } from 'src/features/instance/InstanceContext';
import { useLanguage } from 'src/features/language/useLanguage';

export const useAddEntryMutation = (dataType: string) => {
  const instanceId = useStrictInstanceId();
  const { langAsString } = useLanguage();
  const { doSubformEntryAdd } = useAppMutations();
  const invalidateInstanceData = useInvalidateInstanceData();

  return useMutation({
    mutationKey: ['addSubform', dataType],
    mutationFn: async (data: unknown) => await doSubformEntryAdd(instanceId, dataType, data),
    onSuccess: () => {
      invalidateInstanceData();
    },
    onError: (error) => {
      window.logErrorOnce('Failed to add subform entry:', error);

      if (isAxiosError(error) && error.response?.status === 409) {
        toast(langAsString('form_filler.error_max_count_reached_subform_server', [dataType]), { type: 'error' });
      } else {
        toast(langAsString('form_filler.error_add_subform'), { type: 'error' });
      }
    },
  });
};

export const useDeleteEntryMutation = () => {
  const instanceId = useStrictInstanceId();
  const { langAsString } = useLanguage();
  const { doSubformEntryDelete } = useAppMutations();
  const invalidateInstanceData = useInvalidateInstanceData();

  return useMutation({
    mutationKey: ['deleteSubform'],
    mutationFn: async (id: string) => {
      await doSubformEntryDelete(instanceId, id);
      return id;
    },
    onSuccess: () => {
      invalidateInstanceData();
    },
    onError: (error) => {
      console.error('Failed to delete subform:', error);
      toast(langAsString('form_filler.error_delete_subform'), { type: 'error' });
    },
  });
};
