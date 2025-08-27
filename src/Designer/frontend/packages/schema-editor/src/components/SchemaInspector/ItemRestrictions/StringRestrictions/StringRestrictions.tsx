import type { ChangeEvent } from 'react';
import React, { useReducer, useState } from 'react';
import type { RestrictionItemProps } from '../ItemRestrictions';
import { RestrictionField } from '../RestrictionField';
import classes from './StringRestrictions.module.css';
import { Fieldset, Label, Switch } from '@digdir/designsystemet-react';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { StringFormat, StrRestrictionKey } from '@altinn/schema-model/index';
import { makeDomFriendlyID } from '../../../../utils/ui-schema-utils';
import type { StringRestrictionsReducerAction } from './StringRestrictionsReducer';
import {
  stringRestrictionsReducer,
  StringRestrictionsReducerActionType,
} from './StringRestrictionsReducer';
import { useTranslation } from 'react-i18next';
import { StudioNativeSelect, StudioTextfield } from 'libs/studio-components-legacy/src';
import { ItemWrapper } from '../ItemWrapper';

export function StringRestrictions({
  onChangeRestrictionValue,
  onChangeRestrictions,
  path,
  restrictions,
}: RestrictionItemProps) {
  const translation = useTranslation();
  const t = (key: string) => translation.t('schema_editor.' + key);
  const [regexTestValue, setRegexTestValue] = useState<string>('');
  const pattern = restrictions[StrRestrictionKey.pattern] || '';
  const regexTestValueSplitByMatches = splitStringByMatches(pattern, regexTestValue);
  const regexTestValueMatchesRegex = regexTestValueSplitByMatches.some(({ match }) => match);
  const fieldId = makeDomFriendlyID('regextestfield');
  const handleValueChange = (value: string): void => {
    if (regexTestValue !== value) {
      setRegexTestValue(value);
    }
  };

  const [formatState, dispatch] = useReducer(stringRestrictionsReducer, {
    earliestIsInclusive: restrictions[StrRestrictionKey.formatExclusiveMinimum] === undefined,
    latestIsInclusive: restrictions[StrRestrictionKey.formatExclusiveMaximum] === undefined,
    earliest:
      restrictions[StrRestrictionKey.formatExclusiveMinimum] ??
      restrictions[StrRestrictionKey.formatMinimum],
    latest:
      restrictions[StrRestrictionKey.formatExclusiveMaximum] ??
      restrictions[StrRestrictionKey.formatMaximum],
    restrictions: Object.fromEntries(
      Object.values(StrRestrictionKey).map((key) => [key, restrictions[key]]),
    ),
  });

  const changeCallback = (changedRestrictions: KeyValuePairs) => {
    onChangeRestrictions(path, changedRestrictions);
  };

  const setRestriction = (restriction: StrRestrictionKey, value: string) =>
    dispatch({
      type: StringRestrictionsReducerActionType.setRestriction,
      restriction,
      value,
      changeCallback,
    });

  const dispatchAction = (type: StringRestrictionsReducerActionType, value: any) =>
    dispatch({ type, value, changeCallback } as StringRestrictionsReducerAction);

  const formatOptions = Object.values(StringFormat).map((f) => ({
    key: f,
    value: f as string,
    label: t(`format_${f}`),
  }));
  const formatMinLangKey = `format_date_after_${formatState.earliestIsInclusive ? 'incl' : 'excl'}`;
  const formatMaxLangKey = `format_date_before_${formatState.latestIsInclusive ? 'incl' : 'excl'}`;

  return (
    <ItemWrapper>
      <StudioNativeSelect
        id='format-select-input'
        label={t('format')}
        onChange={(event) => setRestriction(StrRestrictionKey.format, event.target.value)}
        value={restrictions[StrRestrictionKey.format] || ''}
        size='sm'
      >
        <option value=''>{t('format_none')}</option>
        {formatOptions.map((f) => (
          <option key={f.key} value={f.value}>
            {f.label}
          </option>
        ))}
      </StudioNativeSelect>
      {[StringFormat.Date, StringFormat.DateTime, StringFormat.Time].includes(
        restrictions[StrRestrictionKey.format],
      ) && (
        <>
          <div>
            <div className={classes.formatFieldsRowContent}>
              <StudioTextfield
                label={t(formatMinLangKey)}
                onChange={(e) =>
                  dispatchAction(StringRestrictionsReducerActionType.setEarliest, e.target.value)
                }
                value={formatState.earliest}
              />
              <Switch
                size='small'
                checked={formatState.earliestIsInclusive}
                onChange={(e) =>
                  dispatchAction(StringRestrictionsReducerActionType.setMinIncl, e.target.checked)
                }
              >
                {t('format_date_inclusive')}
              </Switch>
            </div>
          </div>
          <div>
            <div className={classes.formatFieldsRowContent}>
              <StudioTextfield
                label={t(formatMaxLangKey)}
                onChange={(e) =>
                  dispatchAction(StringRestrictionsReducerActionType.setLatest, e.target.value)
                }
                value={formatState.latest}
              />
              <Switch
                size='small'
                checked={formatState.latestIsInclusive}
                onChange={(e) =>
                  dispatchAction(StringRestrictionsReducerActionType.setMaxIncl, e.target.checked)
                }
              >
                {t('format_date_inclusive')}
              </Switch>
            </div>
          </div>
        </>
      )}
      <div className={classes.lengthFields}>
        <div className={classes.lengthField}>
          <StudioTextfield
            type='number'
            label={t(StrRestrictionKey.minLength)}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setRestriction(StrRestrictionKey.minLength, e.target.value)
            }
            value={restrictions[StrRestrictionKey.minLength] || ''}
          />
        </div>
        <div className={classes.lengthField}>
          <StudioTextfield
            type='number'
            label={t(StrRestrictionKey.maxLength)}
            onChange={(e: ChangeEvent<HTMLInputElement>) =>
              setRestriction(StrRestrictionKey.maxLength, e.target.value)
            }
            value={restrictions[StrRestrictionKey.maxLength] || ''}
          />
        </div>
      </div>
      <Fieldset legend={t('regex')}>
        <RestrictionField
          keyName={StrRestrictionKey.pattern}
          label={t(StrRestrictionKey.pattern)}
          onChangeValue={onChangeRestrictionValue}
          path={path}
          value={pattern}
        />
        <div className={classes.regexTest}>
          <div className={classes.regexTestLabel}>
            <Label htmlFor={fieldId}>{t('pattern_test_field')}</Label>
            {pattern &&
              (regexTestValueMatchesRegex ? (
                <span className={classes.regexTestMatchIndicatorTrue}>{t('pattern_matches')}</span>
              ) : (
                <span className={classes.regexTestMatchIndicatorFalse}>
                  {t('pattern_does_not_match')}
                </span>
              ))}
          </div>
          <div className={classes.regexTestFieldContainer}>
            <div className={classes.regexTestStyleField}>
              {regexTestValueSplitByMatches.map((strPart, i) => (
                <span
                  className={strPart.match ? classes.regexTestMatch : undefined}
                  key={`regexTestPart${i}`}
                >
                  {strPart.str}
                </span>
              ))}
            </div>
            <StudioTextfield
              id={fieldId}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                handleValueChange(event.target.value)
              }
              value={regexTestValue}
            />
          </div>
        </div>
      </Fieldset>
    </ItemWrapper>
  );
}

interface StrPart {
  str: string;
  match: boolean;
}

function splitStringByMatches(pattern: string, value: string): StrPart[] {
  const defaultResult = [{ str: value, match: false }];
  if (!pattern) return defaultResult;
  try {
    const patternRegex = new RegExp(pattern, 'g');
    let match: RegExpExecArray;
    const strParts: StrPart[] = [];
    let lastIndex = 0;
    while (value && (match = patternRegex.exec(value)) !== null) {
      if (match.index > lastIndex) {
        strParts.push({ str: value.substring(lastIndex, match.index), match: false });
      }
      strParts.push({ str: value.substring(match.index, patternRegex.lastIndex), match: true });
      lastIndex = patternRegex.lastIndex;
      if (patternRegex.lastIndex === match.index) {
        // This is to avoid an infinite loop if the regex matches zero-length characters
        patternRegex.lastIndex++;
      }
    }
    if (lastIndex < value.length) {
      strParts.push({ str: value.substring(lastIndex), match: false });
    }
    return strParts;
  } catch (e) {
    return defaultResult;
  }
}
