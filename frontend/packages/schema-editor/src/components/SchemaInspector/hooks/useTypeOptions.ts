import { useTranslation } from 'react-i18next';
import { FieldType } from '@altinn/schema-model';

type TypeOption = {
  value: FieldType;
  label: string;
};

export const useTypeOptions = (): TypeOption[] => {
  const { t } = useTranslation();
  return [
    {
      value: FieldType.String,
      label: t('schema_editor.string'),
    },
    {
      value: FieldType.Integer,
      label: t('schema_editor.integer'),
    },
    {
      value: FieldType.Number,
      label: t('schema_editor.number'),
    },
    {
      value: FieldType.Boolean,
      label: t('schema_editor.boolean'),
    },
    {
      value: FieldType.Object,
      label: t('schema_editor.object'),
    },
  ];
};
