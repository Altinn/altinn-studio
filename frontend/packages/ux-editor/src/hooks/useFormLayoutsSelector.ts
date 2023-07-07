import { useParams } from 'react-router-dom';
import { useFormLayoutsQuery } from './queries/useFormLayoutsQuery';
import { useSelector } from 'react-redux';
import { IFormLayouts, IInternalLayout } from '../types/global';
import { selectedLayoutNameSelector, selectedLayoutSetSelector } from "../selectors/formLayoutSelectors";
import { createEmptyLayout } from '../utils/formLayoutUtils';

export const useFormLayouts = (): IFormLayouts => {
  const { org, app } = useParams();
  const selectedLayoutSet = useSelector(selectedLayoutSetSelector);
  const formLayoutsQuery = useFormLayoutsQuery(org, app, selectedLayoutSet);
  const { data } = formLayoutsQuery;
  return data;
}

export const useSelectedFormLayout = (): IInternalLayout => {
  const data = useFormLayouts();

  const layoutName = useSelector(selectedLayoutNameSelector);
  return data?.[layoutName] || createEmptyLayout();
}

interface SelectedLayoutWithName {
  layout: IInternalLayout;
  layoutName: string;
}

export const useSelectedFormLayoutWithName = (): SelectedLayoutWithName => {
  const layout = useSelectedFormLayout();
  const layoutName = useSelector(selectedLayoutNameSelector);
  return {
    layout,
    layoutName,
  };
}
