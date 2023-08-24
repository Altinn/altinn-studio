import React from 'react';
import type { RestrictionItemProps } from '../ItemRestrictions';
import { ArrRestrictionKey } from '@altinn/schema-model';
import { TextField } from '@digdir/design-system-react';
import { Divider } from 'app-shared/primitives';
import { useTranslation } from 'react-i18next';
import classes from './ArrayRestrictions.module.css';
import { LegacyCheckbox } from '@digdir/design-system-react';

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
            label={t('schema_editor.' + ArrRestrictionKey.minItems)}
            onChange={(e) =>
              onChangeRestrictionValue(path, ArrRestrictionKey.minItems, e.target.value)
            }
            value={restrictions[ArrRestrictionKey.minItems]}
            formatting={{ number: {} }}
          />
        </div>
        <div className={classes.item}>
          <TextField
            label={t('schema_editor.' + ArrRestrictionKey.maxItems)}
            onChange={(e) =>
              onChangeRestrictionValue(path, ArrRestrictionKey.maxItems, e.target.value)
            }
            value={restrictions[ArrRestrictionKey.maxItems]}
            formatting={{ number: {} }}
          />
        </div>
      </div>
      <div>
        <LegacyCheckbox
          checked={restrictions[ArrRestrictionKey.uniqueItems]}
          label={t('schema_editor.' + ArrRestrictionKey.uniqueItems)}
          onChange={(e) =>
            onChangeRestrictionValue(path, ArrRestrictionKey.uniqueItems, e.target.checked)
          }
        />
      </div>
    </>
  );
}
