import { useParams } from 'react-router-dom';
import { TextResourcesSelector } from '../types/global';
import { useTextResourcesQuery } from './queries/useTextResourcesQuery';

export const useTextResourcesSelector = <T>(selector: TextResourcesSelector<T>): T => {
  const { org, app } = useParams();
  const { data: textResources } = useTextResourcesQuery(org, app);
  return selector(textResources);
}
