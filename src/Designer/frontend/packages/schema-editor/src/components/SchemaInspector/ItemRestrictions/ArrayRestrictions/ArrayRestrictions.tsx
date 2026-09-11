import type { RestrictionItemProps } from '../ItemRestrictions';
import { ArrRestrictionKey } from '@altinn/schema-model';
import { useTranslation } from 'react-i18next';
import classes from './ArrayRestrictions.module.css';
import { StudioSwitch, StudioTextfield } from '@studio/components';
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
        <StudioSwitch
          data-size='sm'
          checked={restrictions[ArrRestrictionKey.uniqueItems]}
          onChange={(e) =>
            onChangeRestrictionValue(path, ArrRestrictionKey.uniqueItems, e.target.checked)
          }
          label={t('schema_editor.' + ArrRestrictionKey.uniqueItems)}
        />
      </div>
    </ItemWrapper>
  );
}
