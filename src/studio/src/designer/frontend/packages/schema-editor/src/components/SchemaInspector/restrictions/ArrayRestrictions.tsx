import React from 'react';
import type { RestrictionItemProps } from '../ItemRestrictions';
import { ArrRestrictionKeys } from '@altinn/schema-model';
import { RestrictionField } from '../RestrictionField';
import { getTranslation } from '../../../utils/language';
import { Divider } from 'app-shared/primitives';

export function ArrayRestrictions({
  restrictions,
  language,
  path,
  onChangeRestrictionValue,
}: RestrictionItemProps) {
  return (
    <>
      <Divider />
      {Object.values(ArrRestrictionKeys).map((key: string) => (
        <RestrictionField
          key={key}
          path={path}
          label={getTranslation(key, language)}
          value={restrictions[key]}
          keyName={key}
          readOnly={false}
          onChangeValue={onChangeRestrictionValue}
        />
      ))}
    </>
  );
}
