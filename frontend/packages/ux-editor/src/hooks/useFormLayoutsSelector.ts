import { useParams } from 'react-router-dom';
import { useFormLayoutsQuery } from './queries/useFormLayoutsQuery';
import { useSelector } from 'react-redux';
import { IFormLayouts, IInternalLayout, IInternalLayoutWithName } from '../types/global';
import { selectedLayoutNameSelector, selectedLayoutSetSelector } from "../selectors/formLayoutSelectors";
import { createEmptyLayout } from '../utils/formLayoutUtils';

export const useFormLayouts = (): IFormLayouts => {
  const { org, app } = useParams();
  const selectedLayoutSet = useSelector(selectedLayoutSetSelector);
  const formLayoutsQuery = useFormLayoutsQuery(org, app, selectedLayoutSet);
  const { data } = formLayoutsQuery;
  return data;
}

export const useFormLayout = (layoutName: string): IInternalLayout => {
  const data = useFormLayouts();
  return data?.[layoutName] || createEmptyLayout();
}

export const useSelectedFormLayout = (): IInternalLayout => {
  const layoutName = useSelector(selectedLayoutNameSelector);
  return useFormLayout(layoutName);
}

export const useSelectedFormLayoutWithName = (): IInternalLayoutWithName => {
  const layout = useSelectedFormLayout();
  const layoutName = useSelector(selectedLayoutNameSelector);
  return {
    layout,
    layoutName,
  };
}
