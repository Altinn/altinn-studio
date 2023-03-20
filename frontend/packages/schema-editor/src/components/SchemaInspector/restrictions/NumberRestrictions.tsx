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
import { NameError } from '@altinn/schema-editor/types';
import { ErrorMessage } from '@digdir/design-system-react';

export interface NumberRestrictionsProps extends RestrictionItemProps {
  isInteger: boolean;
}
export function NumberRestrictions({
  restrictions,
  path,
  onChangeRestrictions,
  onChangeRestrictionValue,
}: RestrictionItemProps) {
  const { t } = useTranslation();
  const [formatState, dispatch] = useReducer(numberRestrictionsReducer, {
    isInteger: restrictions[IntRestrictionKeys.integer] === undefined,
    isMinInclusive: restrictions[IntRestrictionKeys.exclusiveMinimum] === undefined,
    isMaxInclusive: restrictions[IntRestrictionKeys.exclusiveMaximum] === undefined,
    min:
      restrictions[IntRestrictionKeys.exclusiveMinimum] ?? restrictions[IntRestrictionKeys.minimum],
    max:
      restrictions[IntRestrictionKeys.exclusiveMaximum] ?? restrictions[IntRestrictionKeys.maximum],
    restrictions: Object.fromEntries(
      Object.values(IntRestrictionKeys).map((key) => [key, restrictions[key]])
    ),
    nameError:
      restrictions[IntRestrictionKeys.minimum] !== undefined &&
      restrictions[IntRestrictionKeys.maximum] !== undefined &&
      restrictions[IntRestrictionKeys.minimum] >= restrictions[IntRestrictionKeys.maximum]
        ? NameError.InvalidMaxMinValue
        : NameError.NoError,
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

  const nameErrorMessage = {
    [NameError.InvalidValue]: t('schema_editor.nameError_InvalidValue'),
    [NameError.InvalidMaxMinValue]: t('schema_editor.nameError_InvalidMaxMinValue'),
    [NameError.NoError]: '',
  }[formatState.nameError];

  const onChangeMinNumber = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value.trim();
    dispatchAction(NumberRestrictionsReducerActionType.setMinExcl, newValue);
  };
  const onChangeMaxNumber = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value.trim();
    dispatchAction(NumberRestrictionsReducerActionType.setMaxExcl, newValue);
  };

  return (
    <>
      <Divider />
      <div>
        <Label htmlFor='schema_editor.minimum_'>{t(minLabel)}</Label>
        <div className={classes.formatFieldsRowContent}>
          <div>
            <TextField
              id='schema_editor.minimum_'
              onChange={onChangeMinNumber}
              value={formatState.min === undefined ? '' : formatState.min.toString()}
            />
            <div className={classes.minNumberErrorMassage}>
              {<ErrorMessage>{nameErrorMessage}</ErrorMessage>}{' '}
            </div>
          </div>
          <Checkbox
            aria-checked='true'
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
          <div>
            <TextField
              id='schema_editor.maximum_'
              onChange={onChangeMaxNumber}
              value={formatState.max === undefined ? '' : formatState.max.toString()}
            />
            <div className={classes.minNumberErrorMassage}>
              {<ErrorMessage>{nameErrorMessage}</ErrorMessage>}{' '}
            </div>
          </div>
          <Checkbox
            checkboxId='include-minimum-value-checkbox'
            aria-checked='true'
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
