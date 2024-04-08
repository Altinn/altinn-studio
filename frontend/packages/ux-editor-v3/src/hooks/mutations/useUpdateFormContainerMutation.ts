import type { IInternalLayout } from '../../types/global';
import { useFormLayout } from '../useFormLayoutsSelector';
import { useMutation } from '@tanstack/react-query';
import { useFormLayoutMutation } from './useFormLayoutMutation';
import { switchSelectedFieldId } from '../../utils/ruleConfigUtils';
import { useRuleConfigQuery } from '../queries/useRuleConfigQuery';
import { useRuleConfigMutation } from './useRuleConfigMutation';
import type { FormContainer } from '../../types/FormContainer';
import { updateContainer } from '../../utils/formLayoutUtils';

export interface UpdateFormContainerMutationArgs {
  updatedContainer: FormContainer;
  id: string;
}

export const useUpdateFormContainerMutation = (
  org: string,
  app: string,
  layoutName: string,
  layoutSetName: string,
) => {
  const layout = useFormLayout(layoutName);
  const { data: ruleConfig } = useRuleConfigQuery(org, app, layoutSetName);
  const { mutateAsync: saveLayout } = useFormLayoutMutation(org, app, layoutName, layoutSetName);
  const { mutateAsync: saveRuleConfig } = useRuleConfigMutation(org, app, layoutSetName);

  return useMutation({
    mutationFn: ({ updatedContainer, id }: UpdateFormContainerMutationArgs) => {
      const newLayout: IInternalLayout = updateContainer(layout, updatedContainer, id);

      const currentId = id;
      const newId = updatedContainer.id || currentId;

      // Save:
      return saveLayout(newLayout).then(() => ({ currentId, newId }));
    },
    onSuccess: async ({ currentId, newId }) => {
      await switchSelectedFieldId(ruleConfig, currentId, newId, saveRuleConfig);
    },
  });
};
