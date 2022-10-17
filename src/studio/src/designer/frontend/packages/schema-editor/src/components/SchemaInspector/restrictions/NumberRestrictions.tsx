import React from 'react';
import { RestrictionItemProps } from '../ItemRestrictions';
import { IntRestrictionKeys } from '@altinn/schema-model';
import { RestrictionField } from '../RestrictionField';
import { getTranslation } from '../../../utils/language';
import { Divider } from '../../common/Divider';

export function NumberRestrictions({ restrictions, path, language, onChangeRestrictionValue }: RestrictionItemProps) {
  return (
    <>
      <Divider />
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
