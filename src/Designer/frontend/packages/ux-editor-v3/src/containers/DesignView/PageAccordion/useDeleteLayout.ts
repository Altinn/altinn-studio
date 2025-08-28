import { useDeleteLayoutMutation } from '../../../hooks/mutations/useDeleteLayoutMutation';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from '../../../hooks/useAppContext';

export const useDeleteLayout = () => {
  const { org, app } = useStudioEnvironmentParams();
  const { selectedLayoutSet } = useAppContext();
  return useDeleteLayoutMutation(org, app, selectedLayoutSet);
};
