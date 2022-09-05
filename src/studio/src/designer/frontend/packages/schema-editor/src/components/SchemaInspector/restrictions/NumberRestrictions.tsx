import React from 'react';
import { RestrictionItemProps } from '../ItemRestrictionsTab';
import { getRestrictions } from '../../../utils/restrictions';
import { RestrictionField } from '../RestrictionField';
import { FieldType } from '../../../types';
import { getTranslation } from '../../../utils/language';
import { Divider } from '@material-ui/core';

export function NumberRestrictions({ restrictions, path, language, onChangeRestrictionValue }: RestrictionItemProps) {
  const defaults = getRestrictions(FieldType.Number);
  return (
    <>
      <Divider />
      {defaults?.map((key) => (
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
