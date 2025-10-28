import type { ChangeEvent } from 'react';
import React, { useReducer } from 'react';
import type { RestrictionItemProps } from '../ItemRestrictions';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { IntRestrictionKey } from '@altinn/schema-model';
import { useTranslation } from 'react-i18next';
import classes from './NumberRestrictions.module.css';
import { ErrorMessage, Switch } from '@digdir/designsystemet-react';
import type {
  NumberRestrictionsReducerAction,
  NumberRestrictionsReducerState,
} from './NumberRestrictionsReducer';
import {
  numberRestrictionsReducer,
  NumberRestrictionsReducerActionType,
} from './NumberRestrictionsReducer';
import { NumberRestrictionsError } from '@altinn/schema-editor/types';
import { ValidationUtils } from '@studio/pure-functions';
import { StudioTextfield } from '@studio/components';
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

  const handleMinMaxChange = (
    event: React.ChangeEvent<HTMLInputElement> | React.FocusEvent<HTMLInputElement>,
    actionType:
      | NumberRestrictionsReducerActionType.setMin
      | NumberRestrictionsReducerActionType.setMax,
  ) => {
    const newValue = event.target.value.trim();
    dispatchAction(
      actionType,
      ValidationUtils.valueExists(newValue) ? parseFloat(newValue) : undefined,
    );
  };

  const onChangeMinNumber = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleMinMaxChange(event, NumberRestrictionsReducerActionType.setMin);
  };

  const onBlurMinNumber = (event: React.FocusEvent<HTMLInputElement>) => {
    handleMinMaxChange(event, NumberRestrictionsReducerActionType.setMin);
  };

  const onChangeMaxNumber = (event: React.ChangeEvent<HTMLInputElement>) => {
    handleMinMaxChange(event, NumberRestrictionsReducerActionType.setMax);
  };

  const onBlurMaxNumber = (event: React.FocusEvent<HTMLInputElement>) => {
    handleMinMaxChange(event, NumberRestrictionsReducerActionType.setMax);
  };

  return (
    <ItemWrapper>
      <div>
        <div className={classes.formatFieldsRowContent}>
          <div>
            <StudioTextfield
              id='schema_editor.minimum_'
              onChange={onChangeMinNumber}
              onBlur={onBlurMinNumber}
              value={formatState.min === undefined ? '' : formatState.min.toString()}
              type='number'
              label={t(minLabel)}
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
        <div className={classes.formatFieldsRowContent}>
          <div>
            <StudioTextfield
              id='schema_editor.maximum_'
              onChange={onChangeMaxNumber}
              onBlur={onBlurMaxNumber}
              value={formatState.max === undefined ? '' : formatState.max.toString()}
              type='number'
              label={t(maxLabel)}
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
        <div className={classes.formatFieldsRowContent}>
          <StudioTextfield
            id='schema_editor.multipleOf'
            type='number'
            label={t('schema_editor.multipleOf')}
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
