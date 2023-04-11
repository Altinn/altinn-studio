import React from 'react';
import type { RestrictionItemProps } from '../ItemRestrictions';
import { ArrRestrictionKeys } from '@altinn/schema-model';
import { RestrictionField } from '../RestrictionField';
import { Divider } from 'app-shared/primitives';
import { useTranslation } from 'react-i18next';

export function ArrayRestrictions({
  restrictions,
  path,
  onChangeRestrictionValue,
}: RestrictionItemProps) {
  const { t } = useTranslation();
  return (
    <>
      <Divider />
      {Object.values(ArrRestrictionKeys).map((key: string) => (
        <RestrictionField
          key={key}
          path={path}
          label={t('schema_editor.' + key)}
          value={restrictions[key]}
          keyName={key}
          readOnly={false}
          onChangeValue={onChangeRestrictionValue}
        />
      ))}
    </>
  );
}
