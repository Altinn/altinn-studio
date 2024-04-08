import { useMutation } from '@tanstack/react-query';
import type { IFormLayoutOrder } from '../../types/global';
import { useSelectedFormLayoutWithName } from '../';
import { ObjectUtils } from '@studio/pure-functions';
import { useFormLayoutMutation } from './useFormLayoutMutation';

export const useUpdateFormComponentOrderMutation = (
  org: string,
  app: string,
  layoutSetName: string,
) => {
  const { layout, layoutName } = useSelectedFormLayoutWithName();
  const formLayoutMutation = useFormLayoutMutation(org, app, layoutName, layoutSetName);
  return useMutation({
    mutationFn: (order: IFormLayoutOrder) => {
      const newLayout = ObjectUtils.deepCopy(layout);
      newLayout.order = order;
      return formLayoutMutation.mutateAsync(newLayout);
    },
  });
};
