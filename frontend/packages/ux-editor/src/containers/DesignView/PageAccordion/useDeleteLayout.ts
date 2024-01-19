import { useMemo } from 'react';
import { useDeleteLayoutMutation } from '../../../hooks/mutations/useDeleteLayoutMutation';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useAppContext } from '../../../hooks/useAppContext';

export const useDeleteLayout = () => {
  const { org, app } = useStudioUrlParams();
  const { selectedLayoutSet } = useAppContext();
  const { mutate: deleteLayout, isPending } = useDeleteLayoutMutation(org, app, selectedLayoutSet);
  return useMemo(() => ({ deleteLayout, isPending }), [deleteLayout, isPending]);
};
