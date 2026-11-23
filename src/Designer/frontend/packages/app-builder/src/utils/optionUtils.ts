import type { OptionListsResponse } from 'app-shared/types/api/OptionListsResponse';
import type { Option } from 'app-shared/types/Option';
import type { LayoutComponent, TextsById } from '../types';

/**
 * The code list for yes or no questions. The builder creates it in the app the first time a
 * component uses it, since apps have no built-in list.
 */
export const YES_NO_CODE_LIST_ID = 'janei';

export const yesNoOptions: Option[] = [
  { value: 'ja', label: 'Ja' },
  { value: 'nei', label: 'Nei' },
];

export type OptionSource = 'inline' | 'codeList';

/** An option with its label as the user sees it. */
export type ResolvedOption = {
  value: string;
  label: string;
};

/**
 * An option written on the component, as it is in the layout file. Its other properties, such as a
 * description or help text, are kept when the options are changed.
 */
export type InlineOption = {
  value: string | number | boolean;
  /** The text resource key of the label. */
  label: string;
  [property: string]: unknown;
};

export function getOptionSource(component: LayoutComponent): OptionSource {
  return typeof component.optionsId === 'string' ? 'codeList' : 'inline';
}

export function getInlineOptions(component: LayoutComponent): InlineOption[] {
  const options: unknown[] = Array.isArray(component.options) ? component.options : [];
  return options.map((option: Record<string, unknown>) => ({
    ...option,
    value: option.value as InlineOption['value'],
    label: String(option.label),
  }));
}

/** The options of a component with their labels, from its inline options or its code list. */
export function resolveOptions(
  component: LayoutComponent,
  texts: TextsById,
  codeLists: OptionListsResponse | undefined,
): ResolvedOption[] {
  if (getOptionSource(component) === 'codeList') {
    const codeList = findCodeList(codeLists, component.optionsId);
    return codeList.map(({ value, label }) => ({
      value: String(value),
      label: texts[label] ?? label,
    }));
  }
  return getInlineOptions(component).map(({ value, label }) => ({
    value: String(value),
    label: texts[label] ?? label,
  }));
}

export function findCodeList(
  codeLists: OptionListsResponse | undefined,
  codeListId: string,
): Option[] {
  if (codeListId === YES_NO_CODE_LIST_ID && !codeLists?.some(({ title }) => title === codeListId)) {
    return yesNoOptions;
  }
  return codeLists?.find(({ title }) => title === codeListId)?.data ?? [];
}

/** The code lists the user can choose from: the app's own, and yes or no. */
export function getCodeListIds(codeLists: OptionListsResponse | undefined): string[] {
  const ids = (codeLists ?? []).filter(({ hasError }) => !hasError).map(({ title }) => title);
  return ids.includes(YES_NO_CODE_LIST_ID) ? ids : [YES_NO_CODE_LIST_ID, ...ids];
}

export function hasCodeList(
  codeLists: OptionListsResponse | undefined,
  codeListId: string,
): boolean {
  return Boolean(codeLists?.some(({ title }) => title === codeListId));
}

/** Returns a value no inline option has, so a new option can be told apart from the others. */
export function getNextOptionValue(options: InlineOption[]): string {
  const numbers = options.map(({ value }) => Number(value)).filter(Number.isInteger);
  return String(Math.max(0, ...numbers) + 1);
}
