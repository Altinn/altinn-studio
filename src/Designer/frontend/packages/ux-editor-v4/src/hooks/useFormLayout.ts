import type { IInternalLayout } from '../types/global';
import { createEmptyLayout } from '../utils/formLayoutUtils';
import { useFormLayouts } from './';

export const useFormLayout = (layoutName: string): IInternalLayout => {
  const data = useFormLayouts();
  return data?.[layoutName] || createEmptyLayout();
};
