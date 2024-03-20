import type { IInternalLayout } from '../types/global';
import { useSelectedFormLayoutName, useFormLayout } from './';

export const useSelectedFormLayout = (): IInternalLayout => {
  const { selectedFormLayoutName } = useSelectedFormLayoutName();
  return useFormLayout(selectedFormLayoutName);
};
