import { useFormLayoutsQuery } from './queries/useFormLayoutsQuery';
import type { IFormLayouts } from '../types/global';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useAppContext } from './';

export const useFormLayouts = (): IFormLayouts => {
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useAppContext();
  const { data: formLayouts } = useFormLayoutsQuery(org, app, selectedFormLayoutSetName);
  return formLayouts;
};
