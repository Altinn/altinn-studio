import React from 'react';
import type { RestrictionItemProps } from '../ItemRestrictions';
import { ArrRestrictionKeys } from '@altinn/schema-model';
import { TextField } from '@digdir/design-system-react';
import { Divider } from 'app-shared/primitives';
import { useTranslation } from 'react-i18next';
import classes from './ArrayRestrictions.module.css';
import { Checkbox } from '@digdir/design-system-react';

export function ArrayRestrictions({
  restrictions,
  path,
  onChangeRestrictionValue,
}: RestrictionItemProps) {
  const { t } = useTranslation();
  return (
    <>
      <Divider marginless />
      <div className={classes.items}>
        <div className={classes.item}>
          <TextField
            label={t('schema_editor.' + ArrRestrictionKeys.minItems)}
            onChange={(e) => onChangeRestrictionValue(path, ArrRestrictionKeys.minItems, e.target.value)}
            value={restrictions[ArrRestrictionKeys.minItems]}
            formatting={{ number: {} }}
          />
        </div>
        <div className={classes.item}>
          <TextField
            label={t('schema_editor.' + ArrRestrictionKeys.maxItems)}
            onChange={(e) => onChangeRestrictionValue(path, ArrRestrictionKeys.maxItems, e.target.value)}
            value={restrictions[ArrRestrictionKeys.maxItems]}
            formatting={{ number: {} }}
          />
        </div>
      </div>
      <div>
        <Checkbox
          checked={restrictions[ArrRestrictionKeys.uniqueItems]}
          label={t('schema_editor.' + ArrRestrictionKeys.uniqueItems)}
          onChange={(e) => onChangeRestrictionValue(path, ArrRestrictionKeys.uniqueItems, e.target.checked)}
        />
      </div>
    </>
  );
}
