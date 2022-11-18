import React, { ChangeEvent, useReducer, useState } from 'react';
import { RestrictionItemProps } from '../ItemRestrictions';
import { RestrictionField } from '../RestrictionField';
import { getTranslation } from '../../../utils/language';
import classes from './StringRestrictions.module.css';
import { Checkbox, FieldSet, Select, TextField } from '@altinn/altinn-design-system';
import { Dict, StringFormat, StrRestrictionKeys } from '@altinn/schema-model';
import { Divider } from 'app-shared/primitives';
import { Label } from '../../common/Label';
import { getDomFriendlyID } from '../../../utils/ui-schema-utils';
import {
  stringRestrictionsReducer,
  StringRestrictionsReducerAction,
  StringRestrictionsReducerActionType
} from './StringRestrictionsReducer';

export function StringRestrictions({
  language,
  onChangeRestrictionValue,
  onChangeRestrictions,
  path,
  restrictions
}: RestrictionItemProps) {
  const t = (key: string) => getTranslation(key, language);
  const [regexTestValue, setRegexTestValue] = useState<string>('');
  const pattern = restrictions[StrRestrictionKeys.pattern] || '';
  const regexTestValueSplitByMatches = splitStringByMatches(pattern, regexTestValue);
  const regexTestValueMatchesRegex = regexTestValueSplitByMatches.some(({ match }) => match);
  const fieldId = getDomFriendlyID('regextestfield');
  const handleValueChange = (event: ChangeEvent) => {
    const value = (event.target as HTMLInputElement)?.value || '';
    if (regexTestValue !== value) {
      setRegexTestValue(value);
    }
  };

  const [formatState, dispatch] = useReducer(stringRestrictionsReducer, {
    earliestIsInclusive: restrictions[StrRestrictionKeys.formatExclusiveMinimum] === undefined,
    latestIsInclusive: restrictions[StrRestrictionKeys.formatExclusiveMaximum] === undefined,
    earliest: restrictions[StrRestrictionKeys.formatExclusiveMinimum] ?? restrictions[StrRestrictionKeys.formatMinimum],
    latest: restrictions[StrRestrictionKeys.formatExclusiveMaximum] ?? restrictions[StrRestrictionKeys.formatMaximum],
    restrictions: Object.fromEntries(Object.values(StrRestrictionKeys).map((key) => [key, restrictions[key]]))
  });

  const changeCallback = (restrictions: Dict) => {
    onChangeRestrictions(path, restrictions);
  };

  const setRestriction = (restriction: StrRestrictionKeys, value: string) =>
    dispatch({ type: StringRestrictionsReducerActionType.setRestriction, restriction, value, changeCallback });

  const dispatchAction = (type: StringRestrictionsReducerActionType, value: any) =>
    dispatch({ type, value, changeCallback } as StringRestrictionsReducerAction);

  const noFormatOption = { label: t('format_none'), value: '' };
  const formatMinLangKey = 'format_date_after_' + (formatState.earliestIsInclusive ? 'incl' : 'excl');
  const formatMaxLangKey = 'format_date_before_' + (formatState.latestIsInclusive ? 'incl' : 'excl');

  return (
    <>
      <Divider inMenu />
      <Select
        inputId='format-select-input'
        label={t('format')}
        onChange={(value: string) => setRestriction(StrRestrictionKeys.format, value)}
        options={[noFormatOption, ...Object.values(StringFormat).map((f) => ({
          label: t(`format_${f}`),
          value: f as string,
        }))]}
        value={restrictions[StrRestrictionKeys.format] || ''}
      />
      {[
        StringFormat.Date,
        StringFormat.DateTime,
        StringFormat.Time
      ].includes(restrictions[StrRestrictionKeys.format]) && (
        <>
          <div>
            <Label htmlFor='format-after-field'>{t(formatMinLangKey)}</Label>
            <div className={classes.formatFieldsRowContent}>
              <TextField
                id='format-after-field'
                onChange={e => dispatchAction(StringRestrictionsReducerActionType.setEarliest, e.target.value)}
                value={formatState.earliest}
              />
              <Checkbox
                checked={formatState.earliestIsInclusive}
                label={t('format_date_inclusive')}
                onChange={e => dispatchAction(StringRestrictionsReducerActionType.setMinIncl, e.target.checked)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor='format-before-field'>{t(formatMaxLangKey)}</Label>
            <div className={classes.formatFieldsRowContent}>
              <TextField
                id='format-before-field'
                onChange={e => dispatchAction(StringRestrictionsReducerActionType.setLatest, e.target.value)}
                value={formatState.latest}
              />
              <Checkbox
                checked={formatState.latestIsInclusive}
                label={t('format_date_inclusive')}
                onChange={e => dispatchAction(StringRestrictionsReducerActionType.setMaxIncl, e.target.checked)}
              />
            </div>
          </div>
        </>
      )}
      <div className={classes.lengthFields}>
        <div className={classes.lengthField}>
          <TextField
            formatting={{number: {}}}
            label={t(StrRestrictionKeys.minLength)}
            onChange={(e) => setRestriction(StrRestrictionKeys.minLength, e.target.value)}
            value={restrictions[StrRestrictionKeys.minLength] || ''}
          />
        </div>
        <div className={classes.lengthField}>
          <TextField
            formatting={{number: {}}}
            label={t(StrRestrictionKeys.maxLength)}
            onChange={(e) => setRestriction(StrRestrictionKeys.maxLength, e.target.value)}
            value={restrictions[StrRestrictionKeys.maxLength] || ''}
          />
        </div>
      </div>
      <Divider inMenu />
      <FieldSet className={classes.fieldSet} legend={t('regex')}>
        <RestrictionField
          keyName={StrRestrictionKeys.pattern}
          label={t(StrRestrictionKeys.pattern)}
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
                <span className={classes.regexTestMatchIndicatorFalse}>{t('pattern_does_not_match')}</span>
              ))}
          </div>
          <div className={classes.regexTestFieldContainer}>
            <div className={classes.regexTestStyleField}>
              {regexTestValueSplitByMatches.map((strPart, i) => (
                <span className={strPart.match ? classes.regexTestMatch : undefined} key={`regexTestPart${i}`}>
                  {strPart.str}
                </span>
              ))}
            </div>
            <TextField id={fieldId} onChange={handleValueChange} value={regexTestValue} />
          </div>
        </div>
      </FieldSet>
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
    let match;
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
