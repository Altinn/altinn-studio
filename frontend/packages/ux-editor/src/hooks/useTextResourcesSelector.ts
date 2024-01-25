import type { TextResourcesSelector } from '../types/global';
import { useTextResourcesQuery } from 'app-shared/hooks/queries';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';

export const useTextResourcesSelector = <T>(selector: TextResourcesSelector<T>): T => {
  const { org, app } = useStudioUrlParams();
  const { data: textResources } = useTextResourcesQuery(org, app);
  return selector(textResources);
};
