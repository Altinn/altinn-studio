import { useFormLayoutsQuery } from './queries/useFormLayoutsQuery';
import type { IFormLayouts } from '../types/global';
import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useAppContext } from './';

export const useFormLayouts = (): IFormLayouts => {
  const { org, app } = useStudioUrlParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const formLayoutsQuery = useFormLayoutsQuery(org, app, selectedFormLayoutSetName);
  const { data } = formLayoutsQuery;
  return data;
};
