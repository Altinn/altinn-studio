import { useFormLayoutsQuery } from './queries/useFormLayoutsQuery';
import type { IFormLayouts } from '../types/global';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import useUxEditorParams from './useUxEditorParams';

export const useFormLayouts = (): IFormLayouts => {
  const { org, app } = useStudioEnvironmentParams();
  const { layoutSet } = useUxEditorParams();
  const { data: formLayouts } = useFormLayoutsQuery(org, app, layoutSet);
  return formLayouts;
};
