import type { ChangeEvent, ChangeEventHandler } from 'react';
import React, { useCallback, useState, useMemo } from 'react';
import type { RestrictionItemProps } from '../ItemRestrictions';
import { RestrictionField } from '../RestrictionField';
import classes from './StringRestrictions.module.css';
import { Fieldset, Switch } from '@digdir/designsystemet-react';
import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { StringFormat, StrRestrictionKey } from '@altinn/schema-model';
import { makeDomFriendlyID } from '../../../../utils/ui-schema-utils';
import { useTranslation } from 'react-i18next';
import { StudioNativeSelect } from '@studio/components-legacy';
import { StudioTextfield } from '@studio/components';
import { ItemWrapper } from '../ItemWrapper';
import {
  isDateOrTimeFormat,
  updateRestriction,
  retrieveDateTimeFormatState,
  updateDateTimeRestrictions,
  updateEarliest,
  updateLatest,
  updateEarliestInclusivity,
  updateLatestInclusivity,
} from './utils';
import type { DateTimeFormatState } from './utils';

export function StringRestrictions({
  onChangeRestrictionValue,
  onChangeRestrictions,
  path,
  restrictions,
}: RestrictionItemProps) {
  const translation = useTranslation();
  const t = (key: string) => translation.t('schema_editor.' + key);
  const restrictionMinLength = restrictions[StrRestrictionKey.minLength] || '';
  const restrictionMaxLength = restrictions[StrRestrictionKey.maxLength] || '';
  const [regexTestValue, setRegexTestValue] = useState<string>('');
  const [minLength, setMinLength] = useState<string>(restrictionMinLength);
  const [maxLength, setMaxLength] = useState<string>(restrictionMaxLength);
  const pattern = restrictions[StrRestrictionKey.pattern] || '';
  const regexTestValueSplitByMatches = splitStringByMatches(pattern, regexTestValue);
  const regexTestValueMatchesRegex = regexTestValueSplitByMatches.some(({ match }) => match);
  const fieldId = makeDomFriendlyID('regextestfield');
  const handleValueChange = (value: string): void => {
    if (regexTestValue !== value) {
      setRegexTestValue(value);
    }
  };

  const changeCallback = useCallback(
    (changedRestrictions: KeyValuePairs) => {
      onChangeRestrictions(path, changedRestrictions);
    },
    [onChangeRestrictions, path],
  );

  const setRestriction = useCallback(
    (key: StrRestrictionKey, value: string): void => {
      const updatedRestrictions = updateRestriction(restrictions, key, value);
      changeCallback(updatedRestrictions);
    },
    [restrictions, changeCallback],
  );

  const handleUpdateDateTimeRestrictions = useCallback(
    (dateTimeFormatState: DateTimeFormatState): void => {
      const newRestrictions = updateDateTimeRestrictions(restrictions, dateTimeFormatState);
      changeCallback(newRestrictions);
    },
    [restrictions, changeCallback],
  );

  const dateTimeFormatState = useMemo(
    () => retrieveDateTimeFormatState(restrictions),
    [restrictions],
  );

  const formatOptions = Object.values(StringFormat).map((f) => ({
    key: f,
    value: f as string,
    label: t(`format_${f}`),
  }));

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
      {isDateOrTimeFormat(restrictions) && (
        <DateOrTimeFormatRestrictions
          formatState={dateTimeFormatState}
          onUpdateFormatState={handleUpdateDateTimeRestrictions}
        />
      )}
      <div className={classes.lengthFields}>
        <div className={classes.lengthField}>
          <StudioTextfield
            type='number'
            label={t(StrRestrictionKey.minLength)}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setMinLength(e.target.value)}
            onBlur={(e: React.FocusEvent<HTMLInputElement>) =>
              setRestriction(StrRestrictionKey.minLength, e.target.value)
            }
            value={minLength}
          />
        </div>
        <div className={classes.lengthField}>
          <StudioTextfield
            type='number'
            label={t(StrRestrictionKey.maxLength)}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setMaxLength(e.target.value)}
            onBlur={(e: React.FocusEvent<HTMLInputElement>) =>
              setRestriction(StrRestrictionKey.maxLength, e.target.value)
            }
            value={maxLength}
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
            <div className={classes.lengthField}>
              <StudioTextfield
                label={t('pattern_test_field')}
                id={fieldId}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  handleValueChange(event.target.value)
                }
                value={regexTestValue}
              />
            </div>
          </div>
        </div>
      </Fieldset>
    </ItemWrapper>
  );
}

type DateOrTimeFormatRestrictionsProps = {
  formatState: DateTimeFormatState;
  onUpdateFormatState: (formatState: DateTimeFormatState) => void;
};

function DateOrTimeFormatRestrictions({
  formatState,
  onUpdateFormatState,
}: DateOrTimeFormatRestrictionsProps) {
  const translation = useTranslation();
  const t = (key: string) => translation.t('schema_editor.' + key);

  const formatMinLangKey = `format_date_after_${formatState.earliestIsInclusive ? 'incl' : 'excl'}`;
  const formatMaxLangKey = `format_date_before_${formatState.latestIsInclusive ? 'incl' : 'excl'}`;

  const handleSetEarliest: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const newFormatState = updateEarliest(formatState, e.target.value);
      onUpdateFormatState(newFormatState);
    },
    [onUpdateFormatState, formatState],
  );

  const handleSetLatest: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const newFormatState = updateLatest(formatState, e.target.value);
      onUpdateFormatState(newFormatState);
    },
    [onUpdateFormatState, formatState],
  );

  const handleSetMinIncl: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const newFormatState = updateEarliestInclusivity(formatState, e.target.checked);
      onUpdateFormatState(newFormatState);
    },
    [onUpdateFormatState, formatState],
  );

  const handleSetMaxIncl: ChangeEventHandler<HTMLInputElement> = useCallback(
    (e) => {
      const newFormatState = updateLatestInclusivity(formatState, e.target.checked);
      onUpdateFormatState(newFormatState);
    },
    [onUpdateFormatState, formatState],
  );

  return (
    <>
      <div>
        <div className={classes.formatFieldsRowContent}>
          <StudioTextfield
            label={t(formatMinLangKey)}
            onChange={handleSetEarliest}
            value={formatState.earliest}
          />
          <Switch
            size='small'
            checked={formatState.earliestIsInclusive}
            onChange={handleSetMinIncl}
          >
            {t('format_date_inclusive')}
          </Switch>
        </div>
      </div>
      <div>
        <div className={classes.formatFieldsRowContent}>
          <StudioTextfield
            label={t(formatMaxLangKey)}
            onChange={handleSetLatest}
            value={formatState.latest}
          />
          <Switch size='small' checked={formatState.latestIsInclusive} onChange={handleSetMaxIncl}>
            {t('format_date_inclusive')}
          </Switch>
        </div>
      </div>
    </>
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
