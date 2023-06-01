import { IInternalLayout } from '../../types/global';
import { useFormLayoutsSelector } from '../useFormLayoutsSelector';
import { selectedLayoutWithNameSelector } from '../../selectors/formLayoutSelectors';
import { useMutation } from '@tanstack/react-query';
import { useFormLayoutMutation } from './useFormLayoutMutation';
import { switchSelectedFieldId } from '../../utils/ruleConfigUtils';
import { useRuleConfigQuery } from '../queries/useRuleConfigQuery';
import { useRuleConfigMutation } from './useRuleConfigMutation';
import { deepCopy } from 'app-shared/pure';
import { FormContainer } from '../../types/FormContainer';

export interface UpdateFormContainerMutationArgs {
  updatedContainer: FormContainer;
  id: string;
}

export const useUpdateFormContainerMutation = (org: string, app: string, layoutSetName: string) => {
  const { layout, layoutName } = useFormLayoutsSelector(selectedLayoutWithNameSelector);
  const { data: ruleConfig } = useRuleConfigQuery(org, app, layoutSetName);
  const { mutateAsync: saveLayout } = useFormLayoutMutation(org, app, layoutName, layoutSetName);
  const { mutateAsync: saveRuleConfig } = useRuleConfigMutation(org, app, layoutSetName);

  return useMutation({
    mutationFn: ({ updatedContainer, id }: UpdateFormContainerMutationArgs) => {
      const oldLayout: IInternalLayout = deepCopy(layout);

      const currentId = id;
      const newId = updatedContainer.id || currentId;

      if (currentId !== newId) {
        // Update component ID:
        oldLayout.containers[newId] = {
          ...oldLayout.containers[currentId],
        };
        delete oldLayout.containers[currentId];

        // Update ID in parent container order:
        const parentContainer = Object.keys(oldLayout.order).find((containerId: string) => {
          return oldLayout.order[containerId].indexOf(currentId) > -1;
        });
        if (parentContainer) {
          const parentContainerOrder = oldLayout.order[parentContainer];
          const containerIndex = parentContainerOrder.indexOf(currentId);
          parentContainerOrder[containerIndex] = newId;
        }

        // Update ID of the containers order array:
        oldLayout.order[newId] = layout.order[currentId];
        delete oldLayout.order[currentId];
      }

      const newLayout: IInternalLayout = {
        ...oldLayout,
        containers: {
          ...oldLayout.containers,
          [newId]: {
            ...oldLayout.containers[newId],
            ...updatedContainer,
          }
        }
      }

      // Save:
      return saveLayout(newLayout).then(() => ({ currentId, newId }));
    },
    onSuccess: async ({ currentId, newId }) => {
      await switchSelectedFieldId(ruleConfig, currentId, newId, saveRuleConfig);
    }
  });
};
