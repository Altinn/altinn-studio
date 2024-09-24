import { ObjectKind } from '@altinn/schema-model/types';
import { useTranslation } from 'react-i18next';

export function useKindName(objectKind: ObjectKind): string {
  const { t } = useTranslation();

  const kindNames = {
    [ObjectKind.Field]: t('schema_editor.field'),
    [ObjectKind.Combination]: t('schema_editor.combination'),
    [ObjectKind.Reference]: t('schema_editor.reference'),
  };

  return kindNames[objectKind];
}
