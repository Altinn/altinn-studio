import type { ObjectKind } from '@altinn/schema-model/types';
import { useKindNames } from './useKindNames';

export const useKindOptions = (): Record<ObjectKind, string> => {
  return useKindNames();
};
