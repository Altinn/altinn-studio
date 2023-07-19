import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { UpdateTextIdPayload } from 'app-shared/types/api/UpdateTextIdPayload';
import { useTranslation } from 'react-i18next';

export const useTextIdMutation = (owner, app) => {
  const queryClient = useQueryClient();
  const { updateTextId } = useServicesContext();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async (payload: UpdateTextIdPayload) => {
      try {
        await updateTextId(owner, app, payload);
      } catch (error) {
        console.error(t('schema_editor.delete_text_id_error'));
        alert(t('schema_editor.delete_text_id_error'));
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: [QueryKey.TextResources, owner, app] });
      await queryClient.invalidateQueries({ queryKey: [QueryKey.FormLayouts, owner, app] });
    },
  });
};
