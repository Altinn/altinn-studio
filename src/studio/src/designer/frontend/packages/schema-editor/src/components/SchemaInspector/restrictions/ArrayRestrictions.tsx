import React from 'react';
import { RestrictionItemProps } from '../ItemRestrictionsTab';
import { getRestrictions } from '../../../utils/restrictions';
import { RestrictionField } from '../RestrictionField';
import { FieldType } from '../../../types';
import { getTranslation } from '../../../utils/language';

export function ArrayRestrictions({ restrictions, language, onChangeRestrictionValue }: RestrictionItemProps) {
  const defaults = getRestrictions(FieldType.Array);
  return (
    <>
      {defaults?.map((key: string) => (
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
