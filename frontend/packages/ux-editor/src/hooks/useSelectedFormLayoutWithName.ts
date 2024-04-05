import type { IInternalLayoutWithName } from '../types/global';
import { useAppContext, useSelectedFormLayout } from './';

export const useSelectedFormLayoutWithName = (): IInternalLayoutWithName => {
  const layout = useSelectedFormLayout();
  const { selectedFormLayoutName } = useAppContext();
  return {
    layout,
    layoutName: selectedFormLayoutName,
  };
};
