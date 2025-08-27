import type { ChangeEvent } from 'react';
import React, { useReducer } from 'react';
import type { RestrictionItemProps } from '../ItemRestrictions';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { IntRestrictionKey } from '@altinn/schema-model/index';
import { useTranslation } from 'react-i18next';
import classes from './NumberRestrictions.module.css';
import { ErrorMessage, Switch, Label } from '@digdir/designsystemet-react';
import type {
  NumberRestrictionsReducerAction,
  NumberRestrictionsReducerState,
} from './NumberRestrictionsReducer';
import {
  numberRestrictionsReducer,
  NumberRestrictionsReducerActionType,
} from './NumberRestrictionsReducer';
import { NumberRestrictionsError } from '@altinn/schema-editor/types';
import { ValidationUtils } from 'libs/studio-pure-functions/src';
import { StudioTextfield } from '@studio/components-legacy';
import { ItemWrapper } from '../ItemWrapper';

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
  const minLabel = `schema_editor.minimum_${formatState.isMinInclusive ? 'inclusive' : 'exclusive'}`;
  const maxLabel = `schema_editor.maximum_${formatState.isMaxInclusive ? 'inclusive' : 'exclusive'}`;

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
      ValidationUtils.valueExists(newValue) ? parseFloat(newValue) : undefined,
    );
  };

  const onChangeMaxNumber = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value.trim();
    dispatchAction(
      NumberRestrictionsReducerActionType.setMax,
      ValidationUtils.valueExists(newValue) ? parseFloat(newValue) : undefined,
    );
  };

  return (
    <ItemWrapper>
      <div>
        <Label htmlFor='schema_editor.minimum_'>{t(minLabel)}</Label>
        <div className={classes.formatFieldsRowContent}>
          <div>
            <StudioTextfield
              id='schema_editor.minimum_'
              onChange={onChangeMinNumber}
              value={formatState.min === undefined ? '' : formatState.min.toString()}
              type='number'
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
            <StudioTextfield
              id='schema_editor.maximum_'
              onChange={onChangeMaxNumber}
              value={formatState.max === undefined ? '' : formatState.max.toString()}
              type='number'
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
          <StudioTextfield
            id='schema_editor.multipleOf'
            type='number'
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              dispatchAction(NumberRestrictionsReducerActionType.setMultipleOf, e.target.value)
            }
            value={formatState.restrictions[IntRestrictionKey.multipleOf.toString()]}
          />
        </div>
      </div>
    </ItemWrapper>
  );
}
