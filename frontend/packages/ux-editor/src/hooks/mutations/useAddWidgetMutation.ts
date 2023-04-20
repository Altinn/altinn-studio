import { IFormDesignerComponents, IFormLayouts, IInternalLayout, IWidget } from '../../types/global';
import { convertFromLayoutToInternalFormat } from '../../utils/formLayout';
import { useMutation } from '@tanstack/react-query';
import { selectedLayoutWithNameSelector } from '../../selectors/formLayoutSelectors';
import { useDispatch } from 'react-redux';
import { useFormLayoutsSelector } from '../useFormLayoutsSelector';
import { deepCopy } from 'app-shared/pure';
import { v4 as uuidv4 } from 'uuid';
import { useFormLayoutMutation } from './useFormLayoutMutation';
import { queryClient } from '../../../../../app-development/common/ServiceContext';
import { QueryKey } from '../../types/QueryKey';
import { addTextResources } from '../../features/appData/textResources/textResourcesSlice';
import { BASE_CONTAINER_ID } from 'app-shared/constants';

export interface AddWidgetMutationArgs {
  widget: IWidget;
  position: number;
  containerId?: string;
}

export const useAddWidgetMutation = (org: string, app: string) => {
  const { layout, layoutName } = useFormLayoutsSelector(selectedLayoutWithNameSelector);
  const formLayoutsMutation = useFormLayoutMutation(org, app, layoutName);
  const dispatch = useDispatch();
  return useMutation({
    mutationFn: ({ widget, position, containerId }: AddWidgetMutationArgs) => {
      const internalComponents = convertFromLayoutToInternalFormat(widget.components, layout.hidden);
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
      return formLayoutsMutation.mutateAsync(updatedLayout).then(() => {
        if (widget.texts && Object.keys(widget.texts).length > 0) {
          dispatch(addTextResources({ textResources: widget.texts }));
        }
        return updatedLayout;
      });
    },
    onSuccess: (updatedLayout: IInternalLayout) => {
      queryClient.setQueryData(
        [QueryKey.FormLayouts, org, app],
        (oldLayouts: IFormLayouts) => {
          const newLayouts: IFormLayouts = deepCopy(oldLayouts);
          newLayouts[layoutName] = updatedLayout;
          return newLayouts;
        }
      );
    }
  });
}
