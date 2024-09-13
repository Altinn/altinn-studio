import { ObjectKind } from '@altinn/schema-model/types';
import { useTranslation } from 'react-i18next';

type KindNames = {
  [kind in ObjectKind]: string;
};

export function useKindNames(): KindNames {
  const { t } = useTranslation();
  return {
    [ObjectKind.Field]: t('schema_editor.field'),
    [ObjectKind.Combination]: t('schema_editor.combination'),
    [ObjectKind.Reference]: t('schema_editor.reference'),
  };
}
