import type { IInternalLayout } from '../types/global';
import { useFormLayout, useAppContext } from './';

export const useSelectedFormLayout = (): IInternalLayout => {
  const { selectedFormLayoutName } = useAppContext();
  return useFormLayout(selectedFormLayoutName);
};
