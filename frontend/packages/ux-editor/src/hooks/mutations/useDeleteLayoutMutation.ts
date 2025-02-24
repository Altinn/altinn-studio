import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { IInternalLayout } from '../../types/global';
import { ObjectUtils } from '@studio/pure-functions';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { addOrRemoveNavigationButtons, firstAvailableLayout } from '../../utils/formLayoutsUtils';
import type { ExternalFormLayout } from 'app-shared/types/api/FormLayoutsResponse';
import { internalLayoutToExternal } from '../../converters/formLayoutConverters';
import { useAppContext } from '../';
import { useSavableFormLayoutSettings } from '@altinn/ux-editor/hooks/useSavableFormLayoutSettings';
import { useDeleteAppAttachmentMetadataMutation } from '@altinn/ux-editor/hooks/mutations/useDeleteAppAttachmentMetadataMutation';
import { ComponentType } from 'app-shared/types/ComponentType';

export const useDeleteLayoutMutation = (org: string, app: string, layoutSetName: string) => {
  const { deleteFormLayout, saveFormLayout } = useServicesContext();
  const { data: formLayouts } = useFormLayoutsQuery(org, app, layoutSetName);
  const layoutSettings = useSavableFormLayoutSettings();
  const deleteAppAttachmentMetadataMutation = useDeleteAppAttachmentMetadataMutation(org, app);
  const { selectedFormLayoutName, setSelectedFormLayoutName } = useAppContext();

  const queryClient = useQueryClient();

  const saveLayout = async (updatedLayoutName: string, updatedLayout: IInternalLayout) => {
    const convertedLayout: ExternalFormLayout = internalLayoutToExternal(updatedLayout);
    return await saveFormLayout(org, app, updatedLayoutName, layoutSetName, {
      layout: convertedLayout,
    });
  };

  return useMutation({
    mutationFn: async (layoutName: string) => {
      const oldLayouts = ObjectUtils.deepCopy(formLayouts);
      let layouts = ObjectUtils.deepCopy(formLayouts);
      delete layouts[layoutName];
      layouts = await addOrRemoveNavigationButtons(layouts, saveLayout);
      await deleteFormLayout(org, app, layoutName, layoutSetName);
      return { layoutName, layouts, oldLayouts };
    },
    onSuccess: ({ layoutName, layouts, oldLayouts }) => {
      layoutSettings.deleteLayoutByName(layoutName);
      layoutSettings.save();

      const components = oldLayouts[selectedFormLayoutName].components;
      const componentsToDelete = Object.values(components)?.filter(
        (component) => component.type === ComponentType.FileUpload,
      );

      for (const component of componentsToDelete) {
        deleteAppAttachmentMetadataMutation.mutate(component.id);
      }

      queryClient.setQueryData([QueryKey.FormLayouts, org, app, layoutSetName], () => layouts);

      if (selectedFormLayoutName === layoutName) {
        const layoutToSelect = firstAvailableLayout(layoutName, layoutSettings.getLayoutsOrder());
        // Problem, this will trigger the useEffect for autoSave in FormContext which cause updating attachment components that does not belong to any layout
        setSelectedFormLayoutName(layoutToSelect);
      }
    },
  });
};
