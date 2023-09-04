import type {
  SupportedLanguageKey,
  ResourceTypeOption,
  ResourceKeyword,
} from 'app-shared/types/ResourceAdm';
import { SupportedLanguage } from 'resourceadm/types/global';

/**
 * The map of resource type
 */
export const resourceTypeMap: Record<ResourceTypeOption, string> = {
  Default: 'resourceadm.about_resource_resource_type_default',
  Systemresource: 'resourceadm.about_resource_resource_type_system_resource',
  MaskinportenSchema: 'resourceadm.about_resource_resource_type_maskinporten',
};

/**
 * Returns true if the text is either null, undefined, or at least one of the
 * laguage fields are empty.
 *
 * @param text the text to check
 *
 * @returns boolean for if it has error or not
 */
export const getResourcePageTextfieldError = (text: SupportedLanguageKey<string>): boolean =>
  text === undefined || text === null || text.nb === '' || text.nn === '' || text.en === '';

/**
 * Converts the resource type key to the correct displayable string
 *
 * @param resourceType the resourcetype to convert
 *
 * @returns the string to display
 */
export const convertResourceTypeToDisplayString = (resourceType: ResourceTypeOption): string => {
  return resourceTypeMap[resourceType];
};

/**
 * Maps the language key to the text
 */
export const mapLanguageKeyToLanguageText = (
  val: 'nb' | 'nn' | 'en',
  translationFunction: (key: string, params?: object) => string
) => {
  if (val === 'nb') return translationFunction('language.nb');
  if (val === 'nn') return translationFunction('language.nn');
  return translationFunction('language.en');
};

/**
 * Gets the correct text to display for input fields with missing value
 *
 * @param language the value
 * @param usageString the type of the field
 * @param translationFunction the translation function
 */
export const getMissingInputLanguageString = (
  language: SupportedLanguage,
  usageString: string,
  translationFunction: (key: string, params?: object) => string
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
    return translationFunction('resourceadm.about_resource_langauge_error_missing_1', {
      usageString,
      lang: mapLanguageKeyToLanguageText(valArr[0], translationFunction),
    });
  }
  if (valArr.length === 2) {
    return translationFunction('resourceadm.about_resource_langauge_error_missing_2', {
      usageString,
      lang1: mapLanguageKeyToLanguageText(valArr[0], translationFunction),
      lang2: mapLanguageKeyToLanguageText(valArr[1], translationFunction),
    });
  }
  if (valArr.length === 3) {
    return translationFunction('resourceadm.about_resource_langauge_error_missing_3', {
      usageString,
      lang1: mapLanguageKeyToLanguageText(valArr[0], translationFunction),
      lang2: mapLanguageKeyToLanguageText(valArr[1], translationFunction),
      lang3: mapLanguageKeyToLanguageText(valArr[2], translationFunction),
    });
  }
  return '';
};

/**
 * ------------ Temporary functions -------------
 * The first one maps keyword to string, and the second from string to keyword
 *
 * TODO - Find out how to handle it in the future
 */
export const mapKeywordsArrayToString = (resourceKeywords: ResourceKeyword[]): string => {
  return resourceKeywords.map((k) => k.word).join(', ');
};
export const mapKeywordStringToKeywordTypeArray = (keywrodString: string): ResourceKeyword[] => {
  return keywrodString.split(', ').map((val) => ({ language: 'nb', word: val.trim() }));
};
