import React from 'react';
import type { RestrictionItemProps } from '../ItemRestrictions';
import { ArrRestrictionKey } from '@altinn/schema-model/index';
import { Switch } from '@digdir/designsystemet-react';
import { useTranslation } from 'react-i18next';
import classes from './ArrayRestrictions.module.css';
import { StudioTextfield } from '@studio/components-legacy';
import { ItemWrapper } from '../ItemWrapper';

export function ArrayRestrictions({
  restrictions,
  path,
  onChangeRestrictionValue,
}: RestrictionItemProps) {
  const { t } = useTranslation();
  return (
    <ItemWrapper>
      <div className={classes.items}>
        <div className={classes.item}>
          <StudioTextfield
            label={t('schema_editor.' + ArrRestrictionKey.minItems)}
            onChange={(e) =>
              onChangeRestrictionValue(
                path,
                ArrRestrictionKey.minItems,
                e.target.value ? parseInt(e.target.value).toString() : undefined,
              )
            }
            value={restrictions[ArrRestrictionKey.minItems]}
            type='number'
          />
        </div>
        <div className={classes.item}>
          <StudioTextfield
            label={t('schema_editor.' + ArrRestrictionKey.maxItems)}
            onChange={(e) =>
              onChangeRestrictionValue(
                path,
                ArrRestrictionKey.maxItems,
                e.target.value ? parseInt(e.target.value).toString() : undefined,
              )
            }
            value={restrictions[ArrRestrictionKey.maxItems]}
            type='number'
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
    </ItemWrapper>
  );
}
