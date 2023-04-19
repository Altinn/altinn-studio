import { useParams } from 'react-router-dom';
import { useFormLayoutsQuery } from './queries/useFormLayoutsQuery';
import { useSelector } from 'react-redux';
import { FormLayoutsSelector, IAppState } from '../types/global';

export const useFormLayoutsSelector = <T>(selector: FormLayoutsSelector<T>): T => {
  const { org, app } = useParams();
  const formLayoutsQuery = useFormLayoutsQuery(org, app);
  const { data } = formLayoutsQuery;
  return useSelector((state: IAppState) => selector(state, data));
}
