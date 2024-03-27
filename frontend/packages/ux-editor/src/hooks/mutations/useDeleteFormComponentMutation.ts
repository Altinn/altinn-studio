import { useSelectedFormLayoutWithName } from '../';
import { useMutation } from '@tanstack/react-query';
import { ComponentType } from 'app-shared/types/ComponentType';
import { useFormLayoutMutation } from './useFormLayoutMutation';
import { useDeleteAppAttachmentMetadataMutation } from './useDeleteAppAttachmentMetadataMutation';
import { removeComponent } from '../../utils/formLayoutUtils';
import { useAppContext } from '../useAppContext';

export const useDeleteFormComponentMutation = (org: string, app: string, layoutSetName: string) => {
  const { layout, layoutName } = useSelectedFormLayoutWithName();
  const formLayoutsMutation = useFormLayoutMutation(org, app, layoutName, layoutSetName);
  const deleteAppAttachmentMetadataMutation = useDeleteAppAttachmentMetadataMutation(org, app);
  const { previewIframeRef } = useAppContext();
  return useMutation({
    mutationFn: async (id: string) => {
      const component = layout.components[id];
      const updatedLayout = removeComponent(layout, id);
      if (
        component?.type === ComponentType.FileUpload ||
        component?.type === ComponentType.FileUploadWithTag
      ) {
        await deleteAppAttachmentMetadataMutation.mutateAsync(id);
      }

      // TODO - Remove this condition when this issue is fixed : https://github.com/Altinn/app-frontend-react/issues/1977
      previewIframeRef?.current?.contentWindow.window.location.reload();

      return formLayoutsMutation.mutateAsync(updatedLayout);
    },
  });
};
