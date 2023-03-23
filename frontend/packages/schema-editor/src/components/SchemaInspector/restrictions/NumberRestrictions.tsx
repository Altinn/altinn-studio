import React, { useReducer } from 'react';
import type { RestrictionItemProps } from '../ItemRestrictions';
import type { Dict } from '@altinn/schema-model';
import { IntRestrictionKeys } from '@altinn/schema-model';
import { Divider } from 'app-shared/primitives';
import { useTranslation } from 'react-i18next';
import { Label } from 'app-shared/components/Label';
import classes from './StringRestrictions.module.css';
import { Checkbox, ErrorMessage, TextField } from '@digdir/design-system-react';
import {
  numberRestrictionsReducer,
  NumberRestrictionsReducerAction,
  NumberRestrictionsReducerActionType,
  NumberRestrictionsReducerState,
} from './NumberRestrictionsReducer';
import { NumberRestrictionsError } from '@altinn/schema-editor/types';

export interface NumberRestrictionsProps extends RestrictionItemProps {
  isInteger: boolean;
}

export function NumberRestrictions({
  restrictions,
  path,
  onChangeRestrictions,
  isInteger,
}: NumberRestrictionsProps) {
  const { t } = useTranslation();
  const initialState: NumberRestrictionsReducerState = {
    isInteger,
    isMinInclusive: restrictions[IntRestrictionKeys.exclusiveMinimum] === undefined,
    isMaxInclusive: restrictions[IntRestrictionKeys.exclusiveMaximum] === undefined,
    min:
      restrictions[IntRestrictionKeys.exclusiveMinimum] ?? restrictions[IntRestrictionKeys.minimum],
    max:
      restrictions[IntRestrictionKeys.exclusiveMaximum] ?? restrictions[IntRestrictionKeys.maximum],
    restrictions: Object.fromEntries(
      Object.values(IntRestrictionKeys).map((key) => [key, restrictions[key]])
    ),
    numberRestrictionsError: NumberRestrictionsError.NoError,
  };
  const [formatState, dispatch] = useReducer(numberRestrictionsReducer, initialState);

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

  const minMaxErrorMessage = {
    [NumberRestrictionsError.NoError]: '',
    [NumberRestrictionsError.MinMustBeLessThanOrEqualToMax]: t(
      'schema_editor.numberRestrictionsError_MinMustBeLessThanOrEqualToMax'
    ),
    [NumberRestrictionsError.Decimal_One_value_should_be__exclusive]: t(
      'schema_editor.numberRestrictionsError_Decimal_One_value_should_be__exclusive'
    ),
    [NumberRestrictionsError.IntervalMustBeLargeEnough]: t(
      'schema_editor.numberRestrictionsError_IntervalMustBeLargeEnough'
    ),

    [NumberRestrictionsError.MinMustBeLessThanMax]: t(
      'schema_editor.numberRestrictionsError_MinMustBeLessThanMax'
    ),
  }[formatState.numberRestrictionsError];

  const onChangeMinNumber = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value.trim();
    dispatchAction(
      NumberRestrictionsReducerActionType.setMin,
      newValue ? parseInt(newValue) : undefined
    );
  };
  const onChangeMaxNumber = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value.trim();
    dispatchAction(
      NumberRestrictionsReducerActionType.setMax,
      newValue ? parseInt(newValue) : undefined
    );
  };

  return (
    <>
      <Divider marginless />
      <div>
        <Label htmlFor='schema_editor.minimum_'>{t(minLabel)}</Label>
        <div className={classes.formatFieldsRowContent}>
          <div>
            <TextField
              id='schema_editor.minimum_'
              onChange={onChangeMinNumber}
              value={formatState.min === undefined ? '' : formatState.min.toString()}
              formatting={{ number: isInteger ? { decimalScale: 0 } : { decimalSeparator: ',' } }}
            />
            <div className={classes.minNumberErrorMassage}>
              <ErrorMessage>{minMaxErrorMessage}</ErrorMessage>
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
              formatting={{ number: isInteger ? { decimalScale: 0 } : { decimalSeparator: ',' } }}
            />
            <div className={classes.minNumberErrorMassage}>
              <ErrorMessage>{minMaxErrorMessage}</ErrorMessage>
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
            formatting={{ number: isInteger ? { decimalScale: 0 } : { decimalSeparator: ',' } }}
            onChange={(e) =>
              dispatchAction(NumberRestrictionsReducerActionType.setRestriction, e.target.value)
            }
            value={formatState.restrictions[IntRestrictionKeys.multipleOf.toString()]}
          />
        </div>
      </div>
    </>
  );
}
