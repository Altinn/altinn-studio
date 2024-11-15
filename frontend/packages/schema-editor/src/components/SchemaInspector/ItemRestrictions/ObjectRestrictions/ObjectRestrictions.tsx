import React from 'react';
import type { RestrictionItemProps } from '../ItemRestrictions';
import { ObjRestrictionKey } from '@altinn/schema-model';
import { RestrictionField } from '../RestrictionField';
import { useTranslation } from 'react-i18next';
import { ItemWrapper } from '../ItemWrapper';

export function ObjectRestrictions({
  restrictions,
  path,
  onChangeRestrictionValue,
}: RestrictionItemProps) {
  const { t } = useTranslation();
  const defaults = Object.values(ObjRestrictionKey);
  return defaults?.length ? (
    <ItemWrapper>
      {defaults.map((key) => (
        <RestrictionField
          key={key}
          path={path}
          label={t('schema_editor.' + key)}
          value={restrictions[key] ?? ''}
          keyName={key}
          readOnly={false}
          onChangeValue={onChangeRestrictionValue}
        />
      ))}
    </ItemWrapper>
  ) : null;
}
