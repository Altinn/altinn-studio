import React from 'react';
import { RestrictionItemProps } from '../ItemRestrictions';
import { getRestrictions } from '../../../utils/restrictions';
import { RestrictionField } from '../RestrictionField';
import { FieldType } from '../../../types';
import { getTranslation } from '../../../utils/language';
import { Divider } from "../Divider";

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
          value={restrictions.find((r) => r.key === key)?.value}
          keyName={key}
          readOnly={false}
          onChangeValue={onChangeRestrictionValue}
        />
      ))}
    </>
  );
}
