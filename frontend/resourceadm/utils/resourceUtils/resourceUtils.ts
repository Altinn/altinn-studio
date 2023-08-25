import type { SupportedLanguageKey, ResourceTypeOption } from "app-shared/types/ResourceAdm";
import { SupportedLanguage } from "resourceadm/types/global";
// TODO - Trranslation

/**
 * Returns true if the text is either null, undefined, or at least one of the
 * laguage fields are empty.
 *
 * @param text the text to check
 *
 * @returns boolean for if it has error or not
 */
export const getResourcePageTextfieldError = (text: SupportedLanguageKey<string>): boolean =>
  text === undefined ||
  text === null ||
  text.nb === '' ||
  text.nn === '' ||
  text.en === '';

/**
 * Converts the resource type key to the correct displayable string
 *
 * @param resourceType the resourcetype to convert
 *
 * @returns the string to display
 */
export const convertResourceTypeToDisplayString = (resourceType: ResourceTypeOption) => {
  if (resourceType === 'Default') return 'Standard';
  else if (resourceType === 'Systemresource') return 'System ressurs';
  else if (resourceType === 'MaskinportenSchema') return 'Maskinporten skjema';
  return undefined;
};

/**
 * Maps the language key to the text
 */
export const mapLanguageKeyToLanguageText = (val: 'nb' | 'nn' | 'en') => {
  if (val === 'nb') return 'Bokmål';
  if (val === 'nn') return 'Nynorsk';
  return 'Engelsk';
};

/**
 * Gets the correct text to display for input fields with missing value
 *
 * @param language the value
 * @param usageString the type of the field
 */
export const getMissingInputLanguageString = (
  language: SupportedLanguage,
  usageString: string
): string => {
  const valArr: ('nb' | 'nn' | 'en')[] = [];

  // Add the different languages
  if (language.nb === '') {
    valArr.push('nb');
  }
  if (language.nn === '') {
    valArr.push('nn');
  }
  if (language.en === '') {
    valArr.push('en');
  }

  // Return different messages based on the length
  if (valArr.length === 1) {
    return `Du mangler oversettelse for ${usageString} på ${mapLanguageKeyToLanguageText(valArr[0])}.`;
  }
  if (valArr.length === 2) {
    return `Du mangler oversettelse for ${usageString} på ${mapLanguageKeyToLanguageText(valArr[0])} og ${mapLanguageKeyToLanguageText(valArr[1])}.`;
  }
  if (valArr.length === 3) {
    return `Du mangler oversettelse for ${usageString} på ${mapLanguageKeyToLanguageText(valArr[0])}, ${mapLanguageKeyToLanguageText(valArr[1])} og ${mapLanguageKeyToLanguageText(valArr[2])}.`;
  }
  return '';
};
