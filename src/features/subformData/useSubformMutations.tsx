import { toast } from 'react-toastify';

import { useMutation } from '@tanstack/react-query';
import { isAxiosError } from 'axios';

import { useAppMutations } from 'src/core/contexts/AppQueriesProvider';
import { useStrictInstance } from 'src/features/instance/InstanceContext';
import { useLanguage } from 'src/features/language/useLanguage';
import type { IInstance } from 'src/types/shared';

export const useAddEntryMutation = (dataType: string) => {
  const instanceContext = useStrictInstance();
  const { langAsString } = useLanguage();
  const { doSubformEntryAdd } = useAppMutations();

  return useMutation({
    mutationKey: ['addSubform', dataType],
    mutationFn: async (data: unknown) => await doSubformEntryAdd(instanceContext.instanceId, dataType, data),
    onSuccess: (reply) => {
      instanceContext?.changeData((instance: IInstance | undefined) => {
        if (!instance || !instance.data) {
          return instance;
        }
        return {
          ...instance,
          data: [...instance.data, reply],
        };
      });
    },
    onError: (error) => {
      console.error('Failed to add subform entry:', error);

      if (isAxiosError(error) && error.response?.status === 409) {
        toast(langAsString('form_filler.error_max_count_reached_subform_server', [dataType]), { type: 'error' });
      } else {
        toast(langAsString('form_filler.error_add_subform'), { type: 'error' });
      }
    },
  });
};

export const useDeleteEntryMutation = (id: string) => {
  const instanceContext = useStrictInstance();
  const { langAsString } = useLanguage();
  const { doSubformEntryDelete } = useAppMutations();

  return useMutation({
    mutationKey: ['deleteSubform', id],
    mutationFn: async (id: string) => {
      await doSubformEntryDelete(instanceContext.instanceId, id);
      return id;
    },
    onSuccess: (deletedId) => {
      if (instanceContext?.changeData) {
        instanceContext.changeData((instance: IInstance | undefined) => {
          if (!instance || !instance.data) {
            return instance;
          }
          return {
            ...instance,
            data: instance.data.filter((item) => item.id !== deletedId),
          };
        });
      }
    },
    onError: (error) => {
      console.error('Failed to delete subform:', error);
      toast(langAsString('form_filler.error_delete_subform'), { type: 'error' });
    },
  });
};
