import { useMutation } from '@tanstack/react-query';
import { IFormLayoutOrder } from '../../types/global';
import { selectedLayoutWithNameSelector } from '../../selectors/formLayoutSelectors';
import { useFormLayoutsSelector } from '../useFormLayoutsSelector';
import { deepCopy } from 'app-shared/pure';
import { useFormLayoutMutation } from './useFormLayoutMutation';

export const useUpdateFormComponentOrderMutation = (org: string, app: string, layoutSetName: string) => {
  const { layout, layoutName } = useFormLayoutsSelector(selectedLayoutWithNameSelector);
  const formLayoutMutation = useFormLayoutMutation(org, app, layoutName, layoutSetName);
  return useMutation({
    mutationFn: (order: IFormLayoutOrder) => {
      const newLayout = deepCopy(layout);
      newLayout.order = order;
      return formLayoutMutation.mutateAsync(newLayout);
    }
  });
}
