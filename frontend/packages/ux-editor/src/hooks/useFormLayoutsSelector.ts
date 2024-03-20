import { useFormLayoutsQuery } from './queries/useFormLayoutsQuery';
import type { IFormLayouts, IInternalLayout, IInternalLayoutWithName } from '../types/global';
import { createEmptyLayout } from '../utils/formLayoutUtils';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useSelectedLayoutSetName, useSelectedLayoutName } from './';

export const useFormLayouts = (): IFormLayouts => {
  const { org, app } = useStudioUrlParams();
  const { selectedLayoutSetName } = useSelectedLayoutSetName();
  const formLayoutsQuery = useFormLayoutsQuery(org, app, selectedLayoutSetName);
  const { data } = formLayoutsQuery;
  return data;
};

export const useFormLayout = (layoutName: string): IInternalLayout => {
  const data = useFormLayouts();
  return data?.[layoutName] || createEmptyLayout();
};

export const useSelectedFormLayout = (): IInternalLayout => {
  const { selectedLayoutName } = useSelectedLayoutName();
  return useFormLayout(selectedLayoutName);
};

export const useSelectedFormLayoutWithName = (): IInternalLayoutWithName => {
  const layout = useSelectedFormLayout();
  const { selectedLayoutName } = useSelectedLayoutName();
  return {
    layout,
    layoutName: selectedLayoutName,
  };
};
