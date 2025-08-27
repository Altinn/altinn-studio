import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { StringFormat, StrRestrictionKey } from '@altinn/schema-model/types';

export function isDateOrTimeFormat(stringRestrictions: KeyValuePairs): boolean {
  return [StringFormat.Date, StringFormat.DateTime, StringFormat.Time].includes(
    stringRestrictions.format,
  );
}

export function isEarliestInclusive(stringRestrictions: KeyValuePairs): boolean {
  return stringRestrictions[StrRestrictionKey.formatExclusiveMinimum] === undefined;
}

export function isLatestInclusive(stringRestrictions: KeyValuePairs): boolean {
  return stringRestrictions[StrRestrictionKey.formatExclusiveMaximum] === undefined;
}

export function getFormatMinimum(stringRestrictions: KeyValuePairs): string | undefined {
  return (
    stringRestrictions[StrRestrictionKey.formatExclusiveMinimum] ??
    stringRestrictions[StrRestrictionKey.formatMinimum]
  );
}

export function getFormatMaximum(stringRestrictions: KeyValuePairs): string | undefined {
  return (
    stringRestrictions[StrRestrictionKey.formatExclusiveMaximum] ??
    stringRestrictions[StrRestrictionKey.formatMaximum]
  );
}
