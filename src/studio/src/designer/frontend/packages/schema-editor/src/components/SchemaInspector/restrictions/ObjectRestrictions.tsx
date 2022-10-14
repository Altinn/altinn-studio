import React from 'react';
import { RestrictionItemProps } from '../ItemRestrictions';
import { ObjRestrictionKeys } from '@altinn/schema-model';
import { RestrictionField } from '../RestrictionField';
import { getTranslation } from '../../../utils/language';
import { Divider } from '../../common/Divider';

export function ObjectRestrictions({ restrictions, path, language, onChangeRestrictionValue }: RestrictionItemProps) {
  const defaults = Object.values(ObjRestrictionKeys);
  return defaults?.length ? (
    <>
      <Divider />
      {defaults.map((key) => (
        <RestrictionField
          key={key}
          path={path}
          label={getTranslation(key, language)}
          value={restrictions[key] ?? ''}
          keyName={key}
          readOnly={false}
          onChangeValue={onChangeRestrictionValue}
        />
      ))}
    </>
  ) : null;
}
