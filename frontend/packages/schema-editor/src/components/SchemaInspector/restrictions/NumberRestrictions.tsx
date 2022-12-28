import React from 'react';
import type { RestrictionItemProps } from '../ItemRestrictions';
import { IntRestrictionKeys } from '@altinn/schema-model';
import { RestrictionField } from '../RestrictionField';
import { getTranslation } from '../../../utils/language';
import { Divider } from 'app-shared/primitives';

export function NumberRestrictions({
  restrictions,
  path,
  language,
  onChangeRestrictionValue,
}: RestrictionItemProps) {
  return (
    <>
      <Divider inMenu />
      {Object.values(IntRestrictionKeys).map((key) => (
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
