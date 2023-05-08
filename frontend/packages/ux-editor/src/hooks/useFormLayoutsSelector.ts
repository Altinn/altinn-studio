import { useParams } from 'react-router-dom';
import { useFormLayoutsQuery } from './queries/useFormLayoutsQuery';
import { useSelector } from 'react-redux';
import { FormLayoutsSelector, IAppState } from '../types/global';
import { selectedLayoutSetSelector } from "../selectors/formLayoutSelectors";

export const useFormLayoutsSelector = <T>(selector: FormLayoutsSelector<T>): T => {
  const { org, app } = useParams();
  const selectedLayoutSet = useSelector(selectedLayoutSetSelector);
  const formLayoutsQuery = useFormLayoutsQuery(org, app, selectedLayoutSet);
  const { data } = formLayoutsQuery;
  return useSelector((state: IAppState) => selector(state, data));
}
