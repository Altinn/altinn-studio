import { useFormLayoutsQuery } from './queries/useFormLayoutsQuery';
import { useSelector } from 'react-redux';
import type { IFormLayouts, IInternalLayout, IInternalLayoutWithName } from '../types/global';
import { selectedLayoutNameSelector } from '../selectors/formLayoutSelectors';
import { createEmptyLayout } from '../utils/formLayoutUtils';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useAppContext } from './useAppContext';

export const useFormLayouts = (): IFormLayouts => {
  const { org, app } = useStudioUrlParams();
  const { selectedLayoutSet } = useAppContext();
  const formLayoutsQuery = useFormLayoutsQuery(org, app, selectedLayoutSet);
  const { data } = formLayoutsQuery;
  return data;
};

export const useFormLayout = (layoutName: string): IInternalLayout => {
  const data = useFormLayouts();
  return data?.[layoutName] || createEmptyLayout();
};

export const useSelectedFormLayout = (): IInternalLayout => {
  const layoutName = useSelector(selectedLayoutNameSelector);
  return useFormLayout(layoutName);
};

export const useSelectedFormLayoutWithName = (): IInternalLayoutWithName => {
  const layout = useSelectedFormLayout();
  const layoutName = useSelector(selectedLayoutNameSelector);
  return {
    layout,
    layoutName,
  };
};
