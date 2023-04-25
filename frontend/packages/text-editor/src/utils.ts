import ISO6391 from 'iso-639-1';
import type { Option, TextTableRow, TextTableRowEntry } from './types';
import { ITextResources } from 'app-shared/types/global';
import { alphabeticalCompareFunction } from 'app-shared/utils/compareFunctions';

const intlNb = new Intl.DisplayNames(['nb'], { type: 'language' });

type GetLangName = {
  code: string;
  intlDisplayNames?: Intl.DisplayNames;
};

export const getLangName = ({ code, intlDisplayNames = intlNb }: GetLangName) => {
  if (!code) {
    return '';
  }

  const langName = intlDisplayNames.of(code);
  if (langName !== code) {
    return langName;
  }

  const langNameInEnglish = ISO6391.getName(code);
  if (langNameInEnglish !== '') {
    // Change case to lowercase, to "match" the names returned from Intl.DisplayNames
    // This needs to change if we start supporting DisplayNames in other langs
    return langNameInEnglish.toLowerCase();
  }

  return code;
};

type GetRandNumber = {
  min?: number;
  max?: number;
};

export const getRandNumber = ({ min = 1000, max = 9999 }: GetRandNumber = {}) =>
  Math.floor(Math.random() * (max - min + 1) + min);

export const langOptions: Option[] = ISO6391.getAllCodes()
  .map((code: string) => ({
    value: code,
    label: getLangName({ code }),
  }))
  .sort((a, b) => a.label.localeCompare(b.label));

export const filterFunction = (
  id: string | undefined,
  textTableRowEntries: TextTableRowEntry[] | undefined,
  searchQuery: string | undefined
) =>
  !searchQuery ||
  searchQuery.length < 1 ||
  id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
  textTableRowEntries.filter((entry) => entry.translation.includes(searchQuery)).length > 0;

export const mapResourceFilesToTableRows = (files: ITextResources): TextTableRow[] => {
  const rows = new Map();
  Object.entries(files).forEach(([lang, resources]) =>
    resources
      .sort((a, b) => alphabeticalCompareFunction(a.id, b.id))
      .forEach((resource) => {
        if (!rows.has(resource.id)) {
          rows.set(resource.id, {
            textKey: resource.id,
            variables: resource.variables,
            translations: [],
          });
        }
        rows.get(resource.id).translations.push({
          lang,
          translation: resource.value,
        });
      })
  );
  return Array.from(rows.values());
};

export const validateTextId = (textIdToValidate: string): string => {
  const isIllegalId = (textIdToCheck: string) => Boolean(textIdToCheck.toLowerCase().match(' ')); // TODO: create matcher
  if (!textIdToValidate) {
    return 'TextId kan ikke være tom';
  }

  if (isIllegalId(textIdToValidate)) {
    return 'Det er ikke tillat med mellomrom i en textId';
  }

  return '';
};
