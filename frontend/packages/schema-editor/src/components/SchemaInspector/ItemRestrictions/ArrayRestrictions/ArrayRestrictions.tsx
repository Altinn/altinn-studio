import React from 'react';
import type { RestrictionItemProps } from '../ItemRestrictions';
import { ArrRestrictionKey } from '@altinn/schema-model';
import { Switch } from '@digdir/designsystemet-react';
import { LegacyTextField } from '@digdir/design-system-react';
import { Divider } from 'app-shared/primitives';
import { useTranslation } from 'react-i18next';
import classes from './ArrayRestrictions.module.css';

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
          <LegacyTextField
            label={t('schema_editor.' + ArrRestrictionKey.minItems)}
            onChange={(e) =>
              onChangeRestrictionValue(path, ArrRestrictionKey.minItems, e.target.value)
            }
            value={restrictions[ArrRestrictionKey.minItems]}
            formatting={{ number: {} }}
          />
        </div>
        <div className={classes.item}>
          <LegacyTextField
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
        <Switch
          size='small'
          checked={restrictions[ArrRestrictionKey.uniqueItems]}
          onChange={(e) =>
            onChangeRestrictionValue(path, ArrRestrictionKey.uniqueItems, e.target.checked)
          }
        >
          {t('schema_editor.' + ArrRestrictionKey.uniqueItems)}
        </Switch>
      </div>
    </>
  );
}
