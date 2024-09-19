import { FieldType } from '@altinn/schema-model/types';
import { useTranslation } from 'react-i18next';

type TypeNames = {
  [type in FieldType]: string;
};

export function useTypeNames(): TypeNames {
  const { t } = useTranslation();
  return {
    [FieldType.Boolean]: t('schema_editor.boolean'),
    [FieldType.Integer]: t('schema_editor.integer'),
    [FieldType.Number]: t('schema_editor.number'),
    [FieldType.Object]: t('schema_editor.object'),
    [FieldType.String]: t('schema_editor.string'),
    [FieldType.Null]: t('schema_editor.null'),
  };
}
