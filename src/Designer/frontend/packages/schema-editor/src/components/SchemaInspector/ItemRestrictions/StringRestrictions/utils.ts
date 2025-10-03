import type { KeyValuePairs } from 'app-shared/types/KeyValuePairs';
import { StringFormat, StrRestrictionKey } from '@altinn/schema-model/types';
import { ObjectUtils } from '@studio/pure-functions';

export function isDateOrTimeFormat(stringRestrictions: KeyValuePairs): boolean {
  return [StringFormat.Date, StringFormat.DateTime, StringFormat.Time].includes(
    stringRestrictions.format,
  );
}

export function updateFormat(
  stringRestrictions: KeyValuePairs,
  format: StringFormat | null,
): KeyValuePairs {
  if (stringRestrictions.format === format) return stringRestrictions;
  const cleanRestrictions = removeFormatSpecificRestrictions(stringRestrictions);
  return format ? { ...cleanRestrictions, format } : cleanRestrictions;
}

function removeFormatSpecificRestrictions(stringRestrictions: KeyValuePairs): KeyValuePairs {
  const formatSpecificRestrictions = [
    StrRestrictionKey.format,
    StrRestrictionKey.formatExclusiveMinimum,
    StrRestrictionKey.formatMinimum,
    StrRestrictionKey.formatExclusiveMaximum,
    StrRestrictionKey.formatMaximum,
  ];
  return removeRestrictions(stringRestrictions, formatSpecificRestrictions);
}

function removeRestrictions(
  stringRestrictions: KeyValuePairs,
  keys: StrRestrictionKey[],
): KeyValuePairs {
  const entries = Object.entries(stringRestrictions);
  const filteredEntries = entries.filter(([key]) => !keys.includes(key as StrRestrictionKey));
  return Object.fromEntries(filteredEntries);
}

export function updateRestriction(
  stringRestrictions: KeyValuePairs,
  key: StrRestrictionKey,
  value: string | number,
): KeyValuePairs {
  const newRestrictions = ObjectUtils.deepCopy(stringRestrictions);
  newRestrictions[key] = value;
  return newRestrictions;
}

export function removeRestriction(
  stringRestrictions: KeyValuePairs,
  key: StrRestrictionKey,
): KeyValuePairs {
  const newRestrictions = ObjectUtils.deepCopy(stringRestrictions);
  delete newRestrictions[key];
  return newRestrictions;
}

export type DateTimeFormatState = {
  earliestIsInclusive: boolean;
  latestIsInclusive: boolean;
  earliest: string;
  latest: string;
};

export function retrieveDateTimeFormatState(
  stringRestrictions: KeyValuePairs,
): DateTimeFormatState {
  return {
    earliestIsInclusive: isEarliestInclusive(stringRestrictions),
    latestIsInclusive: isLatestInclusive(stringRestrictions),
    earliest: getEarliest(stringRestrictions),
    latest: getLatest(stringRestrictions),
  };
}

function isEarliestInclusive(stringRestrictions: KeyValuePairs): boolean {
  return stringRestrictions[StrRestrictionKey.formatExclusiveMinimum] === undefined;
}

function isLatestInclusive(stringRestrictions: KeyValuePairs): boolean {
  return stringRestrictions[StrRestrictionKey.formatExclusiveMaximum] === undefined;
}

function getEarliest(stringRestrictions: KeyValuePairs): string {
  return (
    stringRestrictions[StrRestrictionKey.formatExclusiveMinimum] ??
    stringRestrictions[StrRestrictionKey.formatMinimum] ??
    ''
  );
}

function getLatest(stringRestrictions: KeyValuePairs): string {
  return (
    stringRestrictions[StrRestrictionKey.formatExclusiveMaximum] ??
    stringRestrictions[StrRestrictionKey.formatMaximum] ??
    ''
  );
}

export function updateEarliest(
  formatState: DateTimeFormatState,
  earliest: string,
): DateTimeFormatState {
  return {
    ...formatState,
    earliest,
  };
}

export function updateLatest(
  formatState: DateTimeFormatState,
  latest: string,
): DateTimeFormatState {
  return {
    ...formatState,
    latest,
  };
}

export function updateEarliestInclusivity(
  formatState: DateTimeFormatState,
  isInclusive: boolean,
): DateTimeFormatState {
  return {
    ...formatState,
    earliestIsInclusive: isInclusive,
  };
}

export function updateLatestInclusivity(
  formatState: DateTimeFormatState,
  isInclusive: boolean,
): DateTimeFormatState {
  return {
    ...formatState,
    latestIsInclusive: isInclusive,
  };
}

export function updateDateTimeRestrictions(
  allRestrictions: KeyValuePairs,
  dateTimeFormatState: DateTimeFormatState,
): KeyValuePairs {
  const newRestrictions = ObjectUtils.deepCopy(allRestrictions);
  delete newRestrictions[StrRestrictionKey.formatExclusiveMinimum];
  delete newRestrictions[StrRestrictionKey.formatMinimum];
  delete newRestrictions[StrRestrictionKey.formatExclusiveMaximum];
  delete newRestrictions[StrRestrictionKey.formatMaximum];
  return {
    ...newRestrictions,
    ...retrieveDateTimeRestrictions(dateTimeFormatState),
  };
}

type DateTimeRestrictions = {
  [StrRestrictionKey.formatExclusiveMinimum]?: string;
  [StrRestrictionKey.formatMinimum]?: string;
  [StrRestrictionKey.formatExclusiveMaximum]?: string;
  [StrRestrictionKey.formatMaximum]?: string;
};

function retrieveDateTimeRestrictions(formatState: DateTimeFormatState): DateTimeRestrictions {
  const restrictions: DateTimeRestrictions = {
    [StrRestrictionKey.formatExclusiveMinimum]: getExclusiveMinimumFromFormatState(formatState),
    [StrRestrictionKey.formatMinimum]: getMinimumFromFormatState(formatState),
    [StrRestrictionKey.formatExclusiveMaximum]: getExclusiveMaximumFromFormatState(formatState),
    [StrRestrictionKey.formatMaximum]: getMaximumFromFormatState(formatState),
  };
  return ObjectUtils.deleteUndefined(restrictions);
}

function getExclusiveMaximumFromFormatState(formatState: DateTimeFormatState): string | undefined {
  return formatState.latestIsInclusive ? undefined : formatState.latest || undefined;
}

function getMaximumFromFormatState(formatState: DateTimeFormatState): string | undefined {
  return formatState.latestIsInclusive ? formatState.latest || undefined : undefined;
}

function getExclusiveMinimumFromFormatState(formatState: DateTimeFormatState): string | undefined {
  return formatState.earliestIsInclusive ? undefined : formatState.earliest || undefined;
}

function getMinimumFromFormatState(formatState: DateTimeFormatState): string | undefined {
  return formatState.earliestIsInclusive ? formatState.earliest || undefined : undefined;
}
