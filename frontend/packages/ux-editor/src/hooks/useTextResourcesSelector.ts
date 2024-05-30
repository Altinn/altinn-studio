import type { TextResourcesSelector } from '../types/global';
import { useTextResourcesQuery } from 'app-shared/hooks/queries';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';

export const useTextResourcesSelector = <T>(selector: TextResourcesSelector<T>): T => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: textResources } = useTextResourcesQuery(org, app);
  return selector(textResources);
};
