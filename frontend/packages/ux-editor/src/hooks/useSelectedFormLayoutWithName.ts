import type { IInternalLayoutWithName } from '../types/global';
import { useSelectedFormLayoutName, useSelectedFormLayout } from './';

export const useSelectedFormLayoutWithName = (): IInternalLayoutWithName => {
  const layout = useSelectedFormLayout();
  const { selectedFormLayoutName } = useSelectedFormLayoutName();
  return {
    layout,
    layoutName: selectedFormLayoutName,
  };
};
