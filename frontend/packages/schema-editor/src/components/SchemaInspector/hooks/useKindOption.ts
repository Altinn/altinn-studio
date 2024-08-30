import { useTranslation } from 'react-i18next';
import { ObjectKind } from '@altinn/schema-model';

type kindOption = {
  kind: ObjectKind;
  label: string;
};

export const useKindOptions = (): kindOption[] => {
  const { t } = useTranslation();
  return [
    {
      kind: ObjectKind.Field,
      label: t('schema_editor.field'),
    },
    {
      kind: ObjectKind.Combination,
      label: t('schema_editor.combination'),
    },
    {
      kind: ObjectKind.Reference,
      label: t('schema_editor.reference'),
    },
  ];
};
