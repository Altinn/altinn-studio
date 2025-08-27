import type { IInternalLayout } from '../types/global';
import { createEmptyLayout } from '../utils/formLayoutUtils';
import { useFormLayouts } from './index';

export const useFormLayout = (layoutName: string): IInternalLayout => {
  const data = useFormLayouts();
  return data?.[layoutName] || createEmptyLayout();
};
