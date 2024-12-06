import type { IInternalLayout } from '../../types/global';
import { useFormLayout } from '../';
import { useMutation } from '@tanstack/react-query';
import { useFormLayoutMutation } from './useFormLayoutMutation';
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
  const { mutateAsync: saveLayout } = useFormLayoutMutation(org, app, layoutName, layoutSetName);

  return useMutation({
    mutationFn: ({ updatedContainer, id }: UpdateFormContainerMutationArgs) => {
      const newLayout: IInternalLayout = updateContainer(layout, updatedContainer, id);

      const currentId = id;
      const newId = updatedContainer.id || currentId;

      // Save:
      return saveLayout({ internalLayout: newLayout }).then(() => ({ currentId, newId }));
    },
  });
};
