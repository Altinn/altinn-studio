import { IInternalLayout } from '../../types/global';
import { useFormLayoutsSelector } from '../useFormLayoutsSelector';
import { selectedLayoutWithNameSelector } from '../../selectors/formLayoutSelectors';
import { useMutation } from '@tanstack/react-query';
import { useFormLayoutMutation } from './useFormLayoutMutation';
import { deepCopy } from 'app-shared/pure';
import { FormContainer } from '../../types/FormContainer';

export interface UpdateFormContainerMutationArgs {
  updatedContainer: FormContainer;
  id: string;
}

export const useUpdateFormContainerMutation = (org: string, app: string, layoutSetName: string) => {
  const { layout, layoutName } = useFormLayoutsSelector(selectedLayoutWithNameSelector);
  const formLayoutMutation = useFormLayoutMutation(org, app, layoutName, layoutSetName);

  return useMutation({
    mutationFn: ({ updatedContainer, id }: UpdateFormContainerMutationArgs) => {
      const oldLayout = deepCopy(layout);
      const newLayout: IInternalLayout = {
        ...oldLayout,
        containers: {
          ...oldLayout.containers,
          [id]: {
            ...oldLayout.containers[id],
            ...updatedContainer,
          }
        }
      }
      return formLayoutMutation.mutateAsync(newLayout);
    }
  });
};
