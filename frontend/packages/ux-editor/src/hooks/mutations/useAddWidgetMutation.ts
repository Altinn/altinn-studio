import { IFormDesignerComponents, IFormLayouts, IInternalLayout, IWidget } from '../../types/global';
import { convertFromLayoutToInternalFormat } from '../../utils/formLayoutUtils';
import { useMutation } from '@tanstack/react-query';
import { selectedLayoutWithNameSelector } from '../../selectors/formLayoutSelectors';
import { useFormLayoutsSelector } from '../useFormLayoutsSelector';
import { deepCopy } from 'app-shared/pure';
import { v4 as uuidv4 } from 'uuid';
import { useFormLayoutMutation } from './useFormLayoutMutation';
import { queryClient } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { BASE_CONTAINER_ID } from 'app-shared/constants';
import { useUpsertTextResourcesMutation } from 'app-shared/hooks/mutations';
import { extractLanguagesFromWidgetTexts, extractTextsFromWidgetTextsByLanguage } from '../../utils/widgetUtils';

export interface AddWidgetMutationArgs {
  widget: IWidget;
  position: number;
  containerId?: string;
}

export const useAddWidgetMutation = (org: string, app: string, layoutSetName: string) => {
  const { layout, layoutName } = useFormLayoutsSelector(selectedLayoutWithNameSelector);
  const { mutateAsync: updateLayout } = useFormLayoutMutation(org, app, layoutName, layoutSetName);
  const { mutateAsync: updateText } = useUpsertTextResourcesMutation(org, app);
  return useMutation({
    mutationFn: async ({ widget, position, containerId }: AddWidgetMutationArgs) => {
      const internalComponents = convertFromLayoutToInternalFormat({
        data: { layout: widget.components },
        $schema: null
      });
      const components: IFormDesignerComponents = deepCopy(layout.components);
      if (!containerId) containerId = BASE_CONTAINER_ID; // If containerId is not set, set it to the base-container's ID
      const containerOrder: string[] = [...layout.order[containerId]];
      const ids: string[] = [];
      Object.keys(internalComponents.components).forEach((id: string) => {
        const newId = uuidv4();
        internalComponents.components[id].id = newId;
        components[newId] = internalComponents.components[id];
        ids.push(newId);
      });
      containerOrder.splice(position, 0, ...ids);
      const updatedLayout = deepCopy(layout);
      updatedLayout.components = components;
      updatedLayout.order[containerId] = containerOrder;
      await updateLayout(updatedLayout);
      for (const language of extractLanguagesFromWidgetTexts(widget.texts)) {
        const textResources = extractTextsFromWidgetTextsByLanguage(widget.texts, language);
        await updateText({ language, textResources });
      }
      return updatedLayout;
    },
    onSuccess: (updatedLayout: IInternalLayout) => {
      queryClient.setQueryData(
        [QueryKey.FormLayouts, org, app, layoutSetName],
        (oldLayouts: IFormLayouts) => {
          const newLayouts: IFormLayouts = deepCopy(oldLayouts);
          newLayouts[layoutName] = updatedLayout;
          return newLayouts;
        }
      );
    }
  });
}
