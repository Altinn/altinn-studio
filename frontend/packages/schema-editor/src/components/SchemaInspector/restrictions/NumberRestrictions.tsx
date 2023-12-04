import React, { useReducer } from 'react';
import type { RestrictionItemProps } from '../ItemRestrictions';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { IntRestrictionKey } from '@altinn/schema-model';
import { Divider } from 'app-shared/primitives';
import { useTranslation } from 'react-i18next';
import classes from './StringRestrictions.module.css';
import { ErrorMessage, LegacyTextField, Switch, Label } from '@digdir/design-system-react';
import {
  numberRestrictionsReducer,
  NumberRestrictionsReducerAction,
  NumberRestrictionsReducerActionType,
  NumberRestrictionsReducerState,
} from './NumberRestrictionsReducer';
import { NumberRestrictionsError } from '@altinn/schema-editor/types';
import { valueExists } from '@altinn/schema-editor/utils/value';

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
    isMinInclusive: restrictions[IntRestrictionKey.exclusiveMinimum] === undefined,
    isMaxInclusive: restrictions[IntRestrictionKey.exclusiveMaximum] === undefined,
    min:
      restrictions[IntRestrictionKey.exclusiveMinimum] ?? restrictions[IntRestrictionKey.minimum],
    max:
      restrictions[IntRestrictionKey.exclusiveMaximum] ?? restrictions[IntRestrictionKey.maximum],
    restrictions: Object.fromEntries(
      Object.values(IntRestrictionKey).map((key) => [key, restrictions[key]]),
    ),
    numberRestrictionsError: NumberRestrictionsError.NoError,
  };
  const [formatState, dispatch] = useReducer(numberRestrictionsReducer, initialState);

  const changeCallback = (changedRestrictions: KeyValuePairs) => {
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
      'schema_editor.numberRestrictionsError_MinMustBeLessThanOrEqualToMax',
    ),
    [NumberRestrictionsError.IntervalMustBeLargeEnough]: t(
      'schema_editor.numberRestrictionsError_IntervalMustBeLargeEnough',
    ),
    [NumberRestrictionsError.MinMustBeLessThanMax]: t(
      'schema_editor.numberRestrictionsError_MinMustBeLessThanMax',
    ),
  }[formatState.numberRestrictionsError];

  const onChangeMinNumber = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value.trim();
    dispatchAction(
      NumberRestrictionsReducerActionType.setMin,
      valueExists(newValue) ? parseInt(newValue) : undefined,
    );
  };
  const onChangeMaxNumber = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value.trim();
    dispatchAction(
      NumberRestrictionsReducerActionType.setMax,
      valueExists(newValue) ? parseInt(newValue) : undefined,
    );
  };

  return (
    <>
      <Divider marginless />
      <div>
        <Label htmlFor='schema_editor.minimum_'>{t(minLabel)}</Label>
        <div className={classes.formatFieldsRowContent}>
          <div>
            <LegacyTextField
              id='schema_editor.minimum_'
              onChange={onChangeMinNumber}
              value={formatState.min === undefined ? '' : formatState.min.toString()}
              formatting={{ number: isInteger ? { decimalScale: 0 } : { decimalSeparator: ',' } }}
            />
            <div className={classes.minNumberErrorMassage}>
              <ErrorMessage>{minMaxErrorMessage}</ErrorMessage>
            </div>
          </div>
          <Switch
            size='small'
            checked={formatState.isMinInclusive}
            onChange={(e) =>
              dispatchAction(NumberRestrictionsReducerActionType.setMinIncl, e.target.checked)
            }
          >
            {t('schema_editor.format_date_inclusive')}
          </Switch>
        </div>
      </div>
      <div>
        <Label htmlFor='schema_editor.maximum_'>{t(maxLabel)}</Label>
        <div className={classes.formatFieldsRowContent}>
          <div>
            <LegacyTextField
              id='schema_editor.maximum_'
              onChange={onChangeMaxNumber}
              value={formatState.max === undefined ? '' : formatState.max.toString()}
              formatting={{ number: isInteger ? { decimalScale: 0 } : { decimalSeparator: ',' } }}
            />
            <div className={classes.minNumberErrorMassage}>
              <ErrorMessage>{minMaxErrorMessage}</ErrorMessage>
            </div>
          </div>
          <Switch
            size='small'
            id='include-minimum-value-checkbox'
            checked={formatState.isMaxInclusive}
            onChange={(e) =>
              dispatchAction(NumberRestrictionsReducerActionType.setMaxIncl, e.target.checked)
            }
          >
            {t('schema_editor.format_date_inclusive')}
          </Switch>
        </div>
      </div>
      <div>
        <Label htmlFor='schema_editor.multipleOf'>{t('schema_editor.multipleOf')}</Label>
        <div className={classes.formatFieldsRowContent}>
          <LegacyTextField
            id='schema_editor.multipleOf'
            formatting={{ number: isInteger ? { decimalScale: 0 } : { decimalSeparator: ',' } }}
            onChange={(e) =>
              dispatchAction(NumberRestrictionsReducerActionType.setMultipleOf, e.target.value)
            }
            value={formatState.restrictions[IntRestrictionKey.multipleOf.toString()]}
          />
        </div>
      </div>
    </>
  );
}
