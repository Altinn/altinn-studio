/* import { useTranslation } from 'react-i18next'; */
import type { ObjectKind } from '@altinn/schema-model';
import { useKindNames } from './useKindNames';

type KindOption = {
  kind: ObjectKind;
  label: string;
};

export const useKindOptions = (): KindOption[] => {
  const kindNames = useKindNames();
  return Object.entries(kindNames).map(([kind, label]) => ({
    kind: kind as ObjectKind,
    label,
  }));
};
