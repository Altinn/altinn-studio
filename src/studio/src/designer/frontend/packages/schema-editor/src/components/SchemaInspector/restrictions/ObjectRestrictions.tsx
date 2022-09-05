import React from 'react';
import { RestrictionItemProps } from '../ItemRestrictionsTab';
import { getRestrictions } from '../../../utils/restrictions';
import { RestrictionField } from '../RestrictionField';
import { FieldType } from '../../../types';
import { getTranslation } from '../../../utils/language';

export function ObjectRestrictions({ restrictions, language, onChangeRestrictionValue }: RestrictionItemProps) {
  const defaults = getRestrictions(FieldType.Object);

  return (
    <>
      {defaults?.map((key) => (
        <RestrictionField
          key={key}
          path={key}
          label={getTranslation(key, language)}
          value={restrictions.find((r) => r.key === key)?.value}
          keyName={key}
          readOnly={false}
          onChangeValue={onChangeRestrictionValue}
          onReturn={console.log}
        />
      ))}
    </>
  );
}
