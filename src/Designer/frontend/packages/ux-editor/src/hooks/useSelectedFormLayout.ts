import type { IInternalLayout } from '../types/global';
import { useFormLayout, useAppContext } from './index';

export const useSelectedFormLayout = (): IInternalLayout => {
  const { selectedFormLayoutName } = useAppContext();
  return useFormLayout(selectedFormLayoutName);
};
