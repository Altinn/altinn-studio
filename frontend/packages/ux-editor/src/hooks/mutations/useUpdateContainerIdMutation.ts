import { selectedLayoutWithNameSelector } from '../../selectors/formLayoutSelectors';
import { useFormLayoutsSelector } from '../useFormLayoutsSelector';
import { useMutation } from '@tanstack/react-query';
import { deepCopy } from 'app-shared/pure';
import { IInternalLayout } from '../../types/global';
import { useFormLayoutMutation } from './useFormLayoutMutation';
import { switchSelectedFieldId } from '../../utils/ruleConfigUtils';
import { useRuleConfigQuery } from '../queries/useRuleConfigQuery';
import { useRuleConfigMutation } from './useRuleConfigMutation';

export interface UpdateContainerIdMutationArgs {
  currentId: string;
  newId: string;
}

export const useUpdateContainerIdMutation = (org: string, app: string, layoutSetName: string) => {
  const { layout, layoutName } = useFormLayoutsSelector(selectedLayoutWithNameSelector);
  const { data: ruleConfig } = useRuleConfigQuery(org, app, layoutSetName);
  const { mutateAsync: saveLayout } = useFormLayoutMutation(org, app, layoutName, layoutSetName);
  const { mutateAsync: saveRuleConfig } = useRuleConfigMutation(org, app, layoutSetName);

  return useMutation({
    mutationFn: ({ currentId, newId }: UpdateContainerIdMutationArgs) => {
      const newLayout: IInternalLayout = deepCopy(layout);

      // Update component ID:
      newLayout.containers[newId] = {
        ...newLayout.containers[currentId],
      };
      delete newLayout.containers[currentId];

      // Update ID in parent container order:
      const parentContainer = Object.keys(newLayout.order).find((containerId: string) => {
        return newLayout.order[containerId].indexOf(currentId) > -1;
      });
      if (parentContainer) {
        const parentContainerOrder = newLayout.order[parentContainer];
        const containerIndex = parentContainerOrder.indexOf(currentId);
        parentContainerOrder[containerIndex] = newId;
      }

      // Update ID of the containers order array:
      newLayout.order[newId] = layout.order[currentId];
      delete newLayout.order[currentId];

      // Save:
      return saveLayout(newLayout).then(() => ({ currentId, newId }));
    },
    onSuccess: async ({ currentId, newId }) => {
      await switchSelectedFieldId(ruleConfig, currentId, newId, saveRuleConfig);
    }
  });
}
