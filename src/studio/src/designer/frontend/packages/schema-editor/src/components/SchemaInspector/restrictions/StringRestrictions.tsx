import React, { useState } from 'react';
import { RestrictionItemProps } from '../ItemRestrictions';
import { RestrictionField } from '../RestrictionField';
import { getTranslation } from '../../../utils/language';
import classes from './StringRestrictions.module.css';
import { TextField } from '@altinn/altinn-design-system';
import { Divider } from '../Divider';
import { Label } from '../Label';
import { StrRestrictionKeys } from '@altinn/schema-model';

export function StringRestrictions({ restrictions, path, language, onChangeRestrictionValue }: RestrictionItemProps) {
  const t = (key: string) => getTranslation(key, language);
  const [regexTestValue, setRegexTestValue] = useState<string>('');
  const pattern = restrictions[StrRestrictionKeys.pattern] || '';
  const regexTestValueSplitByMatches = splitStringByMatches(pattern, regexTestValue);
  const regexTestValueMatchesRegex = regexTestValueSplitByMatches.some(({ match }) => match);

  return (
    <div>
      <div className={classes.lengthFields}>
        <RestrictionField
          className={classes.lengthField}
          keyName={StrRestrictionKeys.minLength}
          label={t(StrRestrictionKeys.minLength)}
          onChangeValue={onChangeRestrictionValue}
          path={path}
          value={restrictions[StrRestrictionKeys.minLength] || ''}
        />
        <RestrictionField
          className={classes.lengthField}
          keyName={StrRestrictionKeys.maxLength}
          label={t(StrRestrictionKeys.maxLength)}
          onChangeValue={onChangeRestrictionValue}
          path={path}
          value={restrictions[StrRestrictionKeys.maxLength] || ''}
        />
      </div>
      <Divider />
      <RestrictionField
        keyName={StrRestrictionKeys.pattern}
        label={t(StrRestrictionKeys.pattern)}
        onChangeValue={onChangeRestrictionValue}
        path={path}
        value={pattern}
      />
      <div className={classes.regexTestLabel}>
        <Label htmlFor='regextestfield'>{t('pattern_test_field')}</Label>
        {pattern &&
          (regexTestValueMatchesRegex ? (
            <span className={classes.regexTestMatchIndicatorTrue}>{t('pattern_matches')}</span>
          ) : (
            <span className={classes.regexTestMatchIndicatorFalse}>{t('pattern_does_not_match')}</span>
          ))}
      </div>
      <div className={classes.regexTestContainer}>
        <div className={classes.regexTestStyleField}>
          {regexTestValueSplitByMatches.map((strPart, i) => (
            <span className={strPart.match ? classes.regexTestMatch : undefined} key={`regexTestPart${i}`}>
              {strPart.str}
            </span>
          ))}
        </div>
        <TextField
          id='regextestfield'
          onChange={(event) => setRegexTestValue(event.target.value)}
          value={regexTestValue}
        />
      </div>
    </div>
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
