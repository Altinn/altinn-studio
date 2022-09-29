import React from 'react';
import { RestrictionItemProps } from '../ItemRestrictions';
import { FieldType, getRestrictions } from '@altinn/schema-model';
import { RestrictionField } from '../RestrictionField';
import { getTranslation } from '../../../utils/language';
import { Divider } from '../Divider';

export function ArrayRestrictions({ restrictions, language, path, onChangeRestrictionValue }: RestrictionItemProps) {
  const defaults = getRestrictions(FieldType.Array);
  return (
    <>
      <Divider />
      {defaults?.map((key: string) => (
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
