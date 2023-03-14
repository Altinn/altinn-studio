import React, { useReducer } from 'react';
import type { RestrictionItemProps } from '../ItemRestrictions';
import { IntRestrictionKeys } from '@altinn/schema-model';
import { Divider } from 'app-shared/primitives';
import { useTranslation } from 'react-i18next';
import { Label } from 'app-shared/components/Label';
import classes from './StringRestrictions.module.css';
import { Checkbox, TextField } from '@digdir/design-system-react';
import {
  numberRestrictionsReducer,
  NumberRestrictionsReducerActionType,
  NumberRestrictionsReducerAction,
} from './NumberRestrictionsReducer';
import type { Dict } from '@altinn/schema-model';

export function NumberRestrictions({
  restrictions,
  path,
  onChangeRestrictions,
  onChangeRestrictionValue,
}: RestrictionItemProps) {
  const { t } = useTranslation();
  const [formatState, dispatch] = useReducer(numberRestrictionsReducer, {
    isMinInclusive: restrictions[IntRestrictionKeys.exclusiveMinimum] === undefined,
    isMaxInclusive: restrictions[IntRestrictionKeys.exclusiveMaximum] === undefined,
    min:
      restrictions[IntRestrictionKeys.exclusiveMinimum] ?? restrictions[IntRestrictionKeys.minimum],
    max:
      restrictions[IntRestrictionKeys.exclusiveMaximum] ?? restrictions[IntRestrictionKeys.maximum],
    restrictions: Object.fromEntries(
      Object.values(IntRestrictionKeys).map((key) => [key, restrictions[key]])
    ),
  });

  const changeCallback = (changedRestrictions: Dict) => {
    onChangeRestrictions(path, changedRestrictions);
  };
  const dispatchAction = (type: NumberRestrictionsReducerActionType, value: any) =>
    dispatch({ type, value, changeCallback } as NumberRestrictionsReducerAction);
  const minLabel = `schema_editor.minimum_${
    formatState.isMinInclusive ? 'inclusive' : 'exclusive'
  }`;
  const maxLabel = `schema_editor.maximum_${
    formatState.isMaxInclusive ? 'inclusive' : 'exclusive'
  }`;

  return (
    <>
      <Divider />
      <div>
        <Label htmlFor='schema_editor.minimum_'>{t(minLabel)}</Label>
        <div className={classes.formatFieldsRowContent}>
          <TextField
            id='schema_editor.minimum_'
            onChange={(e) =>
              dispatchAction(NumberRestrictionsReducerActionType.setMinExcl, e.target.value)
            }
            value={formatState.min === undefined ? '' : formatState.min.toString()}
          />
          <Checkbox
            checked={formatState.isMinInclusive}
            label={t('schema_editor.format_date_inclusive')}
            onChange={(e) =>
              dispatchAction(NumberRestrictionsReducerActionType.setMinIncl, e.target.checked)
            }
          />
        </div>
      </div>
      <div>
        <Label htmlFor='schema_editor.maximum_'>{t(maxLabel)}</Label>
        <div className={classes.formatFieldsRowContent}>
          <TextField
            id='schema_editor.maximum_'
            onChange={(e) =>
              dispatchAction(NumberRestrictionsReducerActionType.setMaxExcl, e.target.value)
            }
            value={formatState.max === undefined ? '' : formatState.max.toString()}
          />
          <Checkbox
            checkboxId='include-minimum-value-checkbox'
            checked={formatState.isMaxInclusive}
            label={t('schema_editor.format_date_inclusive')}
            onChange={(e) =>
              dispatchAction(NumberRestrictionsReducerActionType.setMaxIncl, e.target.checked)
            }
          />
        </div>
      </div>
      <div>
        <Label htmlFor='schema_editor.multipleOf'>{t('schema_editor.multipleOf')}</Label>
        <div className={classes.formatFieldsRowContent}>
          <TextField
            id='schema_editor.multipleOf'
            onChange={(e) =>
              onChangeRestrictionValue(IntRestrictionKeys.multipleOf.toString(), e.target.value)
            }
            value={formatState.restrictions[IntRestrictionKeys.multipleOf.toString()]}
          />
        </div>
      </div>
    </>
  );
}
