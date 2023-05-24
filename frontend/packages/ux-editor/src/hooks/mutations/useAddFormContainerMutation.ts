import { generateComponentId } from '../../utils/generateId';
import { IInternalLayout } from '../../types/global';
import { ComponentType } from '../../components';
import { useFormLayoutsQuery } from '../queries/useFormLayoutsQuery';
import { useFormLayoutsSelector } from '../useFormLayoutsSelector';
import { selectedLayoutWithNameSelector } from '../../selectors/formLayoutSelectors';
import { useMutation } from '@tanstack/react-query';
import { useFormLayoutMutation } from './useFormLayoutMutation';
import { FormContainer } from '../../types/FormContainer';

export interface AddFormContainerMutationArgs {
  container: FormContainer;
  positionAfterId?: string;
  addToId?: string;
  callback?: (...args: any[]) => any;
  destinationIndex?: number;
}

export const useAddFormContainerMutation = (org: string, app: string) => {
  const formLayoutsQuery = useFormLayoutsQuery(org, app);
  const { layout, layoutName } = useFormLayoutsSelector(selectedLayoutWithNameSelector);
  const formLayoutsMutation = useFormLayoutMutation(org, app, layoutName);

  return useMutation({
    mutationFn: ({ container, positionAfterId, addToId, callback, destinationIndex }: AddFormContainerMutationArgs) => {
      const layouts = formLayoutsQuery.data;
      const id = generateComponentId(ComponentType.Group, layouts);
      let baseContainerId;
      if (Object.keys(layout.order) && Object.keys(layout.order).length > 0) {
        baseContainerId = Object.keys(layout.order)[0];
      }

      if (callback) callback(container, id);

      const updatedLayout: IInternalLayout = {
        ...layout,
        containers: {
          ...layout.containers,
          [id]: container,
        },
        order: {
          ...layout.order,
          [id]: []
        }
      };

      if (baseContainerId) {
        if (addToId) {
          if (!destinationIndex === false || destinationIndex === 0) {
            updatedLayout.order[addToId].splice(destinationIndex, 0, id);
          } else {
            updatedLayout.order[addToId].push(id);
          }
          if (positionAfterId) {
            updatedLayout.order[baseContainerId].splice(
              updatedLayout.order[baseContainerId].indexOf(positionAfterId) + 1,
              0,
              id
            );
          }
        } else if (!destinationIndex === false || destinationIndex === 0) {
          updatedLayout.order[baseContainerId].splice(destinationIndex, 0, id);
        } else {
          updatedLayout.order[baseContainerId].push(id);
        }
      }

      return formLayoutsMutation.mutateAsync(updatedLayout);
    }
  });
};
